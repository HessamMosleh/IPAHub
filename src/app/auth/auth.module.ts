import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { CacheModule } from '@nestjs/cache-manager';
import { MongooseModule } from '@nestjs/mongoose';
import { OtpChallenge, OtpChallengeSchema } from './otp-challenge.schema';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { TokenStore } from './token-store';
import { LocalStrategy } from './strategies/local.strategy';
import { JwtStrategy } from './strategies/jwt.strategy';
import { UserModule } from '../user/user.module';
import { SmsSender } from './sms.stub';

@Module({
  imports: [
    PassportModule,
    UserModule,
    CacheModule.register(),
    MongooseModule.forFeature([
      { name: OtpChallenge.name, schema: OtpChallengeSchema },
    ]),
    JwtModule.registerAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => ({
        secret: configService.getOrThrow<string>('JWT_ACCESS_SECRET'),
        signOptions: {
          expiresIn: configService.getOrThrow<string>('JWT_ACCESS_EXPIRES_IN'),
        } as any,
      }),
      inject: [ConfigService],
    }),
  ],
  controllers: [AuthController],
  providers: [AuthService, TokenStore, LocalStrategy, JwtStrategy, SmsSender],
  exports: [AuthService, JwtModule],
})
export class AuthModule {}
