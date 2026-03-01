import { Controller, Post, Body, UseGuards, Get, Patch } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { TenantsService } from './tenants.service';
import { CreateTenantDto } from './dto/create-tenant.dto';
import { Roles } from '../../common/decorators';
import { RolesGuard } from '../../common/guards';
import { UserRole } from '../users/user.entity';

@Controller('api/v1/tenants')
@UseGuards(AuthGuard('jwt'), RolesGuard)
export class TenantsController {
    constructor(private tenantsService: TenantsService) { }

    @Post()
    @Roles(UserRole.SUPER_ADMIN)
    async register(@Body() dto: CreateTenantDto) {
        return this.tenantsService.register(dto);
    }

    @Get()
    @Roles(UserRole.SUPER_ADMIN)
    async list() {
        return this.tenantsService.findAll();
    }

    @Post(':id/toggle-status')
    @Roles(UserRole.SUPER_ADMIN)
    async toggleStatus(@Body('id') id: string) {
        return this.tenantsService.toggleStatus(id);
    }
}
