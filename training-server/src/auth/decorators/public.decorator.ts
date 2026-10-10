import { SetMetadata } from '@nestjs/common';

export const IS_PUBLIC_KEY = 'isPublic';
/** Skips JwtAuthGuard. Everything is protected by default. */
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);
