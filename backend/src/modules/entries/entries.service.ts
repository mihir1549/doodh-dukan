import {
    Injectable,
    NotFoundException,
    ForbiddenException,
    ConflictException,
    BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { DailyEntry, SourceChannel, EntrySlot } from './daily-entry.entity';
import { MonthlySummary } from '../summaries/monthly-summary.entity';
import { ProductsService } from '../products/products.service';
import { CreateEntryDto, UpdateEntryDto } from './dto/entry.dto';
import { UserRole } from '../users/user.entity';
import {
    getMonthYearFromDate,
    getTodayDateString,
    formatMonthYearLabel,
} from '../../common/utils/helpers';

@Injectable()
export class EntriesService {
    constructor(
        @InjectRepository(DailyEntry)
        private entryRepo: Repository<DailyEntry>,
        @InjectRepository(MonthlySummary)
        private summaryRepo: Repository<MonthlySummary>,
        private productsService: ProductsService,
        private dataSource: DataSource,
    ) { }

    private getChannelFromRole(role: string): SourceChannel {
        switch (role) {
            case UserRole.DELIVERY:
                return SourceChannel.DELIVERY;
            case UserRole.SHOP_STAFF:
                return SourceChannel.SHOP;
            case UserRole.OWNER:
                return SourceChannel.SHOP;
            default:
                return SourceChannel.SHOP;
        }
    }

    private getEffectiveEntryDate(entryDate?: string): string {
        const normalizedDate = entryDate || getTodayDateString();
        if (normalizedDate > getTodayDateString()) {
            throw new BadRequestException('Entry date cannot be in the future');
        }

        return normalizedDate;
    }

    private canUpdateExistingEntry(
        entry: DailyEntry,
        userId: string,
        userRole: string,
        source: SourceChannel,
    ): boolean {
        if (entry.source !== source) {
            return false;
        }

        if (userRole === UserRole.DELIVERY) {
            return entry.created_by_user_id === userId;
        }

        return true;
    }

    private serializeEntry(entry: DailyEntry) {
        return {
            id: entry.id,
            customer_id: entry.customer_id,
            product_id: entry.product_id,
            quantity: Number(entry.quantity),
            unit_price: Number(entry.unit_price),
            source: entry.source,
            entry_date: entry.entry_date,
            created_at: entry.created_at,
            created_by_user_id: entry.created_by_user_id,
            entry_slot: entry.entry_slot,
            line_total: Number(entry.line_total || 0),
            month_year: entry.month_year,
        };
    }

    private toResponseEntry(entry: DailyEntry) {
        return {
            ...entry,
            quantity: Number(entry.quantity),
            unit_price: Number(entry.unit_price),
            line_total: Number(entry.line_total || 0),
            source: entry.source,
            source_channel: entry.source,
            created_by_user_id: entry.created_by_user_id,
            created_by_user: entry.created_by_user,
            entered_by_user: entry.created_by_user,
        };
    }

    private async findDuplicateEntry(
        tenantId: string,
        customerId: string,
        productId: string,
        entryDate: string,
        source: SourceChannel,
    ) {
        return this.entryRepo.findOne({
            where: {
                tenant_id: tenantId,
                customer_id: customerId,
                product_id: productId,
                entry_date: entryDate,
                source,
                is_deleted: false,
            },
        });
    }

    async create(
        tenantId: string,
        userId: string,
        userRole: string,
        dto: CreateEntryDto,
    ) {
        const entryDate = this.getEffectiveEntryDate(dto.entry_date);
        const monthYear = getMonthYearFromDate(entryDate);
        const source = this.getChannelFromRole(userRole);

        // Rule 5: Check if month is locked
        const existingSummary = await this.summaryRepo.findOne({
            where: {
                tenant_id: tenantId,
                customer_id: dto.customer_id,
                month_year: monthYear,
            },
        });
        if (existingSummary?.is_locked) {
            throw new ConflictException({
                success: false,
                statusCode: 409,
                code: 'MONTH_LOCKED',
                message: `Cannot modify entry: ${formatMonthYearLabel(monthYear)} is locked. Unlock from Monthly Summary first.`,
                month_year: monthYear,
            });
        }

        // Rule 2: Get active price snapshot
        const activePrice = await this.productsService.getPriceForDate(
            tenantId,
            dto.product_id,
            entryDate,
        );
        if (!activePrice) {
            throw new BadRequestException(
                'No product price is available for the selected entry date.',
            );
        }

        const duplicateEntry = await this.findDuplicateEntry(
            tenantId,
            dto.customer_id,
            dto.product_id,
            entryDate,
            source,
        );

        if (duplicateEntry && !dto.force_create) {
            throw new ConflictException({
                success: false,
                statusCode: 409,
                code: 'DUPLICATE_ENTRY',
                message:
                    'An entry already exists for this customer, product, date, and source.',
                duplicate: this.serializeEntry(duplicateEntry),
                actions: {
                    can_force_create: true,
                    can_edit_existing: this.canUpdateExistingEntry(
                        duplicateEntry,
                        userId,
                        userRole,
                        source,
                    ),
                },
            });
        }

        const quantity = Number(dto.quantity);
        const unitPrice = Number(activePrice.price_per_unit);
        const lineTotal = Number((quantity * unitPrice).toFixed(2));

        const queryRunner = this.dataSource.createQueryRunner();
        await queryRunner.connect();
        await queryRunner.startTransaction();

        try {
            const entry = queryRunner.manager.create(DailyEntry, {
                tenant_id: tenantId,
                customer_id: dto.customer_id,
                product_id: dto.product_id,
                entry_date: entryDate,
                quantity: quantity,
                unit_price: unitPrice,
                line_total: lineTotal,
                source,
                entry_slot: dto.entry_slot || EntrySlot.MORNING,
                created_by_user_id: userId,
                month_year: monthYear,
            });
            const savedEntry = await queryRunner.manager.save(entry);

            // Rule 6: Recalculate monthly summary
            await this.recalculateSummary(
                queryRunner,
                tenantId,
                dto.customer_id,
                monthYear,
            );

            await queryRunner.commitTransaction();

            return this.toResponseEntry(savedEntry);
        } catch (error) {
            await queryRunner.rollbackTransaction();
            throw error;
        } finally {
            await queryRunner.release();
        }
    }

    async update(
        tenantId: string,
        entryId: string,
        userId: string,
        userRole: string,
        dto: UpdateEntryDto,
    ) {
        const entry = await this.entryRepo.findOne({
            where: { id: entryId, tenant_id: tenantId, is_deleted: false },
        });

        if (!entry) {
            throw new NotFoundException('Entry not found');
        }

        const source = this.getChannelFromRole(userRole);
        if (!this.canUpdateExistingEntry(entry, userId, userRole, source)) {
            throw new ForbiddenException(
                'You are not allowed to update this entry',
            );
        }

        const summary = await this.summaryRepo.findOne({
            where: {
                tenant_id: tenantId,
                customer_id: entry.customer_id,
                month_year: entry.month_year,
            },
        });
        if (summary?.is_locked) {
            throw new ConflictException({
                success: false,
                statusCode: 409,
                code: 'MONTH_LOCKED',
                message: `Cannot modify entry: ${formatMonthYearLabel(entry.month_year)} is locked. Unlock from Monthly Summary first.`,
                month_year: entry.month_year,
            });
        }

        const quantity = Number(dto.quantity);
        entry.quantity = quantity;
        entry.line_total = Number((quantity * Number(entry.unit_price)).toFixed(2));

        const queryRunner = this.dataSource.createQueryRunner();
        await queryRunner.connect();
        await queryRunner.startTransaction();

        try {
            const updatedEntry = await queryRunner.manager.save(entry);

            await this.recalculateSummary(
                queryRunner,
                tenantId,
                entry.customer_id,
                entry.month_year,
            );

            await queryRunner.commitTransaction();

            return this.toResponseEntry(updatedEntry);
        } catch (error) {
            await queryRunner.rollbackTransaction();
            throw error;
        } finally {
            await queryRunner.release();
        }
    }

    async findByDate(tenantId: string, date: string, customerId?: string) {
        const where: any = {
            tenant_id: tenantId,
            entry_date: date,
            is_deleted: false,
        };
        if (customerId) where.customer_id = customerId;

        const entries = await this.entryRepo.find({
            where,
            relations: ['customer', 'product', 'created_by_user'],
            order: { created_at: 'DESC' },
        });
        return entries.map((entry) => this.toResponseEntry(entry));
    }

    async findByDateForDelivery(tenantId: string, date: string, userId: string) {
        const entries = await this.entryRepo.find({
            where: {
                tenant_id: tenantId,
                entry_date: date,
                created_by_user_id: userId,
                is_deleted: false,
            },
            relations: ['customer', 'product', 'created_by_user'],
            order: { created_at: 'DESC' },
        });
        return entries.map((entry) => this.toResponseEntry(entry));
    }

    async findByMonth(tenantId: string, monthYear: string, customerId?: string) {
        const where: any = {
            tenant_id: tenantId,
            month_year: monthYear,
            is_deleted: false,
        };
        if (customerId) where.customer_id = customerId;

        const entries = await this.entryRepo.find({
            where,
            relations: ['customer', 'product', 'created_by_user'],
            order: { entry_date: 'DESC', created_at: 'DESC' },
        });
        return entries.map((entry) => this.toResponseEntry(entry));
    }

    async softDelete(tenantId: string, entryId: string, userId: string) {
        const entry = await this.entryRepo.findOne({
            where: { id: entryId, tenant_id: tenantId, is_deleted: false },
        });

        if (!entry) throw new NotFoundException('Entry not found');

        // Check if month is locked
        const summary = await this.summaryRepo.findOne({
            where: {
                tenant_id: tenantId,
                customer_id: entry.customer_id,
                month_year: entry.month_year,
            },
        });
        if (summary?.is_locked) {
            throw new ConflictException({
                success: false,
                statusCode: 409,
                code: 'MONTH_LOCKED',
                message: `Cannot modify entry: ${formatMonthYearLabel(entry.month_year)} is locked. Unlock from Monthly Summary first.`,
                month_year: entry.month_year,
            });
        }

        const queryRunner = this.dataSource.createQueryRunner();
        await queryRunner.connect();
        await queryRunner.startTransaction();

        try {
            // Rule 3: Soft delete only — audit logged
            entry.is_deleted = true;
            entry.deleted_by = userId;
            entry.deleted_at = new Date();
            await queryRunner.manager.save(entry);

            // Rule 6: Recalculate monthly summary
            await this.recalculateSummary(
                queryRunner,
                tenantId,
                entry.customer_id,
                entry.month_year,
            );

            await queryRunner.commitTransaction();

            return { message: 'Entry deleted successfully' };
        } catch (error) {
            await queryRunner.rollbackTransaction();
            throw error;
        } finally {
            await queryRunner.release();
        }
    }

    /**
     * Recalculate monthly summary for a customer+month (inside transaction)
     */
    private async recalculateSummary(
        queryRunner: any,
        tenantId: string,
        customerId: string,
        monthYear: string,
    ) {
        // Query active entries for this customer+month
        const result = await queryRunner.manager
            .createQueryBuilder(DailyEntry, 'e')
            .select('SUM(e.line_total)', 'total')
            .addSelect('COUNT(*)', 'count')
            .where('e.tenant_id = :tenantId', { tenantId })
            .andWhere('e.customer_id = :customerId', { customerId })
            .andWhere('e.month_year = :monthYear', { monthYear })
            .andWhere('e.is_deleted = false')
            .getRawOne();

        const totalAmount = Number(result.total) || 0;
        const entryCount = Number(result.count) || 0;

        // Get quantity breakdown by product
        const productBreakdown = await queryRunner.manager
            .createQueryBuilder(DailyEntry, 'e')
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

        // UPSERT monthly summary
        const existing = await queryRunner.manager.findOne(MonthlySummary, {
            where: { tenant_id: tenantId, customer_id: customerId, month_year: monthYear },
        });

        if (existing) {
            existing.total_amount = totalAmount;
            existing.entry_count = entryCount;
            existing.total_quantity_by_product = quantityByProduct;
            existing.last_calculated_at = new Date();
            await queryRunner.manager.save(existing);
        } else {
            const newSummary = queryRunner.manager.create(MonthlySummary, {
                tenant_id: tenantId,
                customer_id: customerId,
                month_year: monthYear,
                total_amount: totalAmount,
                entry_count: entryCount,
                total_quantity_by_product: quantityByProduct,
                last_calculated_at: new Date(),
            });
            await queryRunner.manager.save(newSummary);
        }
    }
}
