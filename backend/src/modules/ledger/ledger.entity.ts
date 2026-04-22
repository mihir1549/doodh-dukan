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
import { User } from '../users/user.entity';

export enum LedgerEntryType {
    OPENING_BALANCE = 'OPENING_BALANCE',
    BILL_POSTED = 'BILL_POSTED',
    PAYMENT = 'PAYMENT',
    CARRY_FORWARD = 'CARRY_FORWARD',
    ADVANCE_ADJUSTED = 'ADVANCE_ADJUSTED',
}

export enum LedgerDirection {
    DEBIT = 'DEBIT',
    CREDIT = 'CREDIT',
}

export enum PaymentMode {
    CASH = 'CASH',
    ONLINE = 'ONLINE',
    RAZORPAY = 'RAZORPAY',
}

export enum LedgerStatus {
    PENDING = 'PENDING',
    APPROVED = 'APPROVED',
    REJECTED = 'REJECTED',
}

@Entity('ledger_entries')
@Index('idx_ledger_customer_date', ['customer_id', 'tenant_id', 'transaction_date'])
@Index('idx_ledger_tenant_status', ['tenant_id', 'status'])
export class LedgerEntry {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column({ type: 'uuid' })
    @Index('idx_ledger_tenant')
    tenant_id: string;

    @Column({ type: 'uuid' })
    @Index('idx_ledger_customer')
    customer_id: string;

    @Column({ type: 'varchar', length: 50 })
    entry_type: LedgerEntryType;

    @Column({ type: 'varchar', length: 10 })
    direction: LedgerDirection;

    @Column({ type: 'numeric', precision: 10, scale: 2 })
    amount: number;

    @Column({ type: 'varchar', length: 20, nullable: true })
    payment_mode: PaymentMode | null;

    @Column({ type: 'varchar', length: 255, nullable: true })
    razorpay_order_id: string | null;

    @Column({ type: 'varchar', length: 255, nullable: true })
    razorpay_payment_id: string | null;

    @Column({ type: 'varchar', length: 7, nullable: true })
    reference_month: string | null; // YYYY-MM

    @Column({ type: 'date' })
    transaction_date: string;

    @Column({ type: 'text', nullable: true })
    note: string | null;

    @Column({ type: 'varchar', length: 20, default: LedgerStatus.APPROVED })
    status: LedgerStatus;

    @Column({ type: 'uuid' })
    recorded_by: string;

    @Column({ type: 'uuid', nullable: true })
    approved_by: string | null;

    @Column({ type: 'timestamptz', nullable: true })
    approved_at: Date | null;

    @CreateDateColumn({ type: 'timestamptz' })
    created_at: Date;

    @ManyToOne(() => Tenant)
    @JoinColumn({ name: 'tenant_id' })
    tenant: Tenant;

    @ManyToOne(() => Customer)
    @JoinColumn({ name: 'customer_id' })
    customer: Customer;

    @ManyToOne(() => User, { nullable: true })
    @JoinColumn({ name: 'recorded_by' })
    recorded_by_user: User;

    @ManyToOne(() => User, { nullable: true })
    @JoinColumn({ name: 'approved_by' })
    approved_by_user: User;
}
