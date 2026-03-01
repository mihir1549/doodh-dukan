import {
    Controller,
    Get,
    Post,
    Param,
    Query,
    UseGuards,
    ForbiddenException,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { SummariesService } from './summaries.service';
import { TenantId, CurrentUser, Roles } from '../../common/decorators';
import { RolesGuard } from '../../common/guards';
import { UserRole } from '../users/user.entity';

@Controller('api/v1/summaries')
@UseGuards(AuthGuard('jwt'), RolesGuard)
export class SummariesController {
    constructor(private summariesService: SummariesService) { }

    @Get()
    @Roles(UserRole.OWNER, UserRole.SHOP_STAFF, UserRole.CUSTOMER)
    async findByMonth(
        @TenantId() tenantId: string,
        @CurrentUser() user: any,
        @Query('month') month: string,
        @Query('customer_id') customerId?: string,
    ) {
        let targetCustomerId = customerId;
        if (user.role === UserRole.CUSTOMER) {
            if (!user.customerId) {
                throw new ForbiddenException('User is not linked to any customer');
            }
            targetCustomerId = user.customerId;
        }

        return this.summariesService.findByMonth(tenantId, month, targetCustomerId);
    }

    @Post(':id/lock')
    @Roles(UserRole.OWNER)
    async lock(
        @TenantId() tenantId: string,
        @CurrentUser() user: any,
        @Param('id') id: string,
    ) {
        return this.summariesService.lock(tenantId, id, user.userId);
    }

    @Post(':id/unlock')
    @Roles(UserRole.OWNER)
    async unlock(@TenantId() tenantId: string, @Param('id') id: string) {
        return this.summariesService.unlock(tenantId, id);
    }

    @Post('recalculate')
    @Roles(UserRole.OWNER)
    async recalculate(
        @TenantId() tenantId: string,
        @Query('month') month: string,
    ) {
        return this.summariesService.recalculateMonth(tenantId, month);
    }
}
