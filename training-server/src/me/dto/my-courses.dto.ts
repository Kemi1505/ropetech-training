import { IsIn, IsOptional } from 'class-validator';
import { PaginationDto } from '../../common/pagination.dto';

export const MY_COURSE_FILTERS = ['all', 'in-progress', 'completed'] as const;
export type MyCourseFilter = (typeof MY_COURSE_FILTERS)[number];

export class MyCoursesDto extends PaginationDto {
  @IsOptional()
  @IsIn(MY_COURSE_FILTERS)
  filter?: MyCourseFilter;
}
