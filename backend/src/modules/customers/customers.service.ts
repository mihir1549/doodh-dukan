import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, ILike, Brackets } from 'typeorm';
import { Customer } from './customer.entity';
import { CreateCustomerDto, UpdateCustomerDto } from './dto/customer.dto';
import { UsersService } from '../users/users.service';
import { TenantsService } from '../tenants/tenants.service';

@Injectable()
export class CustomersService {
    constructor(
        @InjectRepository(Customer)
        private customerRepo: Repository<Customer>,
        private usersService: UsersService,
        private tenantsService: TenantsService,
    ) { }

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

    async create(tenantId: string, dto: CreateCustomerDto) {
        // Auto-generate next customer_number for this tenant
        const result = await this.customerRepo
            .createQueryBuilder('c')
            .select('MAX(c.customer_number)', 'max')
            .where('c.tenant_id = :tenantId', { tenantId })
            .getRawOne();

        const nextNumber = (result?.max || 0) + 1;

        const customer = this.customerRepo.create({
            tenant_id: tenantId,
            customer_number: nextNumber,
            ...dto,
        });
        const savedCustomer = await this.customerRepo.save(customer);

        // Auto-create user account
        await this.usersService.createForCustomer(tenantId, savedCustomer);

        return savedCustomer;
    }

    async update(tenantId: string, id: string, dto: UpdateCustomerDto) {
        const customer = await this.findOne(tenantId, id);
        Object.assign(customer, dto);
        return this.customerRepo.save(customer);
    }

    async deactivate(tenantId: string, id: string) {
        const customer = await this.findOne(tenantId, id);
        customer.is_active = false;
        await this.customerRepo.save(customer);
        return { message: 'Customer deactivated' };
    }

    async updateSequence(tenantId: string, sequence: number[]) {
        return this.tenantsService.updateSequence(tenantId, sequence);
    }
}
