import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy } from 'passport-local';
import { User, UserProp } from '../../user/user.schema';
import { UserService } from '../../user/user.service';
import { translate } from '../../../common/utils/translate';

@Injectable()
export class LocalStrategy extends PassportStrategy(Strategy) {
  constructor(private readonly userService: UserService) {
    super({ usernameField: 'mobile', passwordField: 'password' });
  }

  async validate(mobile: string, password: string): Promise<User> {
    const user = await this.userService.findOne({ mobile }, [
      ...UserProp.admin,
      '+password',
    ]);
    if (!user) {
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
