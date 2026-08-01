import {
  Controller,
  Post,
  Get,
  Body,
  UnauthorizedException,
  HttpCode,
  HttpStatus,
  UseGuards,
  Req,
  Res,
} from '@nestjs/common';
import { Response, Request } from 'express';
import { Throttle } from '@nestjs/throttler';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { ChangePasswordDto } from './dto/change-password.dto';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from './jwt-auth.guard';
import { TokenTypeGuard } from './guards/token-type.guard';
import { TokenType } from './decorators/token-type.decorator';
import { SystemAuditService } from '../system-audit/system-audit.service';
import { IpAddress } from '../common/decorators/ip-address.decorator';
import { UserAgent } from '../common/decorators/user-agent.decorator';
import { SSO_COOKIE_NAME, SSO_COOKIE_OPTIONS } from './sso-cookie.config';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly auditService: SystemAuditService,
  ) { }

  @Throttle({ default: { limit: 10, ttl: 60000 } })
  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Login user to dashboard' })
  @ApiResponse({ status: 200, description: 'Login successful' })
  @ApiResponse({ status: 401, description: 'Invalid credentials' })
  async login(
    @Body() loginDto: LoginDto,
    @IpAddress() ipAddress: string,
    @UserAgent() userAgent: string,
    @Res({ passthrough: true }) res: Response,
  ) {
    let user;
    try {
      user = await this.authService.validateUser(loginDto.email, loginDto.password);
    } catch (e) {
      // Re-throw (e.g. account locked) after logging
      await this.auditService.log(
        'anonymous',
        {
          action: 'LOGIN_FAILED',
          resourceType: 'User',
          details: { identifier: loginDto.email, reason: e.message },
        },
        ipAddress,
        userAgent,
      );
      throw e;
    }

    if (!user) {
      await this.auditService.log(
        'anonymous',
        {
          action: 'LOGIN_FAILED',
          resourceType: 'User',
          details: { identifier: loginDto.email, reason: 'Invalid credentials' },
        },
        ipAddress,
        userAgent,
      );
      throw new UnauthorizedException('Invalid credentials');
    }

    await this.auditService.log(
      user.id,
      {
        action: 'USER_LOGIN',
        resourceId: user.id,
        resourceType: 'User',
        details: { identifier: user.identifier },
      },
      ipAddress,
      userAgent,
    );

    const result = await this.authService.login(user);

    // SSO Cookie: only when we have a final access_token (not MFA temp)
    if (result.access_token) {
      res.cookie(SSO_COOKIE_NAME, result.access_token, SSO_COOKIE_OPTIONS);
    }

    return result;
  }



  @Post('renew-token')
  @UseGuards(JwtAuthGuard, TokenTypeGuard)
  @TokenType('device')
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Renew device token' })
  async renewToken(@Req() req: any) {
    const currentToken = req.headers.authorization?.replace('Bearer ', '');
    if (!currentToken) throw new UnauthorizedException('No token provided');
    const newToken = await this.authService.renewDeviceToken(currentToken);
    if (newToken) return { renewed: true, access_token: newToken };
    return { renewed: false, message: 'Token does not need renewal yet' };
  }

  // High rate limit: this endpoint is called internally by the Next.js middleware
  // on EVERY request (including RSC prefetches). 30/min was exhausted in ~3 seconds.
  @Throttle({ default: { limit: 300, ttl: 60000 } })
  @Get('validate-cookie')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Validates the SSO session cookie and returns current user' })
  @ApiResponse({ status: 200, description: 'Cookie valid -- returns user payload' })
  @ApiResponse({ status: 401, description: 'Cookie missing or invalid' })
  async validateCookie(@Req() req: Request) {
    const token = req.cookies?.[SSO_COOKIE_NAME];
    if (!token) throw new UnauthorizedException('No session cookie');

    try {
      const payload = await this.authService.verifyToken(token);
      if (payload.type !== 'user') throw new UnauthorizedException('Invalid token type');

      // Blacklist check: JwtStrategy is not invoked here, must verify manually
      const isRevoked = await this.authService.isTokenRevoked(payload.userId, payload.iat!);
      if (isRevoked) throw new UnauthorizedException('Token has been revoked');

      const user = await this.authService.getUserById(payload.userId);

      return {
        valid: true,
        userId: payload.userId,
        role: payload.role,
        email: user?.identifier ?? '',
        isMfaEnabled: user?.isMfaEnabled ?? false,
      };
    } catch {
      throw new UnauthorizedException('Session expired or invalid');
    }
  }


  // SSO: Logout -- revokes the token in Redis AND clears the cookie
  @Throttle({ default: { limit: 5, ttl: 60000 } }) // 5 req/min -- prevents logout spam
  @Post('logout')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Logout -- revokes token in Redis and clears SSO cookie' })
  async logout(@Req() req: Request, @Res({ passthrough: true }) res: Response) {
    // Extract token from cookie or header to revoke it
    const token =
      req.cookies?.[SSO_COOKIE_NAME] ||
      req.headers?.authorization?.replace('Bearer ', '');

    if (token) {
      await this.authService.revokeToken(token);
    }

    res.clearCookie(SSO_COOKIE_NAME, {
      ...SSO_COOKIE_OPTIONS,
      maxAge: 0,
    });
    return { message: 'Logged out successfully' };
  }

  @Throttle({ default: { limit: 3, ttl: 60000 } }) // Max 3 emails per minute per IP
  @Post('forgot-password')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Generates a password reset token' })
  async forgotPassword(@Body() dto: ForgotPasswordDto) {
    await this.authService.forgotPassword(dto.email);
    return { message: 'If an account matches, a reset link has been formally sent' };
  }

  @Throttle({ default: { limit: 5, ttl: 60000 } })
  @Post('reset-password')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Resets the password publicly using the token' })
  async resetPassword(@Body() dto: ResetPasswordDto) {
    await this.authService.resetPassword(dto.token, dto.newPassword);
    return { message: 'Password reset successfully' };
  }

  @Post('change-password')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Changes the password of a currently logged-in user' })
  async changePassword(
    @Req() req: any,
    @Body() dto: ChangePasswordDto,
    @IpAddress() ipAddress: string,
    @UserAgent() userAgent: string,
  ) {
    await this.authService.changePassword(req.user.userId, dto.oldPassword, dto.newPassword);

    // Log the change
    await this.auditService.log(
      req.user.userId,
      {
        action: 'PASSWORD_CHANGE',
        resourceId: req.user.userId,
        resourceType: 'User',
        details: {},
      },
      ipAddress,
      userAgent,
    );

    return { message: 'Password changed successfully' };
  }
}
