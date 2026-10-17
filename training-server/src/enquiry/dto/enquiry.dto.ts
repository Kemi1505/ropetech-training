import { Transform } from 'class-transformer';
import { IsEmail, IsNotEmpty, IsString, MaxLength, MinLength } from 'class-validator';
import { trim } from '../../common/transforms';

export class UserEnquiryDto {
  @Transform(trim)
  @IsString()
  @MaxLength(3000)
  text!: string;
}

export class PublicEnquiryDto extends UserEnquiryDto {
  @Transform(trim)
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  name!: string;

  @Transform(({ value }) => (typeof value === 'string' ? value.trim().toLowerCase() : value))
  @IsEmail()
  @MaxLength(254)
  email!: string;
}
