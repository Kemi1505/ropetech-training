import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import {
  ArrayMaxSize,
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

// Sent as multipart/form-data. Only step 1 (basic info) is required to create a draft;
// outcomes and requirements are added in later steps and checked again when publishing.
// Defaults are applied in the service (not here), so the PATCH version never overwrites fields the client didn't send.
export class CreateCourseDto {
  @Transform(trim)
  @IsString()
  @MinLength(3)
  @MaxLength(150)
  name!: string;

  /** Shown on course cards */
  @Transform(trim)
  @IsString()
  @MinLength(10)
  @MaxLength(160)
  shortDescription!: string;

  /** Shown on the course page as "Course overview" */
  @Transform(trim)
  @IsString()
  @MinLength(10)
  @MaxLength(5000)
  description!: string;

  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  price!: number;

  @IsEnum(Difficulty)
  difficulty!: Difficulty;

  /** Repeat the field, or send a JSON array string */
  @IsOptional()
  @Transform(toStringArray)
  @IsArray()
  @ArrayMaxSize(30)
  @IsString({ each: true })
  @IsNotEmpty({ each: true })
  @MaxLength(300, { each: true })
  learningOutcomes?: string[];

  @IsOptional()
  @Transform(toBoolean)
  @IsBoolean()
  requiresPreviousCertification?: boolean;

  /** e.g. "Valid Banksman certification required." */
  @IsOptional()
  @Transform(trim)
  @IsString()
  @MaxLength(300)
  certificationRequirement?: string;

  /** Must be false or omitted: a course is published from the last step. */
  @IsOptional()
  @Transform(toBoolean)
  @IsBoolean()
  isPublished?: boolean;

  @ApiPropertyOptional({ type: 'string', format: 'binary', description: 'PNG or JPG, max 3 MB' })
  picture?: unknown;
}
