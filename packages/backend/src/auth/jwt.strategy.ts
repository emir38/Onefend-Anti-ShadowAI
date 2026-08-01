import { Injectable, UnauthorizedException, Logger } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { Request } from 'express';
import { JwtPayload } from './auth.service';
import { PrismaService } from '../prisma/prisma.service';
import { RedisService } from '../redis/redis.service';

const SSO_COOKIE_NAME = 'onefend_session';

/**
 * JWT extractor that accepts BOTH:
 *  1. Authorization: Bearer <token>  -- dashboard API calls (axios)
 *  2. Cookie: onefend_session=<token> -- SSO cookie (docs, cross-subdomain)
 *
 * Priority: Bearer header > cookie
 */
function extractJwtFromHeaderOrCookie(req: Request): string | null {
  // 1. Try Bearer header first
  const authHeader = req.headers?.authorization;
  if (authHeader?.startsWith('Bearer ')) {
    return authHeader.substring(7);
  }
  // 2. Fallback: SSO cookie
  return req.cookies?.[SSO_COOKIE_NAME] ?? null;
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  private readonly logger = new Logger(JwtStrategy.name);

  constructor(
    configService: ConfigService,
    private prisma: PrismaService,
    private redis: RedisService,
  ) {
    super({
      jwtFromRequest: extractJwtFromHeaderOrCookie,
      ignoreExpiration: false,
      secretOrKey: configService.get('JWT_SECRET'),
      passReqToCallback: false,
    });
  }

  async validate(payload: JwtPayload): Promise<JwtPayload> {
    if (!payload.sub || !payload.userId) {
      throw new UnauthorizedException('Invalid token payload');
    }

    // Blacklist check: token revoked in Redis
    const blacklistKey = `token:blacklist:${payload.userId}:${payload.iat}`;
    try {
      const isRevoked = await this.redis.get(blacklistKey);
      if (isRevoked) {
        throw new UnauthorizedException('Token has been revoked');
      }
    } catch (error) {
      // If Redis is unavailable, don't block access (fail-open)
      // but log it as a warning
      if (error instanceof UnauthorizedException) throw error;
      this.logger.error('SECURITY: Redis blacklist unavailable -- revoked tokens may be active until natural expiry', error);
    }

    // Device revocation check
    if (payload.type === 'device' && payload.sub) {
      const device = await this.prisma.device.findUnique({
        where: { id: payload.sub },
        select: { isActive: true, revokedAt: true, user: { select: { isActive: true } } },
      });
      if (!device || !device.isActive || device.revokedAt) {
        throw new UnauthorizedException('Device revoked or inactive');
      }
      if (device.user && !device.user.isActive) {
        throw new UnauthorizedException('User account is inactive');
      }
    }

    // Reject MFA temp tokens for general access
    if (payload.type === 'mfa_temp') {
      throw new UnauthorizedException('MFA verification required');
    }

    return payload;
  }
}
