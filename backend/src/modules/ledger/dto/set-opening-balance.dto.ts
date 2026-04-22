import { IsEnum, IsNotEmpty, IsNumber, IsOptional, IsString, IsUUID, Min } from 'class-validator';
import { LedgerDirection } from '../ledger.entity';

export class SetOpeningBalanceDto {
    @IsUUID()
    customer_id: string;

    @IsEnum(LedgerDirection)
    direction: LedgerDirection;

    @IsNumber()
    @Min(0)
    amount: number;

    @IsString()
    @IsNotEmpty()
    as_of_date: string; // YYYY-MM-DD

    @IsString()
    @IsOptional()
    note?: string;
}
