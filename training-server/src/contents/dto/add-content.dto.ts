import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsOptional, IsString, MaxLength } from 'class-validator';
import { trim } from '../../common/transforms';

export class AddContentDto {
  /** Defaults to the file name */
  @IsOptional()
  @Transform(trim)
  @IsString()
  @MaxLength(150)
  title?: string;

  @ApiProperty({ type: 'string', format: 'binary', description: 'PDF, PPTX or PNG, max 25 MB' })
  file: unknown;
}
