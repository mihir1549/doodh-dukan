import {
    Entity,
    PrimaryGeneratedColumn,
    Column,
    CreateDateColumn,
    ManyToOne,
    JoinColumn,
    Index,
    OneToMany,
} from 'typeorm';
import { Tenant } from '../tenants/tenant.entity';
import { ProductPrice } from './product-price.entity';

export enum ProductCategory {
    LOOSE_MILK = 'LOOSE_MILK',
    PACKAGED_MILK = 'PACKAGED_MILK',
    OTHER = 'OTHER',
}

export enum ProductUnit {
    LITRE = 'litre',
    PACKET = 'packet',
    KG = 'kg',
    PIECE = 'piece',
}

@Entity('products')
export class Product {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column({ type: 'uuid' })
    @Index('idx_products_tenant')
    tenant_id: string;

    @Column({ type: 'varchar', length: 100 })
    name: string;

    @Column({ type: 'varchar', length: 30 })
    category: ProductCategory;

    @Column({ type: 'varchar', length: 20 })
    unit: ProductUnit;

    @Column({ type: 'boolean', default: true })
    is_active: boolean;

    @CreateDateColumn({ type: 'timestamptz' })
    created_at: Date;

    @ManyToOne(() => Tenant, (tenant) => tenant.products)
    @JoinColumn({ name: 'tenant_id' })
    tenant: Tenant;

    @OneToMany(() => ProductPrice, (price) => price.product)
    prices: ProductPrice[];
}
