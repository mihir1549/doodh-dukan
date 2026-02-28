import {
    Injectable,
    NotFoundException,
    ForbiddenException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { MonthlySummary } from './monthly-summary.entity';
import { DailyEntry } from '../entries/daily-entry.entity';
import { Customer } from '../customers/customer.entity';
import { Product } from '../products/product.entity';

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
        private dataSource: DataSource,
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
        const summary = await this.summaryRepo.findOne({
            where: { id: summaryId, tenant_id: tenantId },
        });
        if (!summary) throw new NotFoundException('Summary not found');

        summary.is_locked = true;
        summary.locked_at = new Date();
        summary.locked_by = userId;
        return this.summaryRepo.save(summary);
    }

    async unlock(tenantId: string, summaryId: string) {
        const summary = await this.summaryRepo.findOne({
            where: { id: summaryId, tenant_id: tenantId },
        });
        if (!summary) throw new NotFoundException('Summary not found');

        summary.is_locked = false;
        summary.locked_at = null;
        summary.locked_by = null;
        return this.summaryRepo.save(summary);
    }

    async recalculateMonth(tenantId: string, monthYear: string) {
        const customers = await this.customerRepo.find({
            where: { tenant_id: tenantId, is_active: true },
        });

        for (const customer of customers) {
            await this.recalculateSingle(tenantId, customer.id, monthYear);
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
