import { Transform } from 'class-transformer';
import { IsEmail, IsString, MaxLength, MinLength } from 'class-validator';
import { MAX_PASSWORD_MESSAGE, MIN_PASSWORD_MESSAGE, trimLower } from './common';

export class RegisterDto {
  @Transform(trimLower)
  @IsEmail()
  email!: string;

  @IsString()
  @MinLength(6, { message: MIN_PASSWORD_MESSAGE })
  @MaxLength(72, { message: MAX_PASSWORD_MESSAGE })
  password!: string;

  @IsString()
  confirmPassword!: string;
}
