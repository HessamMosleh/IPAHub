import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { UserRole } from '../../app/user/user.schema';
import { ROLES_KEY } from '../decorators/roles.decorator';
import { translate } from '../utils/translate';
import type { AuthenticatedUser } from '../../app/auth/types';

/**
 * Guard that verifies if the authenticated user possesses at least one of the
 * required UserRoles specified by the @Roles(...) decorator.
 *
 * A user with SUPER_ADMIN role passes automatically.
 */
@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<UserRole[]>(
      ROLES_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (!requiredRoles || requiredRoles.length === 0) {
      return true;
    }

    const req = context
      .switchToHttp()
      .getRequest<{ user?: AuthenticatedUser }>();
    const user = req.user;
    if (!user || !user.roles || !Array.isArray(user.roles)) {
      throw new ForbiddenException(translate('errors.FORBIDDEN_RESOURCE'));
    }

    if (user.roles.includes(UserRole.SUPER_ADMIN)) {
      return true;
    }

    const hasRole = requiredRoles.some((role) => user.roles.includes(role));
    if (!hasRole) {
      throw new ForbiddenException(translate('errors.FORBIDDEN_RESOURCE'));
    }

    return true;
  }
}
