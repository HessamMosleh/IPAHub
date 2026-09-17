import { SetMetadata } from '@nestjs/common';
import { UserRole } from '../../app/user/user.schema';

export const ROLES_KEY = 'roles';

/**
 * Attaches the required UserRoles to an endpoint handler or controller class.
 * Checked by RolesGuard.
 */
export const Roles = (...roles: UserRole[]) => SetMetadata(ROLES_KEY, roles);
