import { Controller, Post, Body } from '@nestjs/common';
import { TenantsService } from './tenants.service';
import { CreateTenantDto } from './dto/create-tenant.dto';

@Controller('api/v1/tenants')
export class TenantsController {
    constructor(private tenantsService: TenantsService) { }

    @Post()
    async register(@Body() dto: CreateTenantDto) {
        return this.tenantsService.register(dto);
    }
}
