import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { AuthenticatedUser } from '../types';

/**
 * Extracts the authenticated user from the request (set by JwtStrategy).
 *
 * Usage on protected routes:
 *   @GetUser() user: AuthenticatedUser
 *   @GetUser('jti') jti: string
 */
export const GetUser = createParamDecorator(
  (
    data: keyof AuthenticatedUser | undefined,
    ctx: ExecutionContext,
  ): AuthenticatedUser | AuthenticatedUser[keyof AuthenticatedUser] => {
    const request = ctx
      .switchToHttp()
      .getRequest<{ user: AuthenticatedUser }>();
    const user = request.user;

    return data ? user?.[data] : user;
  },
);
