import {
    Injectable,
    NotFoundException,
    ForbiddenException,
    ConflictException,
    BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { DailyEntry, SourceChannel } from './daily-entry.entity';
import { MonthlySummary } from '../summaries/monthly-summary.entity';
import { ProductsService } from '../products/products.service';
import { CreateEntryDto } from './dto/entry.dto';
import { UserRole } from '../users/user.entity';
import { getMonthYearFromDate, getCurrentMonthYear } from '../../common/utils/helpers';

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

    /**
     * Determine source_channel from user role (never from user input)
     */
    private getChannelFromRole(role: string): SourceChannel {
        switch (role) {
            case UserRole.DELIVERY:
                return SourceChannel.DELIVERY;
            case UserRole.SHOP_STAFF:
                return SourceChannel.SHOP;
            case UserRole.OWNER:
                return SourceChannel.SHOP; // default for owner, can be overridden
            default:
                return SourceChannel.SHOP;
        }
    }

    async create(
        tenantId: string,
        userId: string,
        userRole: string,
        dto: CreateEntryDto,
    ) {
        const monthYear = getMonthYearFromDate(dto.entry_date);
        const currentMonth = getCurrentMonthYear();

        // Rule 4: Backdating beyond current month — only OWNER allowed
        if (monthYear !== currentMonth && userRole !== UserRole.OWNER) {
            throw new ForbiddenException(
                'Only the shop owner can create entries for past months',
            );
        }

        // Rule 5: Check if month is locked
        const existingSummary = await this.summaryRepo.findOne({
            where: {
                tenant_id: tenantId,
                customer_id: dto.customer_id,
                month_year: monthYear,
            },
        });
        if (existingSummary?.is_locked) {
            throw new ConflictException(
                'This month is locked. No changes allowed.',
            );
        }

        // Rule 2: Get active price snapshot
        const activePrice = await this.productsService.getActivePrice(
            tenantId,
            dto.product_id,
        );
        if (!activePrice) {
            throw new BadRequestException(
                'No active price found for this product. Please set a price first.',
            );
        }

        const sourceChannel = this.getChannelFromRole(userRole);
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
                entry_date: dto.entry_date,
                quantity: quantity,
                unit_price: unitPrice,
                line_total: lineTotal,
                source_channel: sourceChannel,
                entered_by: userId,
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

            return savedEntry;
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

        return this.entryRepo.find({
            where,
            relations: ['customer', 'product', 'entered_by_user'],
            order: { created_at: 'DESC' },
        });
    }

    async findByDateForDelivery(tenantId: string, date: string, userId: string) {
        return this.entryRepo.find({
            where: {
                tenant_id: tenantId,
                entry_date: date,
                entered_by: userId,
                is_deleted: false,
            },
            relations: ['customer', 'product'],
            order: { created_at: 'DESC' },
        });
    }

    async findByMonth(tenantId: string, monthYear: string, customerId?: string) {
        const where: any = {
            tenant_id: tenantId,
            month_year: monthYear,
            is_deleted: false,
        };
        if (customerId) where.customer_id = customerId;

        return this.entryRepo.find({
            where,
            relations: ['customer', 'product', 'entered_by_user'],
            order: { entry_date: 'DESC', created_at: 'DESC' },
        });
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
            throw new ConflictException(
                'This month is locked. Cannot delete entry.',
            );
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
