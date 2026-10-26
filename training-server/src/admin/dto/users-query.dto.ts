import { Transform } from 'class-transformer';
import { IsIn, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';
import { PaginationDto } from '../../common/pagination.dto';
import { trim } from '../../common/transforms';

export const CERT_STATUSES = ['PENDING', 'APPROVED', 'REJECTED'] as const;
export type CertStatus = (typeof CERT_STATUSES)[number];

export class UsersQueryDto extends PaginationDto {
  /** Email, first name or last name */
  @IsOptional()
  @Transform(trim)
  @IsString()
  @MaxLength(100)
  search?: string;

  /** NONE = no certification uploaded */
  @IsOptional()
  @IsIn([...CERT_STATUSES, 'NONE'])
  certification?: CertStatus | 'NONE';
}

export class CertificationQueryDto extends PaginationDto {
  @IsOptional()
  @IsIn(CERT_STATUSES)
  status?: CertStatus; // defaults to PENDING
}

export class RejectCertificationDto {
  @Transform(trim)
  @IsString()
  @MinLength(3)
  @MaxLength(300)
  reason!: string;
}
