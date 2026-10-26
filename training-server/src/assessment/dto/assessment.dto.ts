import { PartialType } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsBoolean,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  MaxLength,
  Min,
  MinLength,
  ValidateNested,
} from 'class-validator';
import { trim } from '../../common/transforms';

export class OptionDto {
  @Transform(trim)
  @IsString()
  @IsNotEmpty()
  @MaxLength(300)
  text!: string;

  @IsBoolean()
  isCorrect!: boolean;
}

export class CreateQuestionDto {
  @Transform(trim)
  @IsString()
  @MinLength(3)
  @MaxLength(1000)
  text!: string;

  /** 2 to 6 options, exactly one with isCorrect: true */
  @IsArray()
  @ArrayMinSize(2)
  @ArrayMaxSize(6)
  @ValidateNested({ each: true })
  @Type(() => OptionDto)
  options!: OptionDto[];
}

/** Send only what changes. If you send options, send the complete new list (it replaces the old one). */
export class UpdateQuestionDto extends PartialType(CreateQuestionDto) {}

export class FinishAssessmentDto {
  /** Percent of questions a learner must get right, 1-100 */
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  passMark!: number;

  /** Attempts each learner gets (1-20). Omit to keep the current value (5 by default). */
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(20)
  maxAttempts?: number;

  /** Default true: publish the course too. false: save the pass mark and leave the publish state alone. */
  @IsOptional()
  @IsBoolean()
  publish?: boolean;
}

export class AnswerDto {
  @IsUUID()
  questionId!: string;

  @IsUUID()
  optionId!: string;
}

export class SubmitAssessmentDto {
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(200)
  @ValidateNested({ each: true })
  @Type(() => AnswerDto)
  answers!: AnswerDto[];
}
