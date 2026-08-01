import { Controller, Post, Body, UseGuards, UnauthorizedException, Res } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { Response } from 'express';
import { MfaService } from './mfa.service';
import { AuthService } from '../auth/auth.service';
import { AuthGuard } from '@nestjs/passport';
import { GetUser } from '../auth/decorators/get-user.decorator';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { SSO_COOKIE_NAME, SSO_COOKIE_OPTIONS } from '../auth/sso-cookie.config';

@ApiTags('MFA')
@Controller('auth/mfa')
export class MfaController {
  constructor(
    private mfaService: MfaService,
    private authService: AuthService,
  ) {}

  @Post('generate')
  @UseGuards(AuthGuard(['mfa-temp', 'jwt']))
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Generate MFA secret and QR code' })
  async generate(@GetUser() user: any) {
    // user.userId might be available directly on user object depending on strategy return
    const userId = user.userId || user.sub;
    const { secret, otpAuthUrl } = await this.mfaService.generateMfaSecret(userId);
    const qrCode = await this.mfaService.generateQrCode(otpAuthUrl);
    return {
      secret,
      qrCode,
    };
  }

  @Post('enable')
  @UseGuards(AuthGuard(['mfa-temp', 'jwt']))
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Enable MFA with a valid token' })
  async enable(@GetUser() user: any, @Body() body: { code: string }) {
    const userId = user.userId || user.sub;
    return this.mfaService.enableMfa(userId, body.code);
  }

  @Post('disable')
  // Only fully authenticated users (JWT) can disable MFA from settings
  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Disable MFA' })
  async disable(@GetUser() user: any) {
    return this.mfaService.disableMfa(user.userId);
  }

  @Throttle({ default: { limit: 5, ttl: 60000 } })
  @Post('verify-login')
  @ApiOperation({ summary: 'Verify MFA code during login' })
  async verifyLogin(
    @Body() body: { tempToken: string; code: string },
    @Res({ passthrough: true }) res: Response,
  ) {
    let payload;
    try {
      payload = await this.authService.verifyToken(body.tempToken);
    } catch {
      throw new UnauthorizedException('Invalid or expired token');
    }

    if (payload.type !== 'mfa_temp') {
      throw new UnauthorizedException('Invalid token type');
    }

    // Reject already-used temp tokens
    if (await this.authService.isTokenRevoked(payload.userId, payload.iat)) {
      throw new UnauthorizedException('Token has already been used');
    }

    const isValid = await this.mfaService.verifyMfaToken(payload.userId, body.code);
    if (!isValid) throw new UnauthorizedException('Invalid MFA code');

    // Invalidate temp token to prevent reuse within the 5-minute window
    await this.authService.revokeToken(body.tempToken);

    const access_token = await this.authService.generateDashboardToken(
      payload.userId,
    );

    // SSO Cookie after successful MFA
    res.cookie(SSO_COOKIE_NAME, access_token, SSO_COOKIE_OPTIONS);

    const user = await this.mfaService.getUserForResponse(payload.userId);
    return { access_token, user };
  }

  @Post('setup-complete')
  @ApiOperation({ summary: 'Enable MFA + create session in one atomic operation (first-time setup)' })
  async setupComplete(
    @Body() body: { tempToken: string; code: string },
    @Res({ passthrough: true }) res: Response,
  ) {
    let payload;
    try {
      payload = await this.authService.verifyToken(body.tempToken);
    } catch {
      throw new UnauthorizedException('Invalid or expired token');
    }

    if (payload.type !== 'mfa_temp') {
      throw new UnauthorizedException('Invalid token type');
    }

    // Reject already-used temp tokens
    if (await this.authService.isTokenRevoked(payload.userId, payload.iat)) {
      throw new UnauthorizedException('Token has already been used');
    }

    // 1. Enable MFA (validates the code internally)
    await this.mfaService.enableMfa(payload.userId, body.code);

    // 2. Invalidate temp token to prevent reuse
    await this.authService.revokeToken(body.tempToken);

    // 3. Generate session token
    const access_token = await this.authService.generateDashboardToken(
      payload.userId,
    );

    // 4. SSO Cookie
    res.cookie(SSO_COOKIE_NAME, access_token, SSO_COOKIE_OPTIONS);

    const user = await this.mfaService.getUserForResponse(payload.userId);
    return { access_token, user };
  }
}
