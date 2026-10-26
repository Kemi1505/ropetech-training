import { Transform, Type } from 'class-transformer';
import { 
  IsEnum, 
  IsNumber, 
  IsOptional, 
  IsPositive, 
  IsString, 
  MaxLength, 
  MinLength 
} from 'class-validator';
import { PaginationDto } from '../../common/pagination.dto';
import { trim } from '../../common/transforms';
import { PaymentStatus } from '../../generated/enums';

export class SubmitPaymentDto {
  /** The name on the account the money was sent from */
  @Transform(trim)
  @IsString()
  @MinLength(2)
  @MaxLength(100)
  payerName!: string;

  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @IsPositive()
  amountSent!: number;
}

export class RejectPaymentDto {
  @IsOptional()
  @Transform(trim)
  @IsString()
  @MaxLength(300)
  reason?: string;
}

export class PaymentQueryDto extends PaginationDto {
  @IsOptional()
  @IsEnum(PaymentStatus)
  status?: PaymentStatus;
}
