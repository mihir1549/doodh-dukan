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
import { DailyEntry } from '../entries/daily-entry.entity';

export enum UserRole {
    SUPER_ADMIN = 'SUPER_ADMIN',
    OWNER = 'OWNER',
    SHOP_STAFF = 'SHOP_STAFF',
    DELIVERY = 'DELIVERY',
    CUSTOMER = 'CUSTOMER',
}

@Entity('users')
export class User {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column({ type: 'uuid' })
    @Index('idx_users_tenant')
    tenant_id: string;

    @Column({ type: 'varchar', length: 100 })
    name: string;

    @Column({ type: 'varchar', length: 20, unique: true })
    phone: string;

    @Column({ type: 'text' })
    password_hash: string;

    @Column({ type: 'varchar', length: 20 })
    role: UserRole;

    @Column({ type: 'boolean', default: true })
    is_active: boolean;

    @Column({ type: 'uuid', nullable: true })
    customer_id: string;

    @CreateDateColumn({ type: 'timestamptz' })
    created_at: Date;

    @ManyToOne(() => Tenant, (tenant) => tenant.users)
    @JoinColumn({ name: 'tenant_id' })
    tenant: Tenant;

    @OneToMany(() => DailyEntry, (entry) => entry.entered_by_user)
    entries: DailyEntry[];
}
