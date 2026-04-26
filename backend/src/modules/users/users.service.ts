import {
    Injectable,
    NotFoundException,
    ConflictException,
    ForbiddenException,
    OnModuleInit,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { User, UserRole } from './user.entity';
import { Tenant } from '../tenants/tenant.entity';
import { CreateUserDto, UpdateUserDto, ChangePasswordDto } from './dto/user.dto';

@Injectable()
export class UsersService implements OnModuleInit {
    constructor(
        @InjectRepository(User)
        private userRepo: Repository<User>,
        @InjectRepository(Tenant)
        private tenantRepo: Repository<Tenant>,
    ) { }

    async onModuleInit() {
        const adminPhone = '7622015731';
        const adminPin = '121249';
        const adminName = 'Mihir Patel';
        const systemTenantId = '00000000-0000-0000-0000-000000000000';

        // 1. Ensure System Tenant exists
        let systemTenant = await this.tenantRepo.findOne({ where: { id: systemTenantId } });
        if (!systemTenant) {
            console.log('🚀 Seeding System Tenant...');
            systemTenant = this.tenantRepo.create({
                id: systemTenantId,
                shop_name: 'System Platform',
                is_active: true,
            });
            await this.tenantRepo.save(systemTenant);
        }

        // 2. Ensure Super Admin exists and has correct PIN
        const hashedPin = await bcrypt.hash(adminPin, 10);
        const existing = await this.userRepo.findOne({ where: { phone: adminPhone } });

        if (!existing) {
            console.log('🚀 Seeding Super Admin user...');
            const admin = this.userRepo.create({
                id: '00000000-0000-0000-0000-000000000001',
                tenant_id: systemTenantId,
                name: adminName,
                phone: adminPhone,
                password_hash: hashedPin,
                role: UserRole.SUPER_ADMIN,
                is_active: true,
            });
            await this.userRepo.save(admin);
            console.log('✅ Super Admin seeded successfully');
        } else {
            console.log('🆙 Syncing Super Admin (Role & PIN)...');
            existing.role = UserRole.SUPER_ADMIN;
            existing.password_hash = hashedPin;
            existing.is_active = true;
            existing.tenant_id = systemTenantId;
            await this.userRepo.save(existing);
        }
    }

    async findAll(tenantId: string) {
        return this.userRepo.find({
            where: { tenant_id: tenantId, is_active: true },
            select: ['id', 'name', 'phone', 'role', 'is_active', 'created_at'],
        });
    }

    /** Find a user by phone across ALL tenants and roles. Used to prevent
     *  cross-tenant phone collisions when creating/updating customers.
     *  Normalises +91 / 91 prefixes and whitespace so 9876543210 matches
     *  +919876543210 / 919876543210 / "98765 43210" etc. */
    async findByPhone(phone: string): Promise<User | null> {
        if (!phone) return null;
        const normalized = phone.replace(/[\s\-()]/g, '').replace(/^\+?91/, '').trim();
        if (!normalized) return null;
        return this.userRepo.findOne({
            where: [
                { phone: normalized },
                { phone: '+91' + normalized },
                { phone: '91' + normalized },
            ],
        });
    }

    async create(tenantId: string, dto: CreateUserDto) {
        // Cannot create OWNER via this endpoint
        if (dto.role === UserRole.OWNER) {
            throw new ForbiddenException('Cannot create OWNER user via this endpoint');
        }

        const existing = await this.userRepo.findOne({
            where: { phone: dto.phone },
        });
        if (existing) {
            throw new ConflictException('Phone number already registered');
        }

        const hashedPin = await bcrypt.hash(dto.pin, 10);
        const user = this.userRepo.create({
            tenant_id: tenantId,
            name: dto.name,
            phone: dto.phone,
            password_hash: hashedPin,
            role: dto.role,
            customer_id: dto.customer_id,
        });

        const saved = await this.userRepo.save(user);
        return {
            id: saved.id,
            name: saved.name,
            phone: saved.phone,
            role: saved.role,
        };
    }

    async update(tenantId: string, id: string, dto: UpdateUserDto) {
        const user = await this.userRepo.findOne({
            where: { id, tenant_id: tenantId },
        });
        if (!user) throw new NotFoundException('User not found');

        if (dto.name) user.name = dto.name;
        if (dto.phone) {
            const existing = await this.userRepo.findOne({
                where: { phone: dto.phone },
            });
            if (existing && existing.id !== id) {
                throw new ConflictException('Phone number already in use');
            }
            user.phone = dto.phone;
        }
        if (dto.pin) user.password_hash = await bcrypt.hash(dto.pin, 10);
        if (dto.role) user.role = dto.role;
        if (dto.customer_id !== undefined) user.customer_id = dto.customer_id;

        const saved = await this.userRepo.save(user);
        return {
            id: saved.id,
            name: saved.name,
            phone: saved.phone,
            role: saved.role,
        };
    }

    async deactivate(tenantId: string, id: string) {
        const user = await this.userRepo.findOne({
            where: { id, tenant_id: tenantId },
        });
        if (!user) throw new NotFoundException('User not found');
        if (user.role === UserRole.OWNER) {
            throw new ForbiddenException('Cannot deactivate OWNER user');
        }

        user.is_active = false;
        await this.userRepo.save(user);
        return { message: 'User deactivated' };
    }

    async changePassword(userId: string, dto: ChangePasswordDto) {
        const user = await this.userRepo.findOne({ where: { id: userId } });
        if (!user) throw new NotFoundException('User not found');

        const isMatch = await bcrypt.compare(dto.oldPin, user.password_hash);
        if (!isMatch) {
            throw new ForbiddenException('Incorrect old PIN');
        }

        user.password_hash = await bcrypt.hash(dto.newPin, 10);
        await this.userRepo.save(user);

        return { message: 'Password changed successfully' };
    }

    /**
     * Automatically create or link a user account for a customer
     */
    async createForCustomer(tenantId: string, customer: any) {
        if (!customer.phone) return null;

        const defaultPin = '123456';
        const hashedPin = await bcrypt.hash(defaultPin, 10);

        // 1. Check if a user is already linked to this customer_id
        const userByCustomerId = await this.userRepo.findOne({
            where: { customer_id: customer.id },
        });

        if (userByCustomerId) {
            // Update details (phone might have changed)
            userByCustomerId.phone = customer.phone;
            userByCustomerId.name = customer.name;
            return this.userRepo.save(userByCustomerId);
        }

        // 2. No user linked by ID, check if THIS phone number exists
        const existingByPhone = await this.userRepo.findOne({
            where: { phone: customer.phone },
        });

        if (existingByPhone) {
            // If it's a basic user/delivery, link them to the customer
            if ([UserRole.CUSTOMER, UserRole.DELIVERY].includes(existingByPhone.role)) {
                existingByPhone.customer_id = customer.id;
                existingByPhone.name = customer.name;
                existingByPhone.role = UserRole.CUSTOMER;
                return this.userRepo.save(existingByPhone);
            }
            return existingByPhone;
        }

        // 3. Create new user
        const user = this.userRepo.create({
            tenant_id: tenantId,
            name: customer.name,
            phone: customer.phone,
            password_hash: hashedPin,
            role: UserRole.CUSTOMER,
            customer_id: customer.id,
            is_active: true,
        });

        return this.userRepo.save(user);
    }
}
