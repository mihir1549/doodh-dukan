import {
    Injectable,
    NotFoundException,
    ConflictException,
    ForbiddenException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { User, UserRole } from './user.entity';
import { CreateUserDto, UpdateUserDto } from './dto/user.dto';

@Injectable()
export class UsersService {
    constructor(
        @InjectRepository(User)
        private userRepo: Repository<User>,
    ) { }

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
}
