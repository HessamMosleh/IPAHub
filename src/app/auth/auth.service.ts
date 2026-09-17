import { Inject, Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import type { Cache } from 'cache-manager';
import { randomInt, randomUUID } from 'crypto';
import { User, UserRole } from '../user/user.schema';
import { UserService } from '../user/user.service';
import { TokenStore } from './token-store';
import { JwtAccessPayload, JwtRefreshPayload } from './types';
import { translate } from '../../common/utils/translate';

const OTP_CACHE_PREFIX = 'auth:otp:';
const OTP_TTL_MS = 2 * 60 * 1000;

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  accessTokenExpiresIn: string;
  refreshTokenExpiresIn: string;
}

@Injectable()
export class AuthService {
  private readonly accessTtlMs: number;
  private readonly refreshTtlMs: number;

  constructor(
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly tokenStore: TokenStore,
    private readonly userService: UserService,
    @Inject(CACHE_MANAGER) private readonly cache: Cache,
  ) {
    const accessString = configService.getOrThrow<string>(
      'JWT_ACCESS_EXPIRES_IN',
    );
    const refreshString = configService.getOrThrow<string>(
      'JWT_REFRESH_EXPIRES_IN',
    );
    this.accessTtlMs = this.parseExpiryMs(accessString);
    this.refreshTtlMs = this.parseExpiryMs(refreshString);
  }

  async login(user: User): Promise<AuthTokens> {
    return this.issueTokens(user);
  }

  async refreshAccessToken(refreshToken: string): Promise<AuthTokens> {
    let payload: JwtRefreshPayload;
    try {
      payload = await this.jwtService.verifyAsync<JwtRefreshPayload>(
        refreshToken,
        {
          secret: this.configService.getOrThrow<string>('JWT_REFRESH_SECRET'),
        },
      );
    } catch {
      // Signature/expiry failure — drop any cached pair we can decode.
      const decoded = this.jwtService.decode(refreshToken);
      if (decoded?.jti) {
        await this.tokenStore.revokeRefresh(decoded.jti);
      }
      throw new UnauthorizedException(
        translate('errors.INVALID_REFRESH_TOKEN'),
      );
    }

    if (
      payload.type !== 'refresh' ||
      !(await this.tokenStore.isRefreshValid(payload.jti))
    ) {
      throw new UnauthorizedException(
        translate('errors.REFRESH_TOKEN_REVOKED'),
      );
    }

    // Rotate: revoke the old session pair, then issue fresh tokens.
    await this.tokenStore.revokeRefresh(payload.jti);

    const user = await this.buildUserFromRefresh(payload.sub);
    return this.issueTokens(user);
  }

  async logout(refreshToken: string): Promise<{ revoked: true }> {
    const decoded = this.jwtService.decode(refreshToken);

    if (decoded?.jti) {
      await this.tokenStore.revokeRefresh(decoded.jti);
    }

    return { revoked: true };
  }

  /**
   * Revoke the access token identified by its jti — the jti is what the
   * authenticated `req.user` carries. Also drops the paired refresh token.
   */
  async revokeCurrentAccess(jti: string): Promise<void> {
    await this.tokenStore.revokeAccess(jti);
  }

  async requestOtp(mobile: string): Promise<{ sent: true }> {
    const code = this.generateOtp();
    await this.cache.set(OTP_CACHE_PREFIX + mobile, code, OTP_TTL_MS);
    return { sent: true };
  }

  generateOtp(): string {
    const maxAttempts = 32;
    for (let i = 0; i < maxAttempts; i++) {
      const code = randomInt(10000, 100000).toString();
      if (this.isVanity(code)) return code;
    }
    return randomInt(10000, 100000).toString();
  }

  private userIdStr(user: User): string {
    return user._id.toString();
  }

  private buildAccessPayload(user: User, jti: string): JwtAccessPayload {
    return {
      sub: this.userIdStr(user),
      mobile: user.mobile,
      roles: user.roles && user.roles.length > 0 ? user.roles : [UserRole.USER],
      province: user.province.toString(),
      jti,
      type: 'access',
    };
  }

  private async buildUserFromRefresh(userId: string): Promise<User> {
    return this.userService.findOne({ _id: userId });
  }

  private async issueTokens(user: User): Promise<AuthTokens> {
    const accessJti = randomUUID();
    const refreshJti = randomUUID();

    const accessPayload = this.buildAccessPayload(user, accessJti);
    const refreshPayload: JwtRefreshPayload = {
      sub: this.userIdStr(user),
      jti: refreshJti,
      type: 'refresh',
    };

    const accessToken = await this.jwtService.signAsync(accessPayload, {
      secret: this.configService.getOrThrow<string>('JWT_ACCESS_SECRET'),
      expiresIn: this.accessTtlMs / 1000,
    });
    const refreshToken = await this.jwtService.signAsync(refreshPayload, {
      secret: this.configService.getOrThrow<string>('JWT_REFRESH_SECRET'),
      expiresIn: this.refreshTtlMs / 1000,
    });

    await this.tokenStore.trackAccessToken(
      accessJti,
      refreshJti,
      this.accessTtlMs,
    );
    await this.tokenStore.trackRefreshToken(
      refreshJti,
      accessJti,
      this.refreshTtlMs,
    );

    return {
      accessToken,
      refreshToken,
      accessTokenExpiresIn: this.configService.getOrThrow<string>(
        'JWT_ACCESS_EXPIRES_IN',
      ),
      refreshTokenExpiresIn: this.configService.getOrThrow<string>(
        'JWT_REFRESH_EXPIRES_IN',
      ),
    };
  }

  private parseExpiryMs(value: string): number {
    const match = /^(\d+)\s*([smhd])$/.exec(value.trim().toLowerCase());
    if (!match) return 0;
    const n = Number(match[1]);
    switch (match[2]) {
      case 's':
        return n * 1000;
      case 'm':
        return n * 60 * 1000;
      case 'h':
        return n * 60 * 60 * 1000;
      case 'd':
        return n * 24 * 60 * 60 * 1000;
      default:
        return 0;
    }
  }

  /**
   * A 5-digit code counts as "vanity" if it's a pattern people find easy
   * to read and type: all-same (11111), a run (12345), a near-run where
   * every step is the same > 1 (24680), a palindrome (13531), or a
   * repeated pair (25252).
   */
  private isVanity(code: string): boolean {
    if (code.length !== 5) return false;
    const digits = code.split('').map(Number);

    const allSame = digits.every((d) => d === digits[0]);
    if (allSame) return true;

    const palindrome = code === code.split('').reverse().join('');
    if (palindrome) return true;

    const deltas = digits.slice(1).map((d, i) => d - digits[i]);
    const isMonotonicRun =
      deltas.every((x) => x === 1) || deltas.every((x) => x === -1);
    if (isMonotonicRun) return true;

    const step = deltas[0];
    if (step !== 0 && Math.abs(step) > 1 && deltas.every((x) => x === step)) {
      return true;
    }

    const pairRepeats = digits[0] === digits[2] && digits[1] === digits[3];
    if (pairRepeats) return true;

    return false;
  }
}
