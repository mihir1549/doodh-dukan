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
import { UsersService } from './users.service';
import { CreateUserDto, UpdateUserDto, ChangePasswordDto } from './dto/user.dto';
import { TenantId, Roles, CurrentUser } from '../../common/decorators';
import { RolesGuard } from '../../common/guards';
import { UserRole } from './user.entity';

@Controller('api/v1/users')
@UseGuards(AuthGuard('jwt'), RolesGuard)
export class UsersController {
    constructor(private usersService: UsersService) { }

    @Get()
    @Roles(UserRole.OWNER)
    async findAll(@TenantId() tenantId: string) {
        return this.usersService.findAll(tenantId);
    }

    @Post()
    @Roles(UserRole.OWNER)
    async create(@TenantId() tenantId: string, @Body() dto: CreateUserDto) {
        return this.usersService.create(tenantId, dto);
    }

    @Patch('password')
    async changePassword(
        @CurrentUser() user: any,
        @Body() dto: ChangePasswordDto,
    ) {
        return this.usersService.changePassword(user.userId, dto);
    }

    @Patch(':id')
    @Roles(UserRole.OWNER)
    async update(
        @TenantId() tenantId: string,
        @Param('id') id: string,
        @Body() dto: UpdateUserDto,
    ) {
        return this.usersService.update(tenantId, id, dto);
    }

    @Delete(':id')
    @Roles(UserRole.OWNER)
    async deactivate(@TenantId() tenantId: string, @Param('id') id: string) {
        return this.usersService.deactivate(tenantId, id);
    }
}
