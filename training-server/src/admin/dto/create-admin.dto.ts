import { Transform } from 'class-transformer';
import { IsEmail, IsNotEmpty, IsString, Matches, MaxLength, MinLength } from 'class-validator';
import { trim } from '../../common/transforms';
import { MAX_PASSWORD_MESSAGE, MIN_PASSWORD_MESSAGE, trimLower } from '../../auth/dto/common';

export class CreateAdminDto {
  @Transform(trimLower)
  @IsEmail()
  email!: string;

  @Transform(trim)
  @IsString()
  @IsNotEmpty()
  @MaxLength(60)
  firstName!: string;

  @Transform(trim)
  @IsString()
  @IsNotEmpty()
  @MaxLength(60)
  lastName!: string;

  /** Initial password; the new admin should change it after the first login */
  @IsString()
  @MinLength(6, {message: MIN_PASSWORD_MESSAGE})
  @MaxLength(72, {message: MAX_PASSWORD_MESSAGE})
  password!: string;
}
