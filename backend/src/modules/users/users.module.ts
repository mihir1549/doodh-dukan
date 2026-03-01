import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from './user.entity';
import { Tenant } from '../tenants/tenant.entity';
import { UsersService } from './users.service';
import { UsersController } from './users.controller';

@Module({
    imports: [TypeOrmModule.forFeature([User, Tenant])],
    controllers: [UsersController],
    providers: [UsersService],
    exports: [UsersService, TypeOrmModule],
})
export class UsersModule { }
