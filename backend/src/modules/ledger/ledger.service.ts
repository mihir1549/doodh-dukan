import {
    Injectable,
    BadRequestException,
    NotFoundException,
    ConflictException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { Cron, CronExpression } from '@nestjs/schedule';
import {
    LedgerEntry,
    LedgerEntryType,
    LedgerDirection,
    LedgerStatus,
} from './ledger.entity';
import { CustomerBalance } from './customer-balance.entity';
import { Customer } from '../customers/customer.entity';
import { SetOpeningBalanceDto } from './dto/set-opening-balance.dto';
import { RecordPaymentDto } from './dto/record-payment.dto';
import { LedgerFilterDto } from './dto/ledger-filter.dto';

@Injectable()
export class LedgerService {
    constructor(
        @InjectRepository(LedgerEntry)
        private ledgerRepo: Repository<LedgerEntry>,
        @InjectRepository(CustomerBalance)
        private balanceRepo: Repository<CustomerBalance>,
        @InjectRepository(Customer)
        private customerRepo: Repository<Customer>,
        private dataSource: DataSource,
    ) { }

    async setOpeningBalance(dto: SetOpeningBalanceDto, adminId: string, tenantId: string): Promise<LedgerEntry> {
        if (dto.amount === 0) {
            throw new BadRequestException('Amount 0 means no entry needed. Skip the call instead.');
        }

        const existing = await this.ledgerRepo.findOne({
            where: {
                customer_id: dto.customer_id,
                tenant_id: tenantId,
                entry_type: LedgerEntryType.OPENING_BALANCE,
            },
        });

        const qr = this.dataSource.createQueryRunner();
        await qr.connect();
        await qr.startTransaction();

        try {
            let entry: LedgerEntry;

            if (existing) {
                // Allow correction before go-live: reverse old effect then apply new
                const oldEffect = existing.direction === LedgerDirection.DEBIT
                    ? -Number(existing.amount)
                    : Number(existing.amount);

                existing.direction = dto.direction;
                existing.amount = dto.amount;
                existing.transaction_date = dto.as_of_date;
                existing.note = dto.note ?? existing.note;
                existing.recorded_by = adminId;
                entry = await qr.manager.save(LedgerEntry, existing);

                const newEffect = dto.direction === LedgerDirection.DEBIT
                    ? Number(dto.amount)
                    : -Number(dto.amount);

                const delta = oldEffect + newEffect; // old effect was reversed, new applied
                await this.adjustBalance(qr, dto.customer_id, tenantId, delta);
            } else {
                entry = qr.manager.create(LedgerEntry, {
                    tenant_id: tenantId,
                    customer_id: dto.customer_id,
                    entry_type: LedgerEntryType.OPENING_BALANCE,
                    direction: dto.direction,
                    amount: dto.amount,
                    transaction_date: dto.as_of_date,
                    note: dto.note ?? null,
                    status: LedgerStatus.APPROVED,
                    recorded_by: adminId,
                });
                entry = await qr.manager.save(LedgerEntry, entry);

                const balanceDelta = dto.direction === LedgerDirection.DEBIT
                    ? Number(dto.amount)
                    : -Number(dto.amount);
                await this.adjustBalance(qr, dto.customer_id, tenantId, balanceDelta);
            }

            await qr.commitTransaction();
            return entry;
        } catch (err) {
            await qr.rollbackTransaction();
            throw err;
        } finally {
            await qr.release();
        }
    }

    async postMonthlyBill(
        customerId: string,
        monthYear: string,
        billAmount: number,
        tenantId: string,
        lockedByUserId: string,
    ): Promise<void> {
        if (billAmount <= 0) return;

        const existingBill = await this.ledgerRepo.findOne({
            where: {
                customer_id: customerId,
                tenant_id: tenantId,
                entry_type: LedgerEntryType.BILL_POSTED,
                reference_month: monthYear,
            },
        });
        if (existingBill) return; // idempotent — already posted

        const balanceRow = await this.ensureBalanceRow(customerId, tenantId);
        const currentBalance = Number(balanceRow.current_balance);

        const qr = this.dataSource.createQueryRunner();
        await qr.connect();
        await qr.startTransaction();

        try {
            const transactionDate = `${monthYear}-01`;
            let remainingBill = billAmount;

            if (currentBalance < 0) {
                // Customer has advance — use it up first
                const advance = Math.abs(currentBalance);
                const advanceUsed = Math.min(advance, billAmount);

                const adjEntry = qr.manager.create(LedgerEntry, {
                    tenant_id: tenantId,
                    customer_id: customerId,
                    entry_type: LedgerEntryType.ADVANCE_ADJUSTED,
                    direction: LedgerDirection.CREDIT,
                    amount: advanceUsed,
                    reference_month: monthYear,
                    transaction_date: transactionDate,
                    status: LedgerStatus.APPROVED,
                    recorded_by: lockedByUserId,
                });
                await qr.manager.save(LedgerEntry, adjEntry);
                // CREDIT reduces the "owed" but here balance is negative (advance)
                // Advance adjusted: the advance shrinks → balance moves towards 0 (increases)
                await this.adjustBalance(qr, customerId, tenantId, advanceUsed);

                remainingBill = billAmount - advanceUsed;
            }

            if (remainingBill > 0) {
                const billEntry = qr.manager.create(LedgerEntry, {
                    tenant_id: tenantId,
                    customer_id: customerId,
                    entry_type: LedgerEntryType.BILL_POSTED,
                    direction: LedgerDirection.DEBIT,
                    amount: remainingBill,
                    reference_month: monthYear,
                    transaction_date: transactionDate,
                    status: LedgerStatus.APPROVED,
                    recorded_by: lockedByUserId,
                });
                await qr.manager.save(LedgerEntry, billEntry);
                await this.adjustBalance(qr, customerId, tenantId, remainingBill);
            }

            await qr.commitTransaction();
        } catch (err) {
            await qr.rollbackTransaction();
            throw err;
        } finally {
            await qr.release();
        }
    }

    async recordPayment(dto: RecordPaymentDto, recordedBy: string, tenantId: string): Promise<LedgerEntry> {
        const customer = await this.customerRepo.findOne({
            where: { id: dto.customer_id, tenant_id: tenantId, is_active: true },
        });
        if (!customer) throw new NotFoundException('Customer not found');

        const entry = this.ledgerRepo.create({
            tenant_id: tenantId,
            customer_id: dto.customer_id,
            entry_type: LedgerEntryType.PAYMENT,
            direction: LedgerDirection.CREDIT,
            amount: dto.amount,
            payment_mode: dto.payment_mode,
            transaction_date: dto.transaction_date,
            note: dto.note ?? null,
            status: LedgerStatus.PENDING,
            recorded_by: recordedBy,
        });

        return this.ledgerRepo.save(entry);
    }

    async approvePayment(ledgerEntryId: string, approvedBy: string, tenantId: string): Promise<LedgerEntry> {
        const entry = await this.ledgerRepo.findOne({
            where: { id: ledgerEntryId, tenant_id: tenantId, entry_type: LedgerEntryType.PAYMENT },
        });
        if (!entry) throw new NotFoundException('Payment entry not found');
        if (entry.status !== LedgerStatus.PENDING) {
            throw new BadRequestException(`Payment is already ${entry.status.toLowerCase()}`);
        }

        const qr = this.dataSource.createQueryRunner();
        await qr.connect();
        await qr.startTransaction();

        try {
            entry.status = LedgerStatus.APPROVED;
            entry.approved_by = approvedBy;
            entry.approved_at = new Date();
            await qr.manager.save(LedgerEntry, entry);

            // CREDIT → balance decreases (customer pays off debt or builds advance)
            await this.adjustBalance(qr, entry.customer_id, tenantId, -Number(entry.amount));

            await qr.commitTransaction();
            return entry;
        } catch (err) {
            await qr.rollbackTransaction();
            throw err;
        } finally {
            await qr.release();
        }
    }

    async rejectPayment(
        ledgerEntryId: string,
        approvedBy: string,
        tenantId: string,
        reason: string,
    ): Promise<LedgerEntry> {
        const entry = await this.ledgerRepo.findOne({
            where: { id: ledgerEntryId, tenant_id: tenantId, entry_type: LedgerEntryType.PAYMENT },
        });
        if (!entry) throw new NotFoundException('Payment entry not found');
        if (entry.status !== LedgerStatus.PENDING) {
            throw new BadRequestException(`Payment is already ${entry.status.toLowerCase()}`);
        }

        entry.status = LedgerStatus.REJECTED;
        entry.approved_by = approvedBy;
        entry.approved_at = new Date();
        entry.note = reason ? `REJECTED: ${reason}` : 'REJECTED';
        return this.ledgerRepo.save(entry);
    }

    async getCustomerLedger(customerId: string, tenantId: string, filters: LedgerFilterDto) {
        const page = filters.page ?? 1;
        const limit = filters.limit ?? 20;

        const qb = this.ledgerRepo
            .createQueryBuilder('e')
            .where('e.customer_id = :customerId', { customerId })
            .andWhere('e.tenant_id = :tenantId', { tenantId })
            .orderBy('e.transaction_date', 'ASC')
            .addOrderBy('e.created_at', 'ASC');

        if (filters.from_date) qb.andWhere('e.transaction_date >= :from', { from: filters.from_date });
        if (filters.to_date) qb.andWhere('e.transaction_date <= :to', { to: filters.to_date });
        if (filters.entry_type) qb.andWhere('e.entry_type = :type', { type: filters.entry_type });
        if (filters.status) qb.andWhere('e.status = :status', { status: filters.status });

        const total = await qb.getCount();
        const entries = await qb.skip((page - 1) * limit).take(limit).getMany();

        return {
            data: entries.map(this.formatEntry),
            meta: {
                total,
                page,
                limit,
                totalPages: Math.ceil(total / limit),
            },
        };
    }

    async getCustomerBalance(customerId: string, tenantId: string) {
        const row = await this.ensureBalanceRow(customerId, tenantId);
        return {
            customer_id: customerId,
            current_balance: Number(row.current_balance),
            last_updated: row.last_updated,
        };
    }

    async recalculateBalance(customerId: string, tenantId: string): Promise<void> {
        const entries = await this.ledgerRepo.find({
            where: { customer_id: customerId, tenant_id: tenantId },
            order: { transaction_date: 'ASC', created_at: 'ASC' },
        });

        let balance = 0;
        for (const e of entries) {
            if (e.status === LedgerStatus.REJECTED) continue;
            if (e.status === LedgerStatus.PENDING) continue;
            if (e.direction === LedgerDirection.DEBIT) {
                balance += Number(e.amount);
            } else {
                balance -= Number(e.amount);
            }
        }

        const row = await this.ensureBalanceRow(customerId, tenantId);
        row.current_balance = balance;
        await this.balanceRepo.save(row);
    }

    async getPendingPayments(tenantId: string) {
        return this.ledgerRepo.find({
            where: { tenant_id: tenantId, status: LedgerStatus.PENDING, entry_type: LedgerEntryType.PAYMENT },
            relations: ['customer', 'recorded_by_user'],
            order: { created_at: 'DESC' },
        });
    }

    async getPendingPaymentsCount(tenantId: string): Promise<number> {
        return this.ledgerRepo.count({
            where: { tenant_id: tenantId, status: LedgerStatus.PENDING, entry_type: LedgerEntryType.PAYMENT },
        });
    }

    async hasOpeningBalance(customerId: string, tenantId: string): Promise<boolean> {
        const count = await this.ledgerRepo.count({
            where: { customer_id: customerId, tenant_id: tenantId, entry_type: LedgerEntryType.OPENING_BALANCE },
        });
        return count > 0;
    }

    @Cron('1 0 1 * *', {
        name: 'monthEndCarryForward',
        timeZone: 'Asia/Kolkata',
    })
    async runMonthEndCarryForward(): Promise<void> {
        const now = new Date();
        // Reference month is the month that just ended
        const prevMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        const monthYear = `${prevMonth.getFullYear()}-${String(prevMonth.getMonth() + 1).padStart(2, '0')}`;

        const balances = await this.balanceRepo.find();

        for (const bal of balances) {
            if (Number(bal.current_balance) <= 0) continue;

            const existingCF = await this.ledgerRepo.findOne({
                where: {
                    customer_id: bal.customer_id,
                    tenant_id: bal.tenant_id,
                    entry_type: LedgerEntryType.CARRY_FORWARD,
                    reference_month: monthYear,
                },
            });
            if (existingCF) continue;

            await this.ledgerRepo.save(
                this.ledgerRepo.create({
                    tenant_id: bal.tenant_id,
                    customer_id: bal.customer_id,
                    entry_type: LedgerEntryType.CARRY_FORWARD,
                    direction: LedgerDirection.DEBIT,
                    amount: Number(bal.current_balance),
                    reference_month: monthYear,
                    transaction_date: `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`,
                    status: LedgerStatus.APPROVED,
                    recorded_by: '00000000-0000-0000-0000-000000000000',
                }),
            );
            // Carry forward is informational — balance already reflects the amount owed
        }
    }

    // ── Private Helpers ──────────────────────────────────────────────────────

    private async adjustBalance(qr: any, customerId: string, tenantId: string, delta: number) {
        const row = await qr.manager.findOne(CustomerBalance, {
            where: { customer_id: customerId },
        });

        if (row) {
            row.current_balance = Number(row.current_balance) + delta;
            await qr.manager.save(CustomerBalance, row);
        } else {
            const newRow = qr.manager.create(CustomerBalance, {
                tenant_id: tenantId,
                customer_id: customerId,
                current_balance: delta,
            });
            await qr.manager.save(CustomerBalance, newRow);
        }
    }

    private async ensureBalanceRow(customerId: string, tenantId: string): Promise<CustomerBalance> {
        let row = await this.balanceRepo.findOne({ where: { customer_id: customerId } });
        if (!row) {
            row = this.balanceRepo.create({ tenant_id: tenantId, customer_id: customerId, current_balance: 0 });
            row = await this.balanceRepo.save(row);
        }
        return row;
    }

    private formatEntry(e: LedgerEntry) {
        return {
            id: e.id,
            entry_type: e.entry_type,
            direction: e.direction,
            amount: Number(e.amount),
            payment_mode: e.payment_mode,
            reference_month: e.reference_month,
            transaction_date: e.transaction_date,
            note: e.note,
            status: e.status,
            recorded_by: e.recorded_by,
            approved_by: e.approved_by,
            approved_at: e.approved_at,
            created_at: e.created_at,
        };
    }
}
