import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Tenant } from '../tenants/tenant.entity';
import { Customer } from '../customers/customer.entity';
import { SummariesService } from '../summaries/summaries.service';
import { getPreviousMonthYear } from '../../common/utils/helpers';

@Injectable()
export class SchedulerService {
    private readonly logger = new Logger(SchedulerService.name);

    constructor(
        @InjectRepository(Tenant)
        private tenantRepo: Repository<Tenant>,
        @InjectRepository(Customer)
        private customerRepo: Repository<Customer>,
        private summariesService: SummariesService,
    ) { }

    /**
     * Rule 7: Runs on 1st of every month at 00:05 AM IST
     * Recalculates final summaries for the previous month across all tenants
     */
    @Cron('5 0 1 * *', { timeZone: 'Asia/Kolkata' })
    async finalizeLastMonth() {
        const lastMonth = getPreviousMonthYear();
        this.logger.log(`Starting month-end finalization for ${lastMonth}`);

        const tenants = await this.tenantRepo.find({
            where: { is_active: true },
        });

        let totalCustomers = 0;

        for (const tenant of tenants) {
            const customers = await this.customerRepo.find({
                where: { tenant_id: tenant.id, is_active: true },
            });

            for (const customer of customers) {
                try {
                    await this.summariesService.recalculateSingle(
                        tenant.id,
                        customer.id,
                        lastMonth,
                    );
                    totalCustomers++;
                } catch (error) {
                    this.logger.error(
                        `Failed to recalculate for tenant ${tenant.id}, customer ${customer.id}: ${error.message}`,
                    );
                }
            }
        }

        this.logger.log(
            `Month-end finalization complete for ${lastMonth}. Processed ${totalCustomers} customer summaries across ${tenants.length} tenants.`,
        );
    }
}
