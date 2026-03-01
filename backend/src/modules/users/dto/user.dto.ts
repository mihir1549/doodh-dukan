import { IsString, IsNotEmpty, IsEnum, IsOptional, IsUUID, Length } from 'class-validator';
import { UserRole } from '../user.entity';

export class CreateUserDto {
    @IsString()
    @IsNotEmpty()
    name: string;

    @IsString()
    @IsNotEmpty()
    phone: string;

    @IsString()
    @IsNotEmpty()
    @Length(4, 32)
    pin: string;

    @IsEnum(UserRole)
    @IsNotEmpty()
    role: UserRole;

    @IsUUID()
    @IsOptional()
    customer_id?: string;
}

export class UpdateUserDto {
    @IsString()
    @IsOptional()
    name?: string;

    @IsString()
    @IsOptional()
    phone?: string;

    @IsString()
    @IsOptional()
    @Length(4, 32)
    pin?: string;

    @IsEnum(UserRole)
    @IsOptional()
    role?: UserRole;

    @IsUUID()
    @IsOptional()
    customer_id?: string;
}

export class ChangePasswordDto {
    @IsString()
    @IsNotEmpty()
    oldPin: string;

    @IsString()
    @IsNotEmpty()
    @Length(4, 32)
    newPin: string;
}
