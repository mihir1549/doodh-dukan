import { IsString, IsNotEmpty, IsNumber, IsOptional, IsDateString } from 'class-validator';

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
}
