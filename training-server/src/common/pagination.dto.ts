import { Type } from 'class-transformer';
import { IsInt, IsOptional, Max, Min } from 'class-validator';

export class PaginationDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page: number = 1;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit: number = 20;
}

export const pageArgs = (p: PaginationDto) => ({ skip: (p.page - 1) * p.limit, take: p.limit });

export const pageMeta = (p: PaginationDto, total: number) => ({
  page: p.page,
  limit: p.limit,
  total,
  totalPages: Math.ceil(total / p.limit),
});
