import {
    Controller,
    Get,
    Post,
    Patch,
    Param,
    Body,
    Query,
    UseGuards,
    ForbiddenException,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { LedgerService } from './ledger.service';
import { SetOpeningBalanceDto } from './dto/set-opening-balance.dto';
import { RecordPaymentDto } from './dto/record-payment.dto';
import { LedgerFilterDto } from './dto/ledger-filter.dto';
import { TenantId, CurrentUser, Roles } from '../../common/decorators';
import { RolesGuard } from '../../common/guards';
import { UserRole } from '../users/user.entity';

@Controller('api/v1/ledger')
@UseGuards(AuthGuard('jwt'), RolesGuard)
export class LedgerController {
    constructor(private ledgerService: LedgerService) { }

    @Post('opening-balance')
    @Roles(UserRole.OWNER, UserRole.SUPER_ADMIN)
    async setOpeningBalance(
        @TenantId() tenantId: string,
        @CurrentUser() user: any,
        @Body() dto: SetOpeningBalanceDto,
    ) {
        return this.ledgerService.setOpeningBalance(dto, user.userId, tenantId);
    }

    @Post('payments')
    @Roles(UserRole.OWNER, UserRole.SHOP_STAFF, UserRole.DELIVERY, UserRole.CUSTOMER, UserRole.SUPER_ADMIN)
    async recordPayment(
        @TenantId() tenantId: string,
        @CurrentUser() user: any,
        @Body() dto: RecordPaymentDto,
    ) {
        return this.ledgerService.recordPayment(dto, user.userId, tenantId);
    }

    @Patch('payments/:id/approve')
    @Roles(UserRole.OWNER, UserRole.SUPER_ADMIN)
    async approvePayment(
        @TenantId() tenantId: string,
        @CurrentUser() user: any,
        @Param('id') id: string,
    ) {
        return this.ledgerService.approvePayment(id, user.userId, tenantId);
    }

    @Patch('payments/:id/reject')
    @Roles(UserRole.OWNER, UserRole.SUPER_ADMIN)
    async rejectPayment(
        @TenantId() tenantId: string,
        @CurrentUser() user: any,
        @Param('id') id: string,
        @Body('reason') reason: string,
    ) {
        return this.ledgerService.rejectPayment(id, user.userId, tenantId, reason);
    }

    @Get('customer/:id')
    @Roles(UserRole.OWNER, UserRole.SHOP_STAFF, UserRole.DELIVERY, UserRole.CUSTOMER, UserRole.SUPER_ADMIN)
    async getCustomerLedger(
        @TenantId() tenantId: string,
        @CurrentUser() user: any,
        @Param('id') customerId: string,
        @Query() filters: LedgerFilterDto,
    ) {
        if (user.role === UserRole.CUSTOMER && user.customerId !== customerId) {
            throw new ForbiddenException('You can only view your own ledger');
        }
        return this.ledgerService.getCustomerLedger(customerId, tenantId, filters);
    }

    @Get('customer/:id/balance')
    @Roles(UserRole.OWNER, UserRole.SHOP_STAFF, UserRole.DELIVERY, UserRole.CUSTOMER, UserRole.SUPER_ADMIN)
    async getCustomerBalance(
        @TenantId() tenantId: string,
        @CurrentUser() user: any,
        @Param('id') customerId: string,
    ) {
        if (user.role === UserRole.CUSTOMER && user.customerId !== customerId) {
            throw new ForbiddenException('You can only view your own balance');
        }
        return this.ledgerService.getCustomerBalance(customerId, tenantId);
    }

    @Get('customer/:id/has-opening-balance')
    @Roles(UserRole.OWNER, UserRole.SUPER_ADMIN)
    async hasOpeningBalance(
        @TenantId() tenantId: string,
        @Param('id') customerId: string,
    ) {
        const has = await this.ledgerService.hasOpeningBalance(customerId, tenantId);
        return { has_opening_balance: has };
    }

    /** Emergency: rebuild a customer's running balance from the entire
     *  ledger history. OWNER only. Not used in normal flow. */
    @Post('customer/:id/recalculate-balance')
    @Roles(UserRole.OWNER)
    async recalculateBalance(
        @TenantId() tenantId: string,
        @CurrentUser() user: any,
        @Param('id') customerId: string,
    ) {
        return this.ledgerService.recalculateBalanceManual(
            tenantId,
            customerId,
            user.userId,
        );
    }

    // Shop-level customer financial data — SUPER_ADMIN explicitly excluded
    @Get('pending-payments')
    @Roles(UserRole.OWNER, UserRole.SHOP_STAFF)
    async getPendingPayments(@TenantId() tenantId: string) {
        const payments = await this.ledgerService.getPendingPayments(tenantId);
        return payments.map((e) => ({
            id: e.id,
            customer_id: e.customer_id,
            customer_name: e.customer?.name,
            customer_number: e.customer?.customer_number,
            amount: Number(e.amount),
            payment_mode: e.payment_mode,
            transaction_date: e.transaction_date,
            note: e.note,
            recorded_by_name: e.recorded_by_user?.name,
            created_at: e.created_at,
        }));
    }

    @Get('pending-payments/count')
    @Roles(UserRole.OWNER, UserRole.SHOP_STAFF)
    async getPendingCount(@TenantId() tenantId: string) {
        const count = await this.ledgerService.getPendingPaymentsCount(tenantId);
        return { count };
    }
}
