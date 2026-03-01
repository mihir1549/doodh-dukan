import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { User } from '../users/user.entity';
import { LoginDto } from './dto/login.dto';

@Injectable()
export class AuthService {
    constructor(
        @InjectRepository(User)
        private userRepo: Repository<User>,
        private jwtService: JwtService,
    ) { }

    async login(dto: LoginDto) {
        const user = await this.userRepo.findOne({
            where: { phone: dto.phone, is_active: true },
            relations: ['tenant'],
        });

        if (!user) {
            throw new UnauthorizedException('Invalid phone number or PIN');
        }

        const isMatch = await bcrypt.compare(dto.pin, user.password_hash);
        if (!isMatch) {
            throw new UnauthorizedException('Invalid phone number or PIN');
        }

        // Skipping tenant check for SUPER_ADMIN
        if (user.role !== 'SUPER_ADMIN' && !user.tenant?.is_active) {
            throw new UnauthorizedException('Your shop account is deactivated');
        }

        const payload = {
            sub: user.id,
            tenantId: user.tenant_id,
            role: user.role,
        };

        return {
            access_token: this.jwtService.sign(payload),
            user: {
                id: user.id,
                name: user.name,
                phone: user.phone,
                role: user.role,
                tenant_id: user.tenant_id,
                shop_name: user.tenant?.shop_name,
            },
        };
    }

    async getMe(userId: string) {
        const user = await this.userRepo.findOne({
            where: { id: userId },
            relations: ['tenant'],
        });

        if (!user) {
            throw new UnauthorizedException('User not found');
        }

        return {
            id: user.id,
            name: user.name,
            phone: user.phone,
            role: user.role,
            tenant_id: user.tenant_id,
            shop_name: user.tenant?.shop_name,
        };
    }
}
