import { Transform, Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';
import { trim } from '../../common/transforms';
import { LessonType } from '../../generated/enums';

export class SectionDto {
  @Transform(trim)
  @IsString()
  @MinLength(2)
  @MaxLength(150)
  title!: string;
}

/** Step 1 of adding a lesson: ask for a place to upload the file. */
export class UploadUrlDto {
  @IsEnum(LessonType)
  type!: LessonType;

  @Transform(trim)
  @IsString()
  @MaxLength(200)
  fileName!: string;

  @IsString()
  @MaxLength(100)
  contentType!: string;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(2_000_000_000)
  size!: number;
}

/** Step 2: after the browser finished uploading, register the lesson. */
export class CreateLessonDto {
  @Transform(trim)
  @IsString()
  @MinLength(2)
  @MaxLength(150)
  title!: string;

  @IsEnum(LessonType)
  type!: LessonType;

  @IsString()
  @MaxLength(300)
  fileKey!: string;

  @Transform(trim)
  @IsString()
  @MaxLength(200)
  fileName!: string;
}

export class UpdateLessonDto {
  @IsOptional()
  @Transform(trim)
  @IsString()
  @MinLength(2)
  @MaxLength(150)
  title?: string;
}

export class MoveLessonDto {
  @IsUUID()
  sectionId!: string;

  /** 1 = first. Omit to put it at the end. */
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  position?: number;
}

/** The complete list of ids in the new order. */
export class ReorderDto {
  @IsArray()
  @ArrayMinSize(1)
  @IsUUID('all', { each: true })
  ids!: string[];
}
