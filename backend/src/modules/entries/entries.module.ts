import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DailyEntry } from './daily-entry.entity';
import { MonthlySummary } from '../summaries/monthly-summary.entity';
import { EntriesService } from './entries.service';
import { EntriesController } from './entries.controller';
import { ProductsModule } from '../products/products.module';

@Module({
    imports: [
        TypeOrmModule.forFeature([DailyEntry, MonthlySummary]),
        ProductsModule,
    ],
    controllers: [EntriesController],
    providers: [EntriesService],
    exports: [EntriesService, TypeOrmModule],
})
export class EntriesModule { }
