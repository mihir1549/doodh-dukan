import { Type } from 'class-transformer';
import {
    IsString,
    IsNotEmpty,
    IsNumber,
    IsOptional,
    IsDateString,
    IsEnum,
    IsBoolean,
    IsPositive,
} from 'class-validator';
import { EntrySlot } from '../daily-entry.entity';

export class CreateEntryDto {
    @IsString()
    @IsNotEmpty()
    customer_id: string;

    @IsString()
    @IsNotEmpty()
    product_id: string;

    @IsDateString()
    @IsOptional()
    entry_date?: string;

    @Type(() => Number)
    @IsNumber()
    @IsNotEmpty()
    @IsPositive()
    quantity: number;

    @IsEnum(EntrySlot)
    @IsOptional()
    entry_slot?: EntrySlot;

    @Type(() => Boolean)
    @IsBoolean()
    @IsOptional()
    force_create?: boolean;
}

export class UpdateEntryDto {
    @Type(() => Number)
    @IsNumber()
    @IsNotEmpty()
    @IsPositive()
    quantity: number;
}
