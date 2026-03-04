import { Injectable, ConflictException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { Tenant } from './tenant.entity';
import { User, UserRole } from '../users/user.entity';
import { CreateTenantDto } from './dto/create-tenant.dto';

@Injectable()
export class TenantsService {
    constructor(
        @InjectRepository(Tenant)
        private tenantRepo: Repository<Tenant>,
        @InjectRepository(User)
        private userRepo: Repository<User>,
        private dataSource: DataSource,
    ) { }

    async register(dto: CreateTenantDto) {
        // Check if phone already exists
        const existingUser = await this.userRepo.findOne({
            where: { phone: dto.phone },
        });
        if (existingUser) {
            throw new ConflictException('Phone number already registered');
        }

        // Transaction: create tenant + owner user
        const queryRunner = this.dataSource.createQueryRunner();
        await queryRunner.connect();
        await queryRunner.startTransaction();

        try {
            const tenant = queryRunner.manager.create(Tenant, {
                shop_name: dto.shop_name,
                phone: dto.phone,
                address: dto.address,
            });
            const savedTenant = await queryRunner.manager.save(tenant);

            const hashedPin = await bcrypt.hash(dto.pin, 10);
            const owner = queryRunner.manager.create(User, {
                tenant_id: savedTenant.id,
                name: dto.owner_name,
                phone: dto.phone,
                password_hash: hashedPin,
                role: UserRole.OWNER,
            });
            const savedOwner = await queryRunner.manager.save(owner);

            await queryRunner.commitTransaction();

            return {
                tenant: {
                    id: savedTenant.id,
                    shop_name: savedTenant.shop_name,
                },
                owner: {
                    id: savedOwner.id,
                    name: savedOwner.name,
                    phone: savedOwner.phone,
                    role: savedOwner.role,
                },
            };
        } catch (error) {
            await queryRunner.rollbackTransaction();
            throw error;
        } finally {
            await queryRunner.release();
        }
    }

    async findAll() {
        return this.tenantRepo.find({
            order: { shop_name: 'ASC' }
        });
    }

    async toggleStatus(id: string) {
        const tenant = await this.tenantRepo.findOne({ where: { id } });
        if (!tenant) throw new ConflictException('Shop not found');
        tenant.is_active = !tenant.is_active;
        return this.tenantRepo.save(tenant);
    }

    async updateSequence(id: string, sequence: number[]) {
        console.log(`[TenantsService] UPDATING sequence for tenant ID: "${id}"`);
        console.log(`[TenantsService] Sequence payload:`, JSON.stringify(sequence));

        try {
            // Direct PostgreSQL query to be 100% sure
            await this.dataSource.query(
                'UPDATE tenants SET customer_sequence = $1 WHERE id = $2',
                [JSON.stringify(sequence), id]
            );

            console.log(`[TenantsService] UPDATE successful`);

            // Return updated tenant
            return this.tenantRepo.findOne({ where: { id } });
        } catch (err) {
            console.error(`[TenantsService] DATABASE ERROR:`, err);
            throw err;
        }
    }

    async getSequence(id: string) {
        console.log(`[TenantsService] FETCHING sequence for tenant ID: "${id}"`);
        const tenant = await this.tenantRepo.findOne({
            where: { id }
        });
        const seq = tenant?.customer_sequence || [];
        console.log(`[TenantsService] FETCH complete - found: ${seq.length} items`);
        return seq;
    }
}
