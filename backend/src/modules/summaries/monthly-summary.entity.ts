import {
    Entity,
    PrimaryGeneratedColumn,
    Column,
    ManyToOne,
    JoinColumn,
    Index,
    Unique,
} from 'typeorm';
import { Tenant } from '../tenants/tenant.entity';
import { Customer } from '../customers/customer.entity';
import { User } from '../users/user.entity';

@Entity('monthly_summaries')
@Unique(['tenant_id', 'customer_id', 'month_year'])
@Index('idx_summaries_tenant_month', ['tenant_id', 'month_year'])
export class MonthlySummary {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column({ type: 'uuid' })
    tenant_id: string;

    @Column({ type: 'uuid' })
    customer_id: string;

    @Column({ type: 'varchar', length: 7 })
    month_year: string; // 'YYYY-MM'

    @Column({ type: 'numeric', precision: 12, scale: 2, default: 0 })
    total_amount: number;

    @Column({ type: 'jsonb', nullable: true })
    total_quantity_by_product: Record<string, number>; // {product_id: qty, ...}

    @Column({ type: 'int', default: 0 })
    entry_count: number;

    @Column({ type: 'boolean', default: false })
    is_locked: boolean;

    @Column({ type: 'timestamptz', nullable: true })
    locked_at: Date | null;

    @Column({ type: 'uuid', nullable: true })
    locked_by: string | null;

    @Column({ type: 'timestamptz', default: () => 'NOW()' })
    last_calculated_at: Date;

    @ManyToOne(() => Tenant)
    @JoinColumn({ name: 'tenant_id' })
    tenant: Tenant;

    @ManyToOne(() => Customer, (customer) => customer.summaries)
    @JoinColumn({ name: 'customer_id' })
    customer: Customer;

    @ManyToOne(() => User, { nullable: true })
    @JoinColumn({ name: 'locked_by' })
    locked_by_user: User;
}
