import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsBoolean, IsNotEmpty, IsOptional, IsPhoneNumber, IsString, Matches, MaxLength } from 'class-validator';
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

  @IsPhoneNumber()
  phone!: string;

  @IsOptional()
  @Transform(trim)
  @IsString()
  @MaxLength(120)
  company?: string;

  @Transform(toBoolean)
  @IsBoolean()
  hasPreviousCertification!: boolean;


}
