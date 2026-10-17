import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsBoolean,
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';
import { toBoolean, toStringArray, trim } from '../../common/transforms';
import { Difficulty } from '../../generated/enums';

// Sent as multipart/form-data. Defaults are applied in the service (not here),
// so the PATCH version of this DTO never overwrites fields the client didn't send.
export class CreateCourseDto {
  @Transform(trim)
  @IsString()
  @MinLength(3)
  @MaxLength(150)
  name!: string;

  @Transform(trim)
  @IsString()
  @MinLength(10)
  @MaxLength(5000)
  overview!: string;

  /** Repeat the field, or send a JSON array string */
  @Transform(toStringArray)
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(30)
  @IsString({ each: true })
  @IsNotEmpty({ each: true })
  @MaxLength(300, { each: true })
  learningOutcomes!: string[];

  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  price!: number;

  @IsOptional()
  @Transform(toBoolean)
  @IsBoolean()
  requiresPreviousCertification?: boolean;

  @IsEnum(Difficulty)
  difficulty!: Difficulty;

  /** Defaults to false. A course needs at least one content file before it can be published. */
  @IsOptional()
  @Transform(toBoolean)
  @IsBoolean()
  isPublished?: boolean;

  @ApiPropertyOptional({ type: 'string', format: 'binary', description: 'PNG, max 3 MB' })
  picture?: unknown;
}
