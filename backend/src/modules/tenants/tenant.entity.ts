import {
    Entity,
    PrimaryGeneratedColumn,
    Column,
    CreateDateColumn,
    OneToMany,
} from 'typeorm';
import { User } from '../users/user.entity';
import { Customer } from '../customers/customer.entity';
import { Product } from '../products/product.entity';

@Entity('tenants')
export class Tenant {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column({ type: 'varchar', length: 100 })
    shop_name: string;

    @Column({ type: 'varchar', length: 20, nullable: true })
    phone: string;

    @Column({ type: 'text', nullable: true })
    address: string;

    @Column({ type: 'varchar', length: 10, default: 'gu-IN' })
    locale: string;

    @Column({ type: 'varchar', length: 5, default: '₹' })
    currency_symbol: string;

    @Column({ type: 'boolean', default: true })
    is_active: boolean;

    @Column('jsonb', { nullable: true })
    customer_sequence: string[];

    @CreateDateColumn({ type: 'timestamptz' })
    created_at: Date;

    @OneToMany(() => User, (user) => user.tenant)
    users: User[];

    @OneToMany(() => Customer, (customer) => customer.tenant)
    customers: Customer[];

    @OneToMany(() => Product, (product) => product.tenant)
    products: Product[];
}
