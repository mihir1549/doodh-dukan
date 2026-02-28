import {
    Entity,
    PrimaryGeneratedColumn,
    Column,
    CreateDateColumn,
    ManyToOne,
    JoinColumn,
} from 'typeorm';
import { Tenant } from '../tenants/tenant.entity';
import { Product } from './product.entity';

@Entity('product_prices')
export class ProductPrice {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column({ type: 'uuid' })
    tenant_id: string;

    @Column({ type: 'uuid' })
    product_id: string;

    @Column({ type: 'numeric', precision: 10, scale: 2 })
    price_per_unit: number;

    @Column({ type: 'date' })
    effective_from: string;

    @Column({ type: 'date', nullable: true })
    effective_to: string | null; // NULL = currently active

    @CreateDateColumn({ type: 'timestamptz' })
    created_at: Date;

    @ManyToOne(() => Tenant)
    @JoinColumn({ name: 'tenant_id' })
    tenant: Tenant;

    @ManyToOne(() => Product, (product) => product.prices)
    @JoinColumn({ name: 'product_id' })
    product: Product;
}
