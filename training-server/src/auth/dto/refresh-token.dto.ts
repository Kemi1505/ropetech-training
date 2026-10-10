import { IsOptional, IsString } from 'class-validator';

export class RefreshTokenDto {
  /** Optional: the refresh_token cookie is used when this is omitted */
  @IsOptional()
  @IsString()
  refreshToken?: string;
}
