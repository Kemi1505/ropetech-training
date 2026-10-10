import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Role } from '../../generated/enums';
import { ROLES_KEY } from '../decorators/roles.decorator';
import { AuthUser } from '../types';

// Hierarchy: a higher level can do everything a lower level can.
const LEVEL: Record<Role, number> = {
  USER: 1,
  ADMIN: 2,
  SUPERADMIN: 3,
};

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const required = this.reflector.getAllAndOverride<Role[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (!required?.length) return true; // no @Roles() -> any authenticated user

    const { user } = context.switchToHttp().getRequest<{ user?: AuthUser }>();
    if (!user) throw new ForbiddenException("You don't have sufficient permissions");

    const minRequired = Math.min(...required.map((r) => LEVEL[r]));
    if (LEVEL[user.role] >= minRequired) return true;

    throw new ForbiddenException("You don't have sufficient permissions");
  }
}
