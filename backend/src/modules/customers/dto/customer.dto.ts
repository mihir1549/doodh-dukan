import { IsString, IsNotEmpty, IsOptional, IsArray, IsInt, Min } from 'class-validator';
import { Type } from 'class-transformer';

export class UpdateSequenceDto {
    @IsArray()
    @IsString({ each: true })
    sequence: string[];
}

export class CreateCustomerDto {
    @IsString()
    @IsNotEmpty()
    name: string;

    @IsString()
    @IsOptional()
    phone?: string;

    @IsString()
    @IsOptional()
    address?: string;

    @IsString()
    @IsOptional()
    notes?: string;

    // Optional explicit customer number; if omitted, server auto-generates
    @IsInt()
    @Min(1)
    @IsOptional()
    @Type(() => Number)
    customer_number?: number;
}

export class UpdateCustomerDto {
    @IsString()
    @IsOptional()
    name?: string;

    @IsString()
    @IsOptional()
    phone?: string;

    @IsString()
    @IsOptional()
    address?: string;

    @IsString()
    @IsOptional()
    notes?: string;

    @IsInt()
    @Min(1)
    @IsOptional()
    @Type(() => Number)
    customer_number?: number;
}
