import { IsString, IsNotEmpty, IsEnum, IsOptional, Length } from 'class-validator';
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
    @Length(6, 6, { message: 'PIN must be exactly 6 digits' })
    pin: string;

    @IsEnum(UserRole)
    @IsNotEmpty()
    role: UserRole;
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
    @Length(6, 6, { message: 'PIN must be exactly 6 digits' })
    pin?: string;

    @IsEnum(UserRole)
    @IsOptional()
    role?: UserRole;
}
