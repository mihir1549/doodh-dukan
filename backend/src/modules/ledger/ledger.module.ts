import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { LedgerEntry } from './ledger.entity';
import { CustomerBalance } from './customer-balance.entity';
import { Customer } from '../customers/customer.entity';
import { LedgerService } from './ledger.service';
import { LedgerController } from './ledger.controller';

@Module({
    imports: [TypeOrmModule.forFeature([LedgerEntry, CustomerBalance, Customer])],
    controllers: [LedgerController],
    providers: [LedgerService],
    exports: [LedgerService, TypeOrmModule],
})
export class LedgerModule { }
