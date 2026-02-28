import {
    Controller,
    Get,
    Post,
    Delete,
    Body,
    Param,
    Query,
    UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { EntriesService } from './entries.service';
import { CreateEntryDto } from './dto/entry.dto';
import { TenantId, CurrentUser, Roles } from '../../common/decorators';
import { RolesGuard } from '../../common/guards';
import { UserRole } from '../users/user.entity';

@Controller('api/v1/entries')
@UseGuards(AuthGuard('jwt'), RolesGuard)
export class EntriesController {
    constructor(private entriesService: EntriesService) { }

    @Post()
    @Roles(UserRole.OWNER, UserRole.SHOP_STAFF, UserRole.DELIVERY)
    async create(
        @TenantId() tenantId: string,
        @CurrentUser() user: any,
        @Body() dto: CreateEntryDto,
    ) {
        return this.entriesService.create(tenantId, user.userId, user.role, dto);
    }

    @Get()
    @Roles(UserRole.OWNER, UserRole.SHOP_STAFF, UserRole.DELIVERY)
    async findEntries(
        @TenantId() tenantId: string,
        @CurrentUser() user: any,
        @Query('date') date?: string,
        @Query('month') month?: string,
        @Query('customer_id') customerId?: string,
    ) {
        // If month is provided, return all entries for that month
        if (month) {
            return this.entriesService.findByMonth(tenantId, month, customerId);
        }

        // DELIVERY sees only their own entries
        const queryDate = date || new Date().toISOString().split('T')[0];
        if (user.role === UserRole.DELIVERY) {
            return this.entriesService.findByDateForDelivery(
                tenantId,
                queryDate,
                user.userId,
            );
        }
        return this.entriesService.findByDate(tenantId, queryDate, customerId);
    }

    @Delete(':id')
    @Roles(UserRole.OWNER) // Only OWNER can delete entries
    async softDelete(
        @TenantId() tenantId: string,
        @CurrentUser() user: any,
        @Param('id') id: string,
    ) {
        return this.entriesService.softDelete(tenantId, id, user.userId);
    }
}
