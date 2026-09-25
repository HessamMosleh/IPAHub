import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { randomInt, randomUUID } from 'crypto';
import * as bcrypt from 'bcryptjs';
import { User, UserRole } from '../user/user.schema';
import { UserService } from '../user/user.service';
import { TokenStore } from './token-store';
import { JwtAccessPayload, JwtRefreshPayload } from './types';
import { translate } from '../../common/utils/translate';
import { OtpChallenge, OtpPurpose } from './otp-challenge.schema';
import { VerifyOtpDto } from './dtos/otp.dto';
import { parseFixedOtps } from './otp-fixed';
import { otpMessage, SmsSender } from './sms.stub';
import { foldDigits } from '../../common/utils/digit.util';
import { toInternationalMobile } from '../../common/utils/mobile.util';

const OTP_TTL_MS = 2 * 60 * 1000;
const MAX_ATTEMPTS = 5;
const SEND_WINDOW_MS = 10 * 60 * 1000;
const MAX_SENDS_PER_WINDOW = 3;
const HASH_ROUNDS = 10;

const ADMIN_ROLES = new Set([
  UserRole.ADMIN,
  UserRole.SUPER_ADMIN,
  UserRole.PROVINCE_ADMIN,
]);

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
  private readonly fixedOtps: Map<string, string>;

  constructor(
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly tokenStore: TokenStore,
    private readonly userService: UserService,
    private readonly smsSender: SmsSender,
    @InjectModel(OtpChallenge.name)
    private readonly otpChallengeModel: Model<OtpChallenge>,
  ) {
    const accessString = configService.getOrThrow<string>(
      'JWT_ACCESS_EXPIRES_IN',
    );
    const refreshString = configService.getOrThrow<string>(
      'JWT_REFRESH_EXPIRES_IN',
    );
    this.accessTtlMs = this.parseExpiryMs(accessString);
    this.refreshTtlMs = this.parseExpiryMs(refreshString);
    this.fixedOtps = parseFixedOtps(
      configService.get<string>('TEST_OTP_NUMBERS'),
    );
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

  async revokeCurrentAccess(jti: string): Promise<void> {
    await this.tokenStore.revokeAccess(jti);
  }

  async requestOtp(
    mobile: string,
    purpose: OtpPurpose,
  ): Promise<{ sent: true }> {
    const international = toInternationalMobile(mobile);

    if (purpose === OtpPurpose.LOGIN) {
      const user = await this.userService.findByMobileOptional(international);
      if (!user) {
        throw new NotFoundException(translate('errors.USER_NOT_FOUND'));
      }
      this.assertMemberOnly(user);
    } else if (purpose === OtpPurpose.REGISTER) {
      const existing = await this.userService.findByMobileOptional(international);
      if (existing) {
        throw new BadRequestException(translate('errors.MOBILE_EXISTS'));
      }
    }

    const since = new Date(Date.now() - SEND_WINDOW_MS);
    const recent = await this.otpChallengeModel.countDocuments({
      mobile: international,
      createdAt: { $gt: since },
    });
    if (recent >= MAX_SENDS_PER_WINDOW) {
      throw new BadRequestException(translate('errors.OTP_RATE_LIMITED'));
    }

    const fixed = this.fixedOtps.get(international);
    const code = fixed ?? this.generateOtp();
    const codeHash = await bcrypt.hash(code, HASH_ROUNDS);

    await this.otpChallengeModel.create({
      mobile: international,
      codeHash,
      purpose,
      attempts: 0,
      expiresAt: new Date(Date.now() + OTP_TTL_MS),
    });

    // Fixed codes are never logged/sent — see otp-fixed.ts rationale in CA.
    if (!fixed) {
      await this.smsSender.send(international, otpMessage(code));
    }

    return { sent: true };
  }

  async verifyOtp(dto: VerifyOtpDto): Promise<AuthTokens> {
    const mobile = toInternationalMobile(dto.mobile);
    const code = foldDigits(dto.code).trim();

    await this.consumeOtpChallenge(mobile, code, dto.purpose);

    if (dto.purpose === OtpPurpose.LOGIN) {
      const user = await this.userService.findOne({ mobile });
      this.assertMemberOnly(user);
      if (!user.mobileVerifiedAt) {
        await this.userService.markMobileVerified(this.userIdStr(user));
      }
      return this.login(user);
    }

    // REGISTER
    const user = await this.userService.registerMember({
      mobile,
      nationalCode: foldDigits(dto.nationalCode!).trim(),
      fullName: dto.fullName!.trim(),
      latinFullName: dto.latinFullName!.trim(),
      province: dto.province!,
    });
    return this.login(user);
  }

  generateOtp(): string {
    const maxAttempts = 32;
    for (let i = 0; i < maxAttempts; i++) {
      const code = randomInt(10000, 100000).toString();
      if (this.isVanity(code)) return code;
    }
    return randomInt(10000, 100000).toString();
  }

  private async consumeOtpChallenge(
    mobile: string,
    code: string,
    purpose: OtpPurpose,
  ): Promise<void> {
    const challenge = await this.otpChallengeModel
      .findOne({
        mobile,
        purpose,
        consumedAt: null,
        expiresAt: { $gt: new Date() },
      })
      .sort({ createdAt: -1 })
      .exec();

    if (!challenge) {
      throw new UnauthorizedException(translate('errors.OTP_EXPIRED'));
    }

    if (challenge.attempts >= MAX_ATTEMPTS) {
      throw new UnauthorizedException(translate('errors.OTP_TOO_MANY_ATTEMPTS'));
    }

    const match = await bcrypt.compare(code, challenge.codeHash);
    challenge.attempts += 1;
    if (match) {
      challenge.consumedAt = new Date();
    }
    await challenge.save();

    if (!match) {
      throw new UnauthorizedException(translate('errors.OTP_INVALID'));
    }
  }

  private assertMemberOnly(user: User): void {
    const roles = user.roles ?? [];
    if (roles.some((r) => ADMIN_ROLES.has(r))) {
      throw new ForbiddenException(translate('errors.OTP_ADMIN_NOT_ALLOWED'));
    }
  }

  private userIdStr(user: User): string {
    return user._id.toString();
  }

  private buildAccessPayload(user: User, jti: string): JwtAccessPayload {
    return {
      sub: this.userIdStr(user),
      mobile: user.mobile,
      roles: user.roles && user.roles.length > 0 ? user.roles : [UserRole.USER],
      province: user.province?.toString?.() ?? String(user.province),
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
