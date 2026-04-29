import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Customer } from './customer.entity';
import { CustomersService } from './customers.service';
import { CustomersController } from './customers.controller';
import { UsersModule } from '../users/users.module';
import { TenantsModule } from '../tenants/tenants.module';
import { CustomerBalance } from '../ledger/customer-balance.entity';
import { LedgerEntry } from '../ledger/ledger.entity';

@Module({
    imports: [
        TypeOrmModule.forFeature([Customer, CustomerBalance, LedgerEntry]),
        UsersModule,
        TenantsModule,
    ],
    controllers: [CustomersController],
    providers: [CustomersService],
    exports: [CustomersService, TypeOrmModule],
})
export class CustomersModule { }
