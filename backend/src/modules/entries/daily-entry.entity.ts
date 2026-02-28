import {
    Entity,
    PrimaryGeneratedColumn,
    Column,
    CreateDateColumn,
    ManyToOne,
    JoinColumn,
    Index,
} from 'typeorm';
import { Tenant } from '../tenants/tenant.entity';
import { Customer } from '../customers/customer.entity';
import { Product } from '../products/product.entity';
import { User } from '../users/user.entity';

export enum SourceChannel {
    SHOP = 'SHOP',
    DELIVERY = 'DELIVERY',
}

@Entity('daily_entries')
@Index('idx_entries_tenant_month', ['tenant_id', 'month_year'])
@Index('idx_entries_customer_month', ['tenant_id', 'customer_id', 'month_year'])
@Index('idx_entries_date', ['tenant_id', 'entry_date'])
export class DailyEntry {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column({ type: 'uuid' })
    tenant_id: string;

    @Column({ type: 'uuid' })
    customer_id: string;

    @Column({ type: 'uuid' })
    product_id: string;

    @Column({ type: 'date' })
    entry_date: string;

    @Column({ type: 'numeric', precision: 8, scale: 3 })
    quantity: number;

    @Column({ type: 'numeric', precision: 10, scale: 2 })
    unit_price: number; // snapshot of price at time of entry

    @Column({ type: 'numeric', precision: 12, scale: 2, nullable: true })
    line_total: number; // will be computed in service: quantity * unit_price

    @Column({ type: 'varchar', length: 20 })
    source_channel: SourceChannel;

    @Column({ type: 'uuid' })
    entered_by: string;

    @Column({ type: 'varchar', length: 7 })
    month_year: string; // 'YYYY-MM' for fast monthly grouping

    @Column({ type: 'boolean', default: false })
    is_deleted: boolean;

    @Column({ type: 'uuid', nullable: true })
    deleted_by: string;

    @Column({ type: 'timestamptz', nullable: true })
    deleted_at: Date;

    @CreateDateColumn({ type: 'timestamptz' })
    created_at: Date;

    @ManyToOne(() => Tenant)
    @JoinColumn({ name: 'tenant_id' })
    tenant: Tenant;

    @ManyToOne(() => Customer, (customer) => customer.entries)
    @JoinColumn({ name: 'customer_id' })
    customer: Customer;

    @ManyToOne(() => Product)
    @JoinColumn({ name: 'product_id' })
    product: Product;

    @ManyToOne(() => User, (user) => user.entries)
    @JoinColumn({ name: 'entered_by' })
    entered_by_user: User;
}
