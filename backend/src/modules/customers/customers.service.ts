import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, ILike, Brackets } from 'typeorm';
import { Customer } from './customer.entity';
import { CreateCustomerDto, UpdateCustomerDto } from './dto/customer.dto';

@Injectable()
export class CustomersService {
    constructor(
        @InjectRepository(Customer)
        private customerRepo: Repository<Customer>,
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
            // Allow searching by customer_number, name, or phone
            const isNumber = /^\d+$/.test(search);
            if (isNumber) {
                qb.andWhere(
                    new Brackets((sub) => {
                        sub.where('c.customer_number = :num', { num: parseInt(search) })
                            .orWhere('c.name ILIKE :search', { search: `%${search}%` });
                    }),
                );
            } else {
                qb.andWhere('c.name ILIKE :search', { search: `%${search}%` });
            }
        }

        qb.orderBy('c.customer_number', 'ASC')
            .skip(skip)
            .take(limit);

        const [data, total] = await qb.getManyAndCount();

        return {
            data,
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
        return this.customerRepo.save(customer);
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
}
