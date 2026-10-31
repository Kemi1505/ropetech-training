import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsBoolean, IsNotEmpty, IsOptional, IsString, Matches, MaxLength } from 'class-validator';
import { toBoolean, trim } from '../../common/transforms';

export class CompleteProfileDto {
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

  @Transform(trim)
  @Matches(/^\+?[0-9\s\-()]{7,20}$/, { message: 'Enter a valid phone number' })
  phone!: string;

  @IsOptional()
  @Transform(trim)
  @IsString()
  @MaxLength(120)
  company?: string;

  @IsOptional()
  @Transform(toBoolean)
  @IsBoolean()
  hasPreviousCertification?: boolean;

}
