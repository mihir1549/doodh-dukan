import { Controller, Post, Body, UseGuards } from '@nestjs/common';
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
}
