import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MonthlySummary } from './monthly-summary.entity';
import { DailyEntry } from '../entries/daily-entry.entity';
import { Customer } from '../customers/customer.entity';
import { Product } from '../products/product.entity';
import { SummariesService } from './summaries.service';
import { SummariesController } from './summaries.controller';

@Module({
    imports: [TypeOrmModule.forFeature([MonthlySummary, DailyEntry, Customer, Product])],
    controllers: [SummariesController],
    providers: [SummariesService],
    exports: [SummariesService, TypeOrmModule],
})
export class SummariesModule { }

