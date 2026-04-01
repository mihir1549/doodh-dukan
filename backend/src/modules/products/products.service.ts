import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, IsNull, DataSource } from 'typeorm';
import { Product } from './product.entity';
import { ProductPrice } from './product-price.entity';
import {
    CreateProductDto,
    UpdateProductDto,
    SetPriceDto,
} from './dto/product.dto';

@Injectable()
export class ProductsService {
    constructor(
        @InjectRepository(Product)
        private productRepo: Repository<Product>,
        @InjectRepository(ProductPrice)
        private priceRepo: Repository<ProductPrice>,
        private dataSource: DataSource,
    ) { }

    async findAll(tenantId: string) {
        const products = await this.productRepo.createQueryBuilder('p')
            .leftJoinAndSelect('p.prices', 'price', 'price.effective_to IS NULL')
            .where('p.tenant_id = :tenantId', { tenantId })
            .andWhere('p.is_active = true')
            .orderBy('p.name', 'ASC')
            .getMany();

        return products.map(p => ({
            ...p,
            current_price: p.prices?.[0]?.price_per_unit || null,
        }));
    }

    async findOne(tenantId: string, id: string) {
        const product = await this.productRepo.findOne({
            where: { id, tenant_id: tenantId },
        });
        if (!product) throw new NotFoundException('Product not found');

        const currentPrice = await this.getActivePrice(tenantId, id);
        return {
            ...product,
            current_price: currentPrice?.price_per_unit || null,
        };
    }

    async create(tenantId: string, dto: CreateProductDto) {
        const queryRunner = this.dataSource.createQueryRunner();
        await queryRunner.connect();
        await queryRunner.startTransaction();

        try {
            const product = queryRunner.manager.create(Product, {
                tenant_id: tenantId,
                name: dto.name,
                category: dto.category,
                unit: dto.unit,
            });
            const savedProduct = await queryRunner.manager.save(product);

            // Create initial price
            const today = new Date().toISOString().split('T')[0];
            const price = queryRunner.manager.create(ProductPrice, {
                tenant_id: tenantId,
                product_id: savedProduct.id,
                price_per_unit: dto.initial_price,
                effective_from: today,
                effective_to: null, // currently active
            });
            await queryRunner.manager.save(price);

            await queryRunner.commitTransaction();

            return {
                ...savedProduct,
                current_price: dto.initial_price,
            };
        } catch (error) {
            await queryRunner.rollbackTransaction();
            throw error;
        } finally {
            await queryRunner.release();
        }
    }

    async update(tenantId: string, id: string, dto: UpdateProductDto) {
        const product = await this.productRepo.findOne({
            where: { id, tenant_id: tenantId },
        });
        if (!product) throw new NotFoundException('Product not found');

        Object.assign(product, dto);
        return this.productRepo.save(product);
    }

    async setPrice(tenantId: string, productId: string, dto: SetPriceDto) {
        const product = await this.productRepo.findOne({
            where: { id: productId, tenant_id: tenantId },
        });
        if (!product) throw new NotFoundException('Product not found');

        const effectiveFrom = dto.effective_from || new Date().toISOString().split('T')[0];

        const queryRunner = this.dataSource.createQueryRunner();
        await queryRunner.connect();
        await queryRunner.startTransaction();

        try {
            // Close the current active price
            await queryRunner.manager.update(
                ProductPrice,
                {
                    product_id: productId,
                    tenant_id: tenantId,
                    effective_to: IsNull(),
                },
                {
                    effective_to: effectiveFrom,
                },
            );

            // Create new price
            const newPrice = queryRunner.manager.create(ProductPrice, {
                tenant_id: tenantId,
                product_id: productId,
                price_per_unit: dto.price_per_unit,
                effective_from: effectiveFrom,
                effective_to: null,
            });
            const savedPrice = await queryRunner.manager.save(newPrice);

            await queryRunner.commitTransaction();
            return savedPrice;
        } catch (error) {
            await queryRunner.rollbackTransaction();
            throw error;
        } finally {
            await queryRunner.release();
        }
    }

    async getPriceHistory(tenantId: string, productId: string) {
        return this.priceRepo.find({
            where: { product_id: productId, tenant_id: tenantId },
            order: { effective_from: 'DESC' },
        });
    }

    async getActivePrice(
        tenantId: string,
        productId: string,
    ): Promise<ProductPrice | null> {
        return this.priceRepo.findOne({
            where: {
                product_id: productId,
                tenant_id: tenantId,
                effective_to: IsNull(),
            },
        });
    }

    async getPriceForDate(
        tenantId: string,
        productId: string,
        entryDate: string,
    ): Promise<ProductPrice | null> {
        return this.priceRepo
            .createQueryBuilder('price')
            .where('price.tenant_id = :tenantId', { tenantId })
            .andWhere('price.product_id = :productId', { productId })
            .andWhere('price.effective_from <= :entryDate', { entryDate })
            .andWhere(
                '(price.effective_to IS NULL OR price.effective_to > :entryDate)',
                { entryDate },
            )
            .orderBy('price.effective_from', 'DESC')
            .getOne();
    }

    async deactivate(tenantId: string, id: string) {
        const product = await this.productRepo.findOne({
            where: { id, tenant_id: tenantId },
        });
        if (!product) throw new NotFoundException('Product not found');
        product.is_active = false;
        await this.productRepo.save(product);
        return { message: 'Product deactivated' };
    }
}
