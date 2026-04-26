import { Injectable, NotFoundException, OnModuleInit, ConflictException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, ILike, Brackets, Not } from 'typeorm';
import { Customer } from './customer.entity';
import { CreateCustomerDto, UpdateCustomerDto } from './dto/customer.dto';
import { UsersService } from '../users/users.service';
import { TenantsService } from '../tenants/tenants.service';

@Injectable()
export class CustomersService implements OnModuleInit {
    constructor(
        @InjectRepository(Customer)
        private customerRepo: Repository<Customer>,
        private usersService: UsersService,
        private tenantsService: TenantsService,
    ) { }

    async onModuleInit() {
        console.log('🚀 Syncing customer user accounts...');
        const customers = await this.customerRepo.find({
            where: { is_active: true },
        });

        for (const customer of customers) {
            if (customer.phone) {
                // This will create or update the user account for the customer
                await this.usersService.createForCustomer(customer.tenant_id, customer);
            }
        }
        console.log(`✅ Synced ${customers.length} customers.`);
    }

    async findAll(
        tenantId: string,
        query?: { search?: string; page?: number; limit?: number },
    ) {
        const page = query?.page || 1;
        const limit = query?.limit || 20;
        const skip = (page - 1) * limit;

        const qb = this.customerRepo
            .createQueryBuilder('c')
            .where('c.tenant_id = :tenantId', { tenantId })
            .andWhere('c.is_active = true');

        if (query?.search) {
            const search = query.search.trim();
            const searchPattern = `%${search}%`;
            const isNumber = /^\d+$/.test(search);

            qb.andWhere(
                new Brackets((sub) => {
                    sub.where('c.name ILIKE :search', { search: searchPattern });
                    if (isNumber) {
                        const num = parseInt(search, 10);
                        if (num <= 2147483647) {
                            sub.orWhere('c.customer_number = :num', { num });
                        }
                    }
                }),
            );
        }

        qb.orderBy('c.customer_number', 'ASC')
            .skip(skip)
            .take(limit);

        const [data, total] = await qb.getManyAndCount();

        // Get the stored sequence for this tenant
        const sequence = await this.tenantsService.getSequence(tenantId);

        return {
            data,
            customer_sequence: sequence,
            meta: {
                page,
                limit,
                total,
                totalPages: Math.ceil(total / limit),
            },
        };
    }

    async findOne(tenantId: string, id: string) {
        const customer = await this.customerRepo.findOne({
            where: { id, tenant_id: tenantId },
        });
        if (!customer) throw new NotFoundException('Customer not found');
        return customer;
    }

    async findActive(tenantId: string) {
        return this.customerRepo.find({
            where: { tenant_id: tenantId, is_active: true },
            order: { customer_number: 'ASC' },
        });
    }

    private async assertCustomerNumberUnique(
        tenantId: string,
        customerNumber: number,
        excludeId?: string,
    ) {
        const where: any = { tenant_id: tenantId, customer_number: customerNumber };
        if (excludeId) where.id = Not(excludeId);
        const existing = await this.customerRepo.findOne({ where });
        if (existing) {
            throw new ConflictException(
                `Customer number ${customerNumber} already exists in this shop`,
            );
        }
    }

    /** Phone numbers must be unique within the tenant's customers AND
     *  unique across the entire users table (since customers get auto-linked
     *  user accounts on the same phone). */
    private async assertPhoneUnique(
        tenantId: string,
        phone: string | undefined | null,
        excludeId?: string,
    ) {
        const trimmed = phone?.trim();
        if (!trimmed) return;

        // 1) Same-tenant active customer with this phone
        const customerWhere: any = {
            tenant_id: tenantId,
            phone: trimmed,
            is_active: true,
        };
        if (excludeId) customerWhere.id = Not(excludeId);
        const existingCustomer = await this.customerRepo.findOne({ where: customerWhere });
        if (existingCustomer) {
            throw new ConflictException(
                'This phone number is already registered to another customer',
            );
        }

        // 2) Any user (any tenant, any role) on this phone — except the
        //    user that's already linked to the customer being updated
        const existingUser = await this.usersService.findByPhone(trimmed);
        if (existingUser && (!excludeId || existingUser.customer_id !== excludeId)) {
            throw new ConflictException(
                'This phone number is already in use by an existing user account. Please use a different number.',
            );
        }
    }

    async create(tenantId: string, dto: CreateCustomerDto) {
        // Phone uniqueness across customers + users table
        await this.assertPhoneUnique(tenantId, dto.phone);

        let customerNumber = dto.customer_number;

        if (customerNumber) {
            // Explicit number from caller — must be unique
            await this.assertCustomerNumberUnique(tenantId, customerNumber);
        } else {
            // Auto-generate next customer_number for this tenant
            const result = await this.customerRepo
                .createQueryBuilder('c')
                .select('MAX(c.customer_number)', 'max')
                .where('c.tenant_id = :tenantId', { tenantId })
                .getRawOne();
            customerNumber = (result?.max || 0) + 1;
        }

        const { customer_number: _drop, ...rest } = dto;
        const customer = this.customerRepo.create({
            tenant_id: tenantId,
            customer_number: customerNumber,
            ...rest,
        });
        const savedCustomer = await this.customerRepo.save(customer);

        // Auto-create user account
        await this.usersService.createForCustomer(tenantId, savedCustomer);

        return savedCustomer;
    }

    async update(tenantId: string, id: string, dto: UpdateCustomerDto) {
        const customer = await this.findOne(tenantId, id);

        if (
            dto.customer_number !== undefined &&
            dto.customer_number !== customer.customer_number
        ) {
            await this.assertCustomerNumberUnique(tenantId, dto.customer_number, id);
        }

        // Only re-validate phone if it actually changed
        if (
            dto.phone !== undefined &&
            (dto.phone || '').trim() !== (customer.phone || '').trim()
        ) {
            await this.assertPhoneUnique(tenantId, dto.phone, id);
        }

        Object.assign(customer, dto);
        const savedCustomer = await this.customerRepo.save(customer);

        // Ensure user account is synced (created if phone added, or ID linked)
        await this.usersService.createForCustomer(tenantId, savedCustomer);

        return savedCustomer;
    }

    async deactivate(tenantId: string, id: string) {
        const customer = await this.findOne(tenantId, id);
        customer.is_active = false;
        await this.customerRepo.save(customer);
        return { message: 'Customer deactivated' };
    }

    async updateSequence(tenantId: string, sequence: string[]) {
        return this.tenantsService.updateSequence(tenantId, sequence);
    }
}
