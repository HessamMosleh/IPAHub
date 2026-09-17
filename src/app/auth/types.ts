import { UserRole } from '../user/user.schema';

export interface JwtAccessPayload {
  sub: string; // user id
  mobile: string;
  roles: UserRole[];
  province: string;
  jti: string; // token id, used for revocation lookup
  type: 'access';
}

export interface JwtRefreshPayload {
  sub: string;
  jti: string;
  type: 'refresh';
}

/** Shape attached to `req.user` by JwtStrategy after a successful access-token validation. */
export interface AuthenticatedUser {
  id: string;
  mobile: string;
  roles: UserRole[];
  province: string;
  managedProvinces?: string[];
  jti: string;
}
