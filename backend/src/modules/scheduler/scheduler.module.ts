import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SchedulerService } from './scheduler.service';
import { Tenant } from '../tenants/tenant.entity';
import { Customer } from '../customers/customer.entity';
import { SummariesModule } from '../summaries/summaries.module';

@Module({
    imports: [
        TypeOrmModule.forFeature([Tenant, Customer]),
        SummariesModule,
    ],
    providers: [SchedulerService],
})
export class SchedulerModule { }
