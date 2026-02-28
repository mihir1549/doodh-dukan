import {
    Entity,
    PrimaryGeneratedColumn,
    Column,
    CreateDateColumn,
    ManyToOne,
    JoinColumn,
    Index,
    OneToMany,
    Unique,
} from 'typeorm';
import { Tenant } from '../tenants/tenant.entity';
import { DailyEntry } from '../entries/daily-entry.entity';
import { MonthlySummary } from '../summaries/monthly-summary.entity';

@Entity('customers')
@Index('idx_customer_number', ['tenant_id', 'customer_number'])
export class Customer {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column({ type: 'uuid' })
    @Index('idx_customers_tenant')
    tenant_id: string;

    @Column({ type: 'int', default: 0 })
    customer_number: number;  // Sequential: 1, 2, 3... per tenant

    @Column({ type: 'varchar', length: 100 })
    name: string;

    @Column({ type: 'varchar', length: 20, nullable: true })
    phone: string;

    @Column({ type: 'text', nullable: true })
    address: string;

    @Column({ type: 'text', nullable: true })
    notes: string;

    @Column({ type: 'boolean', default: true })
    is_active: boolean;

    @CreateDateColumn({ type: 'timestamptz' })
    created_at: Date;

    @ManyToOne(() => Tenant, (tenant) => tenant.customers)
    @JoinColumn({ name: 'tenant_id' })
    tenant: Tenant;

    @OneToMany(() => DailyEntry, (entry) => entry.customer)
    entries: DailyEntry[];

    @OneToMany(() => MonthlySummary, (summary) => summary.customer)
    summaries: MonthlySummary[];
}
