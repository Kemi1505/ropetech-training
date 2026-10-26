import { Transform } from 'class-transformer';
import { IsBoolean, IsEnum, IsIn, IsOptional, IsString, MaxLength } from 'class-validator';
import { PaginationDto } from '../../common/pagination.dto';
import { toBoolean, trim } from '../../common/transforms';
import { Difficulty } from '../../generated/enums';

export const COURSE_STATUSES = ['DRAFT', 'PUBLISHED', 'UNPUBLISHED'] as const;
export type CourseStatus = (typeof COURSE_STATUSES)[number];

export class ListCoursesDto extends PaginationDto {
  @IsOptional()
  @IsEnum(Difficulty)
  difficulty?: Difficulty;

  /** Matches the course name or short description */
  @IsOptional()
  @Transform(trim)
  @IsString()
  @MaxLength(100)
  search?: string;

  /** ?featured=true returns the admin-chosen featured courses, topped up with the newest */
  @IsOptional()
  @Transform(toBoolean)
  @IsBoolean()
  featured?: boolean;
}

export class AdminListCoursesDto extends ListCoursesDto {
  @IsOptional()
  @IsIn(COURSE_STATUSES)
  status?: CourseStatus;
}
