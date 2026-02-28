import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Tenant } from './tenant.entity';
import { User } from '../users/user.entity';
import { TenantsService } from './tenants.service';
import { TenantsController } from './tenants.controller';

@Module({
    imports: [TypeOrmModule.forFeature([Tenant, User])],
    controllers: [TenantsController],
    providers: [TenantsService],
    exports: [TenantsService, TypeOrmModule],
})
export class TenantsModule { }
