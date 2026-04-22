import { IsEnum, IsNotEmpty, IsNumber, IsOptional, IsString, IsUUID, Min } from 'class-validator';
import { PaymentMode } from '../ledger.entity';

export class RecordPaymentDto {
    @IsUUID()
    customer_id: string;

    @IsNumber()
    @Min(0.01)
    amount: number;

    @IsEnum(PaymentMode)
    payment_mode: PaymentMode;

    @IsString()
    @IsNotEmpty()
    transaction_date: string; // YYYY-MM-DD

    @IsString()
    @IsOptional()
    note?: string;
}
