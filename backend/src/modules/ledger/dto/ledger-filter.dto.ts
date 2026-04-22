import { IsEnum, IsNumber, IsOptional, IsString, Min } from 'class-validator';
import { Type } from 'class-transformer';
import { LedgerEntryType, LedgerStatus } from '../ledger.entity';

export class LedgerFilterDto {
    @IsString()
    @IsOptional()
    from_date?: string;

    @IsString()
    @IsOptional()
    to_date?: string;

    @IsEnum(LedgerEntryType)
    @IsOptional()
    entry_type?: LedgerEntryType;

    @IsEnum(LedgerStatus)
    @IsOptional()
    status?: LedgerStatus;

    @IsNumber()
    @Min(1)
    @IsOptional()
    @Type(() => Number)
    page?: number = 1;

    @IsNumber()
    @Min(1)
    @IsOptional()
    @Type(() => Number)
    limit?: number = 20;
}
