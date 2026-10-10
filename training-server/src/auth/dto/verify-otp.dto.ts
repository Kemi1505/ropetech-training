import { Transform } from 'class-transformer';
import { IsEmail, Matches } from 'class-validator';
import { trimLower } from './common';

export class VerifyOtpDto {
  @Transform(trimLower)
  @IsEmail()
  email!: string;

  @Matches(/^\d{6}$/, { message: 'otp must be a 6 digit code' })
  otp!: string;
}
