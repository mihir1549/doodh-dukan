import {
    Entity,
    PrimaryGeneratedColumn,
    Column,
    UpdateDateColumn,
    ManyToOne,
    JoinColumn,
    Index,
    Unique,
} from 'typeorm';
import { Tenant } from '../tenants/tenant.entity';
import { Customer } from '../customers/customer.entity';

@Entity('customer_balances')
@Unique(['customer_id'])
export class CustomerBalance {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column({ type: 'uuid' })
    @Index('idx_balance_tenant')
    tenant_id: string;

    @Column({ type: 'uuid' })
    customer_id: string;

    // Positive = customer owes money, Negative = customer has advance
    @Column({ type: 'numeric', precision: 10, scale: 2, default: 0 })
    current_balance: number;

    @UpdateDateColumn({ type: 'timestamptz' })
    last_updated: Date;

    @ManyToOne(() => Tenant)
    @JoinColumn({ name: 'tenant_id' })
    tenant: Tenant;

    @ManyToOne(() => Customer)
    @JoinColumn({ name: 'customer_id' })
    customer: Customer;
}
