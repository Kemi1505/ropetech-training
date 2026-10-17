import { IsEnum, IsOptional } from 'class-validator';
import { PaginationDto } from '../../common/pagination.dto';
import { Difficulty } from '../../generated/enums';

export class ListCoursesDto extends PaginationDto {
  @IsOptional()
  @IsEnum(Difficulty)
  difficulty?: Difficulty;
}
