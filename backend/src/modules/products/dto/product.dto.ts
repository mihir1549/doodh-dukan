import {
    IsString,
    IsNotEmpty,
    IsEnum,
    IsOptional,
    IsNumber,
    IsDateString,
} from 'class-validator';
import { ProductCategory, ProductUnit } from '../product.entity';

export class CreateProductDto {
    @IsString()
    @IsNotEmpty()
    name: string;

    @IsEnum(ProductCategory)
    @IsNotEmpty()
    category: ProductCategory;

    @IsEnum(ProductUnit)
    @IsNotEmpty()
    unit: ProductUnit;

    @IsNumber()
    @IsNotEmpty()
    initial_price: number; // first price to set
}

export class UpdateProductDto {
    @IsString()
    @IsOptional()
    name?: string;

    @IsEnum(ProductCategory)
    @IsOptional()
    category?: ProductCategory;

    @IsEnum(ProductUnit)
    @IsOptional()
    unit?: ProductUnit;
}

export class SetPriceDto {
    @IsNumber()
    @IsNotEmpty()
    price_per_unit: number;

    @IsDateString()
    @IsOptional()
    effective_from?: string; // defaults to today
}
