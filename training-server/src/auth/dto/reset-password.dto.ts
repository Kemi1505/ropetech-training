import { Transform } from 'class-transformer';
import { IsEmail, IsString, Matches, MaxLength, MinLength } from 'class-validator';
import { MAX_PASSWORD_MESSAGE, MIN_PASSWORD_MESSAGE, trimLower } from './common';

export class ResetPasswordDto {
  @Transform(trimLower)
  @IsEmail()
  email!: string;

  @Matches(/^\d{6}$/, { message: 'otp must be a 6 digit code' })
  otp!: string;

  @IsString()
  @MinLength(6, {message: MIN_PASSWORD_MESSAGE})
  @MaxLength(72, {message: MAX_PASSWORD_MESSAGE})
  newPassword!: string;

  @IsString()
  confirmPassword!: string;
}
