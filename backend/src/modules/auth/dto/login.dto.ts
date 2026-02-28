import { IsString, IsNotEmpty, Length } from 'class-validator';

export class LoginDto {
    @IsString()
    @IsNotEmpty()
    phone: string;

    @IsString()
    @IsNotEmpty()
    @Length(6, 6, { message: 'PIN must be exactly 6 digits' })
    pin: string;
}
