import { Transform } from 'class-transformer';
import { IsEmail } from 'class-validator';
import { trimLower } from './common';

export class ForgotPasswordDto {
  @Transform(trimLower)
  @IsEmail()
  email!: string;
}
