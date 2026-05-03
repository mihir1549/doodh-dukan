import {
    Injectable,
    NotFoundException,
    ForbiddenException,
    ConflictException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { MonthlySummary } from './monthly-summary.entity';
import { DailyEntry } from '../entries/daily-entry.entity';
import { Customer } from '../customers/customer.entity';
import { Product } from '../products/product.entity';
import {
    LedgerEntry,
    LedgerEntryType,
    LedgerDirection,
    LedgerStatus,
} from '../ledger/ledger.entity';
import { CustomerBalance } from '../ledger/customer-balance.entity';
import { LedgerService } from '../ledger/ledger.service';

@Injectable()
export class SummariesService {
    constructor(
        @InjectRepository(MonthlySummary)
        private summaryRepo: Repository<MonthlySummary>,
        @InjectRepository(DailyEntry)
        private entryRepo: Repository<DailyEntry>,
        @InjectRepository(Customer)
        private customerRepo: Repository<Customer>,
        @InjectRepository(Product)
        private productRepo: Repository<Product>,
        @InjectRepository(LedgerEntry)
        private ledgerEntryRepo: Repository<LedgerEntry>,
        @InjectRepository(CustomerBalance)
        private balanceRepo: Repository<CustomerBalance>,
        private dataSource: DataSource,
        private ledgerService: LedgerService,
    ) { }

    async findByMonth(tenantId: string, monthYear: string, customerId?: string) {
        const where: any = { tenant_id: tenantId, month_year: monthYear };
        if (customerId) where.customer_id = customerId;

        const summaries = await this.summaryRepo.find({
            where,
            relations: ['customer'],
            order: { total_amount: 'DESC' },
        });

        // Collect all product IDs from all summaries to resolve names
        const allProductIds = new Set<string>();
        summaries.forEach((s) => {
            if (s.total_quantity_by_product) {
                Object.keys(s.total_quantity_by_product).forEach((id) => allProductIds.add(id));
            }
        });

        // Fetch product names
        const productMap: Record<string, { name: string; unit: string }> = {};
        if (allProductIds.size > 0) {
            const products = await this.productRepo.find({
                where: [...allProductIds].map((id) => ({ id })),
                select: ['id', 'name', 'unit'],
            });
            products.forEach((p) => {
                productMap[p.id] = { name: p.name, unit: p.unit };
            });
        }

        return summaries.map((s) => {
            // Build product breakdown with names
            const product_breakdown: { name: string; qty: number; unit: string }[] = [];
            if (s.total_quantity_by_product) {
                Object.entries(s.total_quantity_by_product).forEach(([productId, qty]) => {
                    const prod = productMap[productId];
                    product_breakdown.push({
                        name: prod?.name || 'Unknown',
                        qty: Number(qty),
                        unit: prod?.unit || '',
                    });
                });
            }

            return {
                id: s.id,
                customer_id: s.customer_id,
                customer_name: s.customer?.name,
                customer_number: s.customer?.customer_number,
                month_year: s.month_year,
                total_amount: Number(s.total_amount),
                entry_count: s.entry_count,
                total_quantity_by_product: s.total_quantity_by_product,
                product_breakdown,
                is_locked: s.is_locked,
                locked_at: s.locked_at,
                last_calculated_at: s.last_calculated_at,
            };
        });
    }

    async lock(tenantId: string, summaryId: string, userId: string) {
        // ── Phase 1: recalc-from-source + safety check, in one transaction ──
        const qr = this.dataSource.createQueryRunner();
        await qr.connect();
        await qr.startTransaction();

        let summary: MonthlySummary;
        let freshTotal: number;

        try {
            const found = await qr.manager.findOne(MonthlySummary, {
                where: { id: summaryId, tenant_id: tenantId },
            });
            if (!found) throw new NotFoundException('Summary not found');
            summary = found;

            // 5a — Recalculate total_amount from active daily_entries.
            // Trust the source, never the cached field.
            const sumRow = await qr.manager
                .createQueryBuilder(DailyEntry, 'e')
                .select('SUM(e.line_total)', 'total')
                .addSelect('COUNT(*)', 'count')
                .where('e.tenant_id = :tenantId', { tenantId })
                .andWhere('e.customer_id = :customerId', { customerId: summary.customer_id })
                .andWhere('e.month_year = :monthYear', { monthYear: summary.month_year })
                .andWhere('e.is_deleted = false')
                .getRawOne();
            freshTotal = Number(sumRow?.total) || 0;
            const freshCount = Number(sumRow?.count) || 0;

            summary.total_amount = freshTotal;
            summary.entry_count = freshCount;
            summary.last_calculated_at = new Date();
            await qr.manager.save(MonthlySummary, summary);

            // 5b — Block lock if a previous BILL_POSTED was never reversed.
            // Should never happen in normal flow; protects against silent
            // double-billing if somebody lock-then-locks via SQL or a race.
            const latestBill = await qr.manager.findOne(LedgerEntry, {
                where: {
                    tenant_id: tenantId,
                    customer_id: summary.customer_id,
                    reference_month: summary.month_year,
                    entry_type: LedgerEntryType.BILL_POSTED,
                    status: LedgerStatus.APPROVED,
                },
                order: { created_at: 'DESC' },
            });
            if (latestBill) {
                const latestReversal = await qr.manager.findOne(LedgerEntry, {
                    where: {
                        tenant_id: tenantId,
                        customer_id: summary.customer_id,
                        reference_month: summary.month_year,
                        entry_type: LedgerEntryType.BILL_REVERSED,
                    },
                    order: { created_at: 'DESC' },
                });
                const stillUnreversed =
                    !latestReversal ||
                    new Date(latestReversal.created_at).getTime() <=
                        new Date(latestBill.created_at).getTime();
                if (stillUnreversed) {
                    throw new ConflictException({
                        success: false,
                        statusCode: 409,
                        code: 'UNREVERSED_BILL_EXISTS',
                        message:
                            'Cannot lock: an existing bill for this month has not been reversed. Contact support.',
                        month_year: summary.month_year,
                    });
                }
            }

            await qr.commitTransaction();
        } catch (err) {
            await qr.rollbackTransaction();
            throw err;
        } finally {
            await qr.release();
        }

        // ── Phase 2: post the bill (its own transaction inside ledger service)
        await this.ledgerService.postMonthlyBill(
            summary.customer_id,
            summary.month_year,
            freshTotal,
            tenantId,
            userId,
        );

        // ── Phase 3: flip is_locked only after a successful post.
        // If postMonthlyBill threw, summary stays unlocked — no orphan state.
        summary.is_locked = true;
        summary.locked_at = new Date();
        summary.locked_by = userId;
        await this.summaryRepo.save(summary);

        // ── Phase 4: read back the entries postMonthlyBill just created so
        // we can return an enriched response (bill_entry_id, advance_adjusted).
        const billEntry = await this.ledgerEntryRepo.findOne({
            where: {
                tenant_id: tenantId,
                customer_id: summary.customer_id,
                reference_month: summary.month_year,
                entry_type: LedgerEntryType.BILL_POSTED,
                status: LedgerStatus.APPROVED,
            },
            order: { created_at: 'DESC' },
        });
        const advanceEntry = await this.ledgerEntryRepo.findOne({
            where: {
                tenant_id: tenantId,
                customer_id: summary.customer_id,
                reference_month: summary.month_year,
                entry_type: LedgerEntryType.ADVANCE_ADJUSTED,
                status: LedgerStatus.APPROVED,
            },
            order: { created_at: 'DESC' },
        });
        const balRow = await this.balanceRepo.findOne({
            where: { customer_id: summary.customer_id },
        });

        return {
            summary_id: summary.id,
            is_locked: true,
            bill_amount: freshTotal,
            bill_entry_id: billEntry?.id ?? null,
            advance_adjusted: advanceEntry ? Number(advanceEntry.amount) : 0,
            balance_after: Number(balRow?.current_balance ?? 0),
        };
    }

    async unlock(tenantId: string, summaryId: string, userId: string) {
        const qr = this.dataSource.createQueryRunner();
        await qr.connect();
        await qr.startTransaction();

        try {
            const summary = await qr.manager.findOne(MonthlySummary, {
                where: { id: summaryId, tenant_id: tenantId },
            });
            if (!summary) throw new NotFoundException('Summary not found');

            // Step 1 — loud-fail if not locked. This also covers the
            // "unlock pressed twice" race: the second call sees is_locked=false
            // and returns this code so the frontend can soft-toast it.
            if (!summary.is_locked) {
                throw new ConflictException({
                    success: false,
                    statusCode: 409,
                    code: 'SUMMARY_ALREADY_UNLOCKED',
                    message: 'This month is already unlocked.',
                    summary_id: summary.id,
                });
            }

            const monthYear = summary.month_year;
            const customerId = summary.customer_id;

            // Step 2 — find the most recent APPROVED BILL_POSTED for the month
            const billPosted = await qr.manager.findOne(LedgerEntry, {
                where: {
                    tenant_id: tenantId,
                    customer_id: customerId,
                    reference_month: monthYear,
                    entry_type: LedgerEntryType.BILL_POSTED,
                    status: LedgerStatus.APPROVED,
                },
                order: { created_at: 'DESC' },
            });

            // Step 3 — find sibling ADVANCE_ADJUSTED from the same lock event
            // (used both to build a human-readable note and to confirm the
            // reversal amount equals the original bill total).
            const advanceAdj = await qr.manager.findOne(LedgerEntry, {
                where: {
                    tenant_id: tenantId,
                    customer_id: customerId,
                    reference_month: monthYear,
                    entry_type: LedgerEntryType.ADVANCE_ADJUSTED,
                    status: LedgerStatus.APPROVED,
                },
                order: { created_at: 'DESC' },
            });

            let reversalEntryId: string | null = null;

            if (billPosted) {
                // Use summary.total_amount as the reversal amount, NOT
                // billPosted.amount. They differ when ADVANCE_ADJUSTED was
                // used at lock time (advance ate part of the bill). The full
                // original total is what restores the pre-lock balance.
                const totalReversed = Number(summary.total_amount);
                const billPart = Number(billPosted.amount);
                const advancePart = advanceAdj ? Number(advanceAdj.amount) : 0;

                const formatted = (n: number) => `₹${n.toFixed(2)}`;
                const note = advancePart > 0
                    ? `Bill ${formatted(totalReversed)} reversed — month reopened (${formatted(advancePart)} advance + ${formatted(billPart)} debit cancelled)`
                    : `Bill ${formatted(totalReversed)} reversed — month reopened for correction`;

                const reversal = qr.manager.create(LedgerEntry, {
                    tenant_id: tenantId,
                    customer_id: customerId,
                    entry_type: LedgerEntryType.BILL_REVERSED,
                    direction: LedgerDirection.CREDIT,
                    amount: totalReversed,
                    payment_mode: null,
                    reference_month: monthYear,
                    transaction_date: new Date().toISOString().split('T')[0],
                    note,
                    status: LedgerStatus.APPROVED,
                    recorded_by: userId,
                    approved_by: userId,
                    approved_at: new Date(),
                });
                const savedReversal = await qr.manager.save(LedgerEntry, reversal);
                reversalEntryId = savedReversal.id;

                // Restore pre-lock balance: subtract the entire original bill.
                // adjustBalance is a private helper on LedgerService — we
                // inline the equivalent here to keep this method's transaction
                // self-contained (no cross-service QR sharing).
                const balRow = await qr.manager.findOne(CustomerBalance, {
                    where: { customer_id: customerId },
                });
                if (balRow) {
                    balRow.current_balance =
                        Number(balRow.current_balance) - totalReversed;
                    await qr.manager.save(CustomerBalance, balRow);
                } else {
                    const newRow = qr.manager.create(CustomerBalance, {
                        tenant_id: tenantId,
                        customer_id: customerId,
                        current_balance: -totalReversed,
                    });
                    await qr.manager.save(CustomerBalance, newRow);
                }
            } else {
                // Data inconsistency: locked summary with no BILL_POSTED.
                // Pre-existing bug (e.g. lock predated the ledger feature).
                // Don't fail — the operator clearly wants the summary unlocked.
                // Skip the reversal entry but proceed to flip the flag.
                // eslint-disable-next-line no-console
                console.warn(
                    '[summaries] unlock found no BILL_POSTED to reverse',
                    JSON.stringify({
                        tenant_id: tenantId,
                        summary_id: summaryId,
                        customer_id: customerId,
                        month_year: monthYear,
                    }),
                );
            }

            // Step 6 — flip is_locked
            summary.is_locked = false;
            summary.locked_at = null;
            summary.locked_by = null;
            await qr.manager.save(MonthlySummary, summary);

            // Read final balance for the response
            const finalBalRow = await qr.manager.findOne(CustomerBalance, {
                where: { customer_id: customerId },
            });

            await qr.commitTransaction();

            return {
                summary_id: summaryId,
                is_locked: false,
                reversal_entry_id: reversalEntryId,
                balance_after: Number(finalBalRow?.current_balance ?? 0),
                already_unlocked: false,
            };
        } catch (err) {
            await qr.rollbackTransaction();
            throw err;
        } finally {
            await qr.release();
        }
    }

    async recalculateMonth(tenantId: string, monthYear: string) {
        const customers = await this.customerRepo.find({
            where: { tenant_id: tenantId, is_active: true },
        });

        const BATCH_SIZE = 10;
        for (let i = 0; i < customers.length; i += BATCH_SIZE) {
            const batch = customers.slice(i, i + BATCH_SIZE);
            await Promise.all(
                batch.map((c) => this.recalculateSingle(tenantId, c.id, monthYear)),
            );
        }

        return { message: `Recalculated summaries for ${monthYear}` };
    }

    /**
     * Recalculate a single customer's monthly summary
     * Used by entries service (via transaction) and scheduler
     */
    async recalculateSingle(
        tenantId: string,
        customerId: string,
        monthYear: string,
    ) {
        // Query active entries
        const result = await this.entryRepo
            .createQueryBuilder('e')
            .select('SUM(e.line_total)', 'total')
            .addSelect('COUNT(*)', 'count')
            .where('e.tenant_id = :tenantId', { tenantId })
            .andWhere('e.customer_id = :customerId', { customerId })
            .andWhere('e.month_year = :monthYear', { monthYear })
            .andWhere('e.is_deleted = false')
            .getRawOne();

        const totalAmount = Number(result.total) || 0;
        const entryCount = Number(result.count) || 0;

        // Quantity by product
        const productBreakdown = await this.entryRepo
            .createQueryBuilder('e')
            .select('e.product_id', 'product_id')
            .addSelect('SUM(e.quantity)', 'total_qty')
            .where('e.tenant_id = :tenantId', { tenantId })
            .andWhere('e.customer_id = :customerId', { customerId })
            .andWhere('e.month_year = :monthYear', { monthYear })
            .andWhere('e.is_deleted = false')
            .groupBy('e.product_id')
            .getRawMany();

        const quantityByProduct: Record<string, number> = {};
        for (const row of productBreakdown) {
            quantityByProduct[row.product_id] = Number(row.total_qty);
        }

        // UPSERT
        const existing = await this.summaryRepo.findOne({
            where: { tenant_id: tenantId, customer_id: customerId, month_year: monthYear },
        });

        if (existing) {
            existing.total_amount = totalAmount;
            existing.entry_count = entryCount;
            existing.total_quantity_by_product = quantityByProduct;
            existing.last_calculated_at = new Date();
            return this.summaryRepo.save(existing);
        } else {
            const newSummary = this.summaryRepo.create({
                tenant_id: tenantId,
                customer_id: customerId,
                month_year: monthYear,
                total_amount: totalAmount,
                entry_count: entryCount,
                total_quantity_by_product: quantityByProduct,
                last_calculated_at: new Date(),
            });
            return this.summaryRepo.save(newSummary);
        }
    }
}
