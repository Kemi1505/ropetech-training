import { SetMetadata } from '@nestjs/common';
import { Role } from '../../generated/enums';

export const ROLES_KEY = 'roles';
/** "This role or higher" (SUPERADMIN > ADMIN > USER). */
export const Roles = (...roles: Role[]) => SetMetadata(ROLES_KEY, roles);
