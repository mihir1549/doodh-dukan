import { IsString, IsNotEmpty, IsNumber, IsOptional, IsDateString, IsEnum } from 'class-validator';
import { EntrySlot } from '../daily-entry.entity';

export class CreateEntryDto {
    @IsString()
    @IsNotEmpty()
    customer_id: string;

    @IsString()
    @IsNotEmpty()
    product_id: string;

    @IsDateString()
    @IsNotEmpty()
    entry_date: string;

    @IsNumber()
    @IsNotEmpty()
    quantity: number;

    @IsEnum(EntrySlot)
    @IsOptional()
    entry_slot?: EntrySlot;
}
