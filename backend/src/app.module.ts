import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ScheduleModule } from '@nestjs/schedule';
import { databaseConfig } from './config/database.config';

// Feature modules
import { AuthModule } from './modules/auth/auth.module';
import { TenantsModule } from './modules/tenants/tenants.module';
import { UsersModule } from './modules/users/users.module';
import { CustomersModule } from './modules/customers/customers.module';
import { ProductsModule } from './modules/products/products.module';
import { EntriesModule } from './modules/entries/entries.module';
import { SummariesModule } from './modules/summaries/summaries.module';
import { SchedulerModule } from './modules/scheduler/scheduler.module';
import { HealthModule } from './modules/health/health.module';

@Module({
  imports: [
    TypeOrmModule.forRoot(databaseConfig),
    ScheduleModule.forRoot(),
    AuthModule,
    TenantsModule,
    UsersModule,
    CustomersModule,
    ProductsModule,
    EntriesModule,
    SummariesModule,
    SchedulerModule,
    HealthModule,
  ],
})
export class AppModule { }
