import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import {
  BadRequestException,
  ForbiddenException,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import * as bcrypt from 'bcryptjs';
import { AuthService } from './auth.service';
import { TokenStore } from './token-store';
import { UserService } from '../user/user.service';
import { OtpChallenge, OtpPurpose } from './otp-challenge.schema';
import { SmsSender } from './sms.stub';
import { UserRole } from '../user/user.schema';

describe('AuthService OTP', () => {
  let service: AuthService;
  let otpModel: {
    countDocuments: jest.Mock;
    create: jest.Mock;
    findOne: jest.Mock;
  };
  let userService: {
    findByMobileOptional: jest.Mock;
    findOne: jest.Mock;
    registerMember: jest.Mock;
    markMobileVerified: jest.Mock;
  };
  let smsSender: { send: jest.Mock };
  let tokenStore: {
    trackAccessToken: jest.Mock;
    trackRefreshToken: jest.Mock;
  };

  const memberUser = {
    _id: { toString: () => 'user1' },
    mobile: '09120000001',
    roles: [UserRole.USER],
    province: { toString: () => 'prov1' },
    mobileVerifiedAt: new Date(),
  };

  const adminUser = {
    ...memberUser,
    roles: [UserRole.ADMIN],
  };

  beforeEach(async () => {
    otpModel = {
      countDocuments: jest.fn().mockResolvedValue(0),
      create: jest.fn().mockResolvedValue({}),
      findOne: jest.fn(),
    };
    userService = {
      findByMobileOptional: jest.fn(),
      findOne: jest.fn(),
      registerMember: jest.fn(),
      markMobileVerified: jest.fn(),
    };
    smsSender = { send: jest.fn().mockResolvedValue(undefined) };
    tokenStore = {
      trackAccessToken: jest.fn().mockResolvedValue(undefined),
      trackRefreshToken: jest.fn().mockResolvedValue(undefined),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        {
          provide: JwtService,
          useValue: {
            signAsync: jest.fn().mockResolvedValue('token'),
            verifyAsync: jest.fn(),
            decode: jest.fn(),
          },
        },
        {
          provide: ConfigService,
          useValue: {
            getOrThrow: (key: string) => {
              const map: Record<string, string> = {
                JWT_ACCESS_EXPIRES_IN: '15m',
                JWT_REFRESH_EXPIRES_IN: '7d',
                JWT_ACCESS_SECRET: 'access-secret-at-least-16',
                JWT_REFRESH_SECRET: 'refresh-secret-at-least-16',
              };
              return map[key];
            },
            get: (key: string) =>
              key === 'TEST_OTP_NUMBERS' ? '09129999999:11111' : undefined,
          },
        },
        { provide: TokenStore, useValue: tokenStore },
        { provide: UserService, useValue: userService },
        { provide: SmsSender, useValue: smsSender },
        { provide: getModelToken(OtpChallenge.name), useValue: otpModel },
      ],
    }).compile();

    service = module.get(AuthService);
  });

  describe('requestOtp', () => {
    it('creates a challenge and sends SMS for login', async () => {
      userService.findByMobileOptional.mockResolvedValue(memberUser);

      await expect(
        service.requestOtp('09120000001', OtpPurpose.LOGIN),
      ).resolves.toEqual({ sent: true });

      expect(otpModel.create).toHaveBeenCalled();
      expect(smsSender.send).toHaveBeenCalled();
    });

    it('does not SMS fixed allowlist numbers', async () => {
      userService.findByMobileOptional.mockResolvedValue({
        ...memberUser,
        mobile: '09129999999',
      });

      await service.requestOtp('09129999999', OtpPurpose.LOGIN);

      expect(otpModel.create).toHaveBeenCalled();
      expect(smsSender.send).not.toHaveBeenCalled();
    });

    it('rejects login OTP when user missing', async () => {
      userService.findByMobileOptional.mockResolvedValue(null);
      await expect(
        service.requestOtp('09120000001', OtpPurpose.LOGIN),
      ).rejects.toBeInstanceOf(NotFoundException);
    });

    it('rejects login OTP for admin roles', async () => {
      userService.findByMobileOptional.mockResolvedValue(adminUser);
      await expect(
        service.requestOtp('09120000001', OtpPurpose.LOGIN),
      ).rejects.toBeInstanceOf(ForbiddenException);
    });

    it('rejects register OTP when mobile exists', async () => {
      userService.findByMobileOptional.mockResolvedValue(memberUser);
      await expect(
        service.requestOtp('09120000001', OtpPurpose.REGISTER),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('rate-limits after too many sends', async () => {
      userService.findByMobileOptional.mockResolvedValue(memberUser);
      otpModel.countDocuments.mockResolvedValue(3);
      await expect(
        service.requestOtp('09120000001', OtpPurpose.LOGIN),
      ).rejects.toBeInstanceOf(BadRequestException);
    });
  });

  describe('verifyOtp', () => {
    function mockChallenge(overrides: Partial<{
      codeHash: string;
      attempts: number;
      save: jest.Mock;
    }> = {}) {
      const save = overrides.save ?? jest.fn().mockResolvedValue(undefined);
      const challenge = {
        codeHash: overrides.codeHash ?? '',
        attempts: overrides.attempts ?? 0,
        consumedAt: null as Date | null,
        save,
      };
      otpModel.findOne.mockReturnValue({
        sort: jest.fn().mockReturnValue({
          exec: jest.fn().mockResolvedValue(challenge),
        }),
      });
      return challenge;
    }

    it('logs in an existing member', async () => {
      const hash = await bcrypt.hash('12345', 10);
      mockChallenge({ codeHash: hash });
      userService.findOne.mockResolvedValue(memberUser);

      const tokens = await service.verifyOtp({
        mobile: '09120000001',
        code: '12345',
        purpose: OtpPurpose.LOGIN,
      });

      expect(tokens.accessToken).toBe('token');
      expect(tokenStore.trackAccessToken).toHaveBeenCalled();
    });

    it('registers a new member', async () => {
      const hash = await bcrypt.hash('12345', 10);
      mockChallenge({ codeHash: hash });
      userService.registerMember.mockResolvedValue(memberUser);

      await service.verifyOtp({
        mobile: '09120000002',
        code: '12345',
        purpose: OtpPurpose.REGISTER,
        nationalCode: '0012345678',
        fullName: 'Ali',
        latinFullName: 'Ali',
        province: '507f1f77bcf86cd799439011',
      });

      expect(userService.registerMember).toHaveBeenCalled();
    });

    it('rejects wrong code', async () => {
      const hash = await bcrypt.hash('12345', 10);
      mockChallenge({ codeHash: hash });

      await expect(
        service.verifyOtp({
          mobile: '09120000001',
          code: '99999',
          purpose: OtpPurpose.LOGIN,
        }),
      ).rejects.toBeInstanceOf(UnauthorizedException);
    });

    it('rejects when no challenge', async () => {
      otpModel.findOne.mockReturnValue({
        sort: jest.fn().mockReturnValue({
          exec: jest.fn().mockResolvedValue(null),
        }),
      });

      await expect(
        service.verifyOtp({
          mobile: '09120000001',
          code: '12345',
          purpose: OtpPurpose.LOGIN,
        }),
      ).rejects.toBeInstanceOf(UnauthorizedException);
    });

    it('rejects after too many attempts', async () => {
      const hash = await bcrypt.hash('12345', 10);
      mockChallenge({ codeHash: hash, attempts: 5 });

      await expect(
        service.verifyOtp({
          mobile: '09120000001',
          code: '12345',
          purpose: OtpPurpose.LOGIN,
        }),
      ).rejects.toBeInstanceOf(UnauthorizedException);
    });
  });
});
