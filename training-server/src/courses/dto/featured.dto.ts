import { IsBoolean } from 'class-validator';

export class FeaturedDto {
  @IsBoolean()
  isFeatured!: boolean;
}
