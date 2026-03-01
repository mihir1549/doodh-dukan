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
import { CreateUserDto, UpdateUserDto } from './dto/user.dto';

@Injectable()
export class UsersService implements OnModuleInit {
    constructor(
        @InjectRepository(User)
        private userRepo: Repository<User>,
    ) { }

    async onModuleInit() {
        const adminPhone = '7622015731';
        const adminPin = '121249';
        const adminName = 'Mihir Patel';

        const existing = await this.userRepo.findOne({ where: { phone: adminPhone } });
        if (!existing) {
            console.log('🚀 Seeding Super Admin user...');
            const hashedPin = await bcrypt.hash(adminPin, 10);

            // Note: Super Admin doesn't necessarily need a tenant, 
            // but the entity has a non-nullable tenant_id usually.
            // We'll create a dummy system tenant if needed or just use a placeholder UUID.
            const systemTenantId = '00000000-0000-0000-0000-000000000000';

            const admin = this.userRepo.create({
                id: '00000000-0000-0000-0000-000000000001',
                tenant_id: systemTenantId,
                name: adminName,
                phone: adminPhone,
                password_hash: hashedPin,
                role: UserRole.SUPER_ADMIN,
                is_active: true,
            });

            try {
                await this.userRepo.save(admin);
                console.log('✅ Super Admin seeded successfully');
            } catch (err) {
                console.error('❌ Failed to seed Super Admin:', err.message);
            }
        } else if (existing.role !== UserRole.SUPER_ADMIN) {
            console.log('🆙 Promoting existing user to Super Admin...');
            existing.role = UserRole.SUPER_ADMIN;
            await this.userRepo.save(existing);
        }
    }

    async findAll(tenantId: string) {
        return this.userRepo.find({
            where: { tenant_id: tenantId, is_active: true },
            select: ['id', 'name', 'phone', 'role', 'is_active', 'created_at'],
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

    /**
     * Automatically create or link a user account for a customer
     */
    async createForCustomer(tenantId: string, customer: any) {
        if (!customer.phone) return null;

        const existing = await this.userRepo.findOne({
            where: { phone: customer.phone },
        });

        if (existing) {
            // If user exists and is not already admin/owner, 
            // link them to this customer and set role
            if ([UserRole.CUSTOMER, UserRole.DELIVERY].includes(existing.role)) {
                existing.customer_id = customer.id;
                existing.role = UserRole.CUSTOMER;
                return this.userRepo.save(existing);
            }
            return existing;
        }

        // Create new user with default password
        const defaultPin = '123456';
        const hashedPin = await bcrypt.hash(defaultPin, 10);

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
