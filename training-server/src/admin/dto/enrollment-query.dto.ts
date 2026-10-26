import { Transform } from 'class-transformer';
import { IsEnum, IsOptional, IsString, IsUUID, MaxLength } from 'class-validator';
import { PaginationDto } from '../../common/pagination.dto';
import { trim } from '../../common/transforms';
import { PaymentStatus } from '../../generated/enums';

export class EnrollmentQueryDto extends PaginationDto {
  @IsOptional()
  @IsEnum(PaymentStatus)
  paymentStatus?: PaymentStatus;

  @IsOptional()
  @IsUUID()
  courseId?: string;

  /** Learner email or name */
  @IsOptional()
  @Transform(trim)
  @IsString()
  @MaxLength(100)
  search?: string;
}
