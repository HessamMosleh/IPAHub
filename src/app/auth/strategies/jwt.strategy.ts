import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy, ExtractJwt } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { UserService } from '../../user/user.service';
import { UserProp } from '../../user/user.schema';
import { TokenStore } from '../token-store';
import { JwtAccessPayload } from '../types';
import { translate } from '../../../common/utils/translate';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy, 'jwt') {
  constructor(
    private readonly configService: ConfigService,
    private readonly userService: UserService,
    private readonly tokenStore: TokenStore,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: configService.getOrThrow<string>('JWT_ACCESS_SECRET'),
    });
  }

  async validate(payload: JwtAccessPayload) {
    if (payload.type !== 'access') {
      throw new UnauthorizedException(translate('errors.INVALID_TOKEN_TYPE'));
    }

    // Cache check: if the jti was revoked (logout), reject the request.
    if (!payload.jti || !(await this.tokenStore.isAccessValid(payload.jti))) {
      throw new UnauthorizedException(translate('errors.TOKEN_REVOKED'));
    }

    const user = await this.userService.findOne(
      { _id: payload.sub },
      UserProp.admin,
    );

    return {
      id: user._id.toString(),
      mobile: payload.mobile,
      roles: payload.roles,
      province: user.province ? user.province.toString() : undefined,
      managedProvinces: Array.isArray(user.managedProvinces)
        ? user.managedProvinces.map((p) => (p as any).toString())
        : [],
      jti: payload.jti,
    };
  }
}
