import {
    Controller,
    Get,
    Post,
    Patch,
    Delete,
    Body,
    Param,
    Query,
    UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { CustomersService } from './customers.service';
import { CreateCustomerDto, UpdateCustomerDto } from './dto/customer.dto';
import { TenantId, Roles } from '../../common/decorators';
import { RolesGuard } from '../../common/guards';
import { UserRole } from '../users/user.entity';

@Controller('api/v1/customers')
@UseGuards(AuthGuard('jwt'), RolesGuard)
export class CustomersController {
    constructor(private customersService: CustomersService) { }

    @Get()
    @Roles(UserRole.OWNER, UserRole.SHOP_STAFF, UserRole.DELIVERY)
    async findAll(
        @TenantId() tenantId: string,
        @Query('search') search?: string,
        @Query('page') page?: string,
        @Query('limit') limit?: string,
    ) {
        return this.customersService.findAll(tenantId, {
            search,
            page: page ? parseInt(page) : undefined,
            limit: limit ? parseInt(limit) : undefined,
        });
    }

    @Get(':id')
    @Roles(UserRole.OWNER, UserRole.SHOP_STAFF, UserRole.DELIVERY)
    async findOne(@TenantId() tenantId: string, @Param('id') id: string) {
        return this.customersService.findOne(tenantId, id);
    }

    @Post()
    @Roles(UserRole.OWNER, UserRole.SHOP_STAFF)
    async create(@TenantId() tenantId: string, @Body() dto: CreateCustomerDto) {
        return this.customersService.create(tenantId, dto);
    }

    @Patch(':id')
    @Roles(UserRole.OWNER, UserRole.SHOP_STAFF)
    async update(
        @TenantId() tenantId: string,
        @Param('id') id: string,
        @Body() dto: UpdateCustomerDto,
    ) {
        return this.customersService.update(tenantId, id, dto);
    }

    @Delete(':id')
    @Roles(UserRole.OWNER, UserRole.SHOP_STAFF)
    async deactivate(@TenantId() tenantId: string, @Param('id') id: string) {
        return this.customersService.deactivate(tenantId, id);
    }

    @Patch('sequence')
    @Roles(UserRole.OWNER, UserRole.SHOP_STAFF)
    async updateSequence(
        @TenantId() tenantId: string,
        @Body('sequence') sequence: number[],
    ) {
        return this.customersService.updateSequence(tenantId, sequence);
    }
}
