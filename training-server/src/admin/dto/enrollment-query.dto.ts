import { IsEnum, IsOptional } from 'class-validator';
import { PaginationDto } from '../../common/pagination.dto';
import { PaymentStatus } from '../../generated/enums';

export class EnrollmentQueryDto extends PaginationDto {
  @IsOptional()
  @IsEnum(PaymentStatus)
  paymentStatus?: PaymentStatus;
}
