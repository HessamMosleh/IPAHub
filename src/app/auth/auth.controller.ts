import {
  Body,
  Controller,
  Post,
  Req,
  UnauthorizedException,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiBody,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';
import { AuthService, AuthTokens } from './auth.service';
import { AuthTokensDto } from './dtos/auth-tokens.dto';
import { LoginDto, OtpLoginDto } from './dtos/login.dto';
import { RefreshTokenDto } from './dtos/refresh-token.dto';
import type { AuthenticatedUser } from './types';
import { User } from '../user/user.schema';
import { GetUser } from './decorators/get-user.decorator';
import { translate } from '../../common/utils/translate';

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @UseGuards(AuthGuard('local'))
  @Post('login')
  @ApiOperation({ summary: 'Login with mobile and password' })
  @ApiBody({ type: LoginDto })
  @ApiOkResponse({ type: AuthTokensDto })
  @ApiUnauthorizedResponse({ description: 'Invalid credentials' })
  async login(@Req() req: { user: User }): Promise<AuthTokens> {
    return this.authService.login(req.user);
  }

  @Post('otp')
  @ApiOperation({ summary: 'Request an OTP code for a mobile number' })
  @ApiOkResponse({
    schema: {
      type: 'object',
      properties: { sent: { type: 'boolean', example: true } },
    },
  })
  async requestOtp(@Body() dto: OtpLoginDto): Promise<{ sent: true }> {
    return this.authService.requestOtp(dto.mobile);
  }

  @Post('refresh')
  @ApiOperation({ summary: 'Rotate access and refresh tokens' })
  @ApiOkResponse({ type: AuthTokensDto })
  @ApiUnauthorizedResponse({ description: 'Invalid or revoked refresh token' })
  async refresh(@Body() dto: RefreshTokenDto): Promise<AuthTokens> {
    return this.authService.refreshAccessToken(dto.refreshToken);
  }

  @UseGuards(AuthGuard('jwt'))
  @Post('logout')
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Logout and revoke the current session' })
  @ApiOkResponse({
    schema: {
      type: 'object',
      properties: { revoked: { type: 'boolean', example: true } },
    },
  })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid access token' })
  async logout(
    @Body() dto: RefreshTokenDto,
    @GetUser() user: AuthenticatedUser,
  ): Promise<{ revoked: true }> {
    if (!user?.jti) {
      throw new UnauthorizedException(translate('errors.MISSING_SESSION'));
    }

    await this.authService.revokeCurrentAccess(user.jti);
    return this.authService.logout(dto.refreshToken);
  }
}
