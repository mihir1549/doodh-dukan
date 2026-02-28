import {
    Controller,
    Get,
    Post,
    Patch,
    Delete,
    Body,
    Param,
    UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ProductsService } from './products.service';
import {
    CreateProductDto,
    UpdateProductDto,
    SetPriceDto,
} from './dto/product.dto';
import { TenantId, Roles } from '../../common/decorators';
import { RolesGuard } from '../../common/guards';
import { UserRole } from '../users/user.entity';

@Controller('api/v1/products')
@UseGuards(AuthGuard('jwt'), RolesGuard)
export class ProductsController {
    constructor(private productsService: ProductsService) { }

    @Get()
    @Roles(UserRole.OWNER, UserRole.SHOP_STAFF, UserRole.DELIVERY)
    async findAll(@TenantId() tenantId: string) {
        return this.productsService.findAll(tenantId);
    }

    @Get(':id')
    @Roles(UserRole.OWNER, UserRole.SHOP_STAFF)
    async findOne(@TenantId() tenantId: string, @Param('id') id: string) {
        return this.productsService.findOne(tenantId, id);
    }

    @Post()
    @Roles(UserRole.OWNER)
    async create(@TenantId() tenantId: string, @Body() dto: CreateProductDto) {
        return this.productsService.create(tenantId, dto);
    }

    @Patch(':id')
    @Roles(UserRole.OWNER)
    async update(
        @TenantId() tenantId: string,
        @Param('id') id: string,
        @Body() dto: UpdateProductDto,
    ) {
        return this.productsService.update(tenantId, id, dto);
    }

    @Delete(':id')
    @Roles(UserRole.OWNER)
    async deactivate(@TenantId() tenantId: string, @Param('id') id: string) {
        return this.productsService.deactivate(tenantId, id);
    }

    @Post(':id/prices')
    @Roles(UserRole.OWNER)
    async setPrice(
        @TenantId() tenantId: string,
        @Param('id') id: string,
        @Body() dto: SetPriceDto,
    ) {
        return this.productsService.setPrice(tenantId, id, dto);
    }

    @Get(':id/prices')
    @Roles(UserRole.OWNER, UserRole.SHOP_STAFF)
    async getPriceHistory(
        @TenantId() tenantId: string,
        @Param('id') id: string,
    ) {
        return this.productsService.getPriceHistory(tenantId, id);
    }
}
