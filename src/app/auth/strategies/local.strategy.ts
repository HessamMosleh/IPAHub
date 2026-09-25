import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy } from 'passport-local';
import { User, UserProp, UserRole } from '../../user/user.schema';
import { UserService } from '../../user/services/user.service';
import { translate } from '../../../common/utils/translate';
import { toInternationalMobile } from '../../../common/utils/mobile.util';

const ADMIN_ROLES = new Set([
  UserRole.ADMIN,
  UserRole.SUPER_ADMIN,
  UserRole.PROVINCE_ADMIN,
]);

@Injectable()
export class LocalStrategy extends PassportStrategy(Strategy) {
  constructor(private readonly userService: UserService) {
    super({ usernameField: 'mobile', passwordField: 'password' });
  }

  async validate(mobile: string, password: string): Promise<User> {
    const international = toInternationalMobile(mobile);
    const user = await this.userService.findOne({ mobile: international }, [
      ...UserProp.admin,
      '+password',
    ]);
    if (!user) {
      throw new UnauthorizedException(translate('errors.INVALID_CREDENTIALS'));
    }

    const isAdmin = (user.roles ?? []).some((r) => ADMIN_ROLES.has(r));
    if (isAdmin && user.active === false) {
      throw new UnauthorizedException(translate('errors.INVALID_CREDENTIALS'));
    }

    const ok = await this.userService.verifyPassword(password, user.password);
    if (!ok) {
      throw new UnauthorizedException(translate('errors.INVALID_CREDENTIALS'));
    }

    // Strip the password hash before it reaches the request handler.
    user.password = undefined as unknown as string;
    return user;
  }
}
