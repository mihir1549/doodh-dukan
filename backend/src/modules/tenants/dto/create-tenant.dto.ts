import { IsString, IsNotEmpty, IsOptional, Length } from 'class-validator';

export class CreateTenantDto {
    @IsString()
    @IsNotEmpty()
    shop_name: string;

    @IsString()
    @IsNotEmpty()
    phone: string;

    @IsString()
    @IsNotEmpty()
    owner_name: string;

    @IsString()
    @IsNotEmpty()
    @Length(6, 6, { message: 'PIN must be exactly 6 digits' })
    pin: string;

    @IsString()
    @IsOptional()
    address?: string;
}
