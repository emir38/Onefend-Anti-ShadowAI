import { Injectable, UnauthorizedException, BadRequestException, Logger } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';
import { PrismaService } from '../prisma/prisma.service';
import { MailService } from './mail.service';
import { RedisService } from '../redis/redis.service';

export interface JwtPayload {
  sub: string;
  userId: string;
  role?: string;
  iat?: number;
  exp?: number;
  type?: 'device' | 'user' | 'mfa_temp';
}

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly jwtService: JwtService,
    private readonly prisma: PrismaService,
    private readonly mailService: MailService,
    private readonly redis: RedisService,
  ) { }

  async validateUser(identifier: string, pass: string): Promise<any> {
    // Brute force protection: check if account is locked
    const failKey = 'login_fail:' + identifier;
    const fails = await this.redis.get(failKey);
    if (fails && parseInt(fails, 10) >= 5) {
      throw new UnauthorizedException('Account temporarily locked. Try again in 15 minutes.');
    }

    const user = await this.prisma.user.findFirst({
      where: { identifier },
    });

    if (!user) {
      // Increment failed attempts even for non-existent users to prevent enumeration timing
      await this.redis.incr(failKey);
      await this.redis.expire(failKey, 900);
      return null;
    }

    if (!user.isActive) {
      return null;
    }

    // If the user has a hashed password (new system)
    if (user.password) {
      const isMatch = await bcrypt.compare(pass, user.password);
      if (isMatch) {
        // Clear failed attempts on successful login
        await this.redis.del(failKey);

        let { password, ...result } = user;

        // Auto-detect weak legacy passwords during login and flag them permanently
        const isStrongRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{12,}$/.test(pass);
        if (!isStrongRegex && !result.mustChangePassword) {
            await this.prisma.user.update({
                where: { id: user.id },
                data: { mustChangePassword: true }
            });
            result.mustChangePassword = true;
        }

        return result;
      }
    }
    // Fallback removed for security

    // Increment failed attempts on wrong password
    await this.redis.incr(failKey);
    await this.redis.expire(failKey, 900);

    return null;
  }

  /**
   * Generates a JWT for an authenticated user (Dashboard)
   */
  async login(user: any) {
    // Fetch organization settings to check MFA enforcement
    const dbUser = await this.prisma.user.findUnique({
      where: { id: user.id },
      select: { isMfaEnabled: true, mfaSecret: true },
    });

    const isMfaEnabled = dbUser?.isMfaEnabled ?? false;
    const hasMfaSecret = !!dbUser?.mfaSecret;

    // Check org-level MFA enforcement from Settings
    const settings = await this.prisma.settings.findFirst();
    const enforceMfa = settings?.enforceMfa ?? false;

    // Requires MFA if:
    // - The user has MFA enabled AND has a valid secret
    // - Or the organization enforces it AND the user already has a secret (avoid lockout)
    const requiresMfaFlow = (isMfaEnabled && hasMfaSecret) || (enforceMfa && hasMfaSecret);

    // Setup required: ADMIN without MFA configured yet
    const isAdminWithoutMfa = user.role === 'ADMIN' && !isMfaEnabled;

    if (requiresMfaFlow || isAdminWithoutMfa) {
      const tempToken = await this.generateMfaTempToken(user.id);
      return {
        requiresMfa: true,
        tempToken,
        isSetupRequired: isAdminWithoutMfa || (enforceMfa && !isMfaEnabled),
      };
    }

    const access_token = await this.generateDashboardToken(user.id);

    return {
      access_token,
      mustChangePassword: user.mustChangePassword || false,
      user: {
        id: user.id,
        email: user.identifier,
        role: user.role,
        isMfaEnabled: isMfaEnabled,
      },
    };
  }

  /**
   * Generates a temporary JWT for MFA verification
   */
  async generateMfaTempToken(userId: string): Promise<string> {
    const payload: JwtPayload = {
      sub: userId,
      userId,
      type: 'mfa_temp',
    };

    // 5-minute token
    return this.jwtService.sign(payload, { expiresIn: '5m' });
  }

  /**
   * Generates a long-lived JWT for devices (90 days)
   */
  async generateDeviceToken(deviceId: string, userId: string, role: string): Promise<string> {
    const payload: JwtPayload = {
      sub: deviceId,
      userId,
      role,
      type: 'device',
    };

    // 90-day token for extensions
    return this.jwtService.sign(payload, { expiresIn: '90d' });
  }

  /**
   * Generates a short-lived JWT for dashboard (24 hours)
   */
  async generateDashboardToken(userId: string): Promise<string> {
    // Fetch user to get role
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { role: true },
    });

    const payload: JwtPayload = {
      sub: userId,
      userId,
      role: user?.role || 'USER',
      type: 'user',
    };

    // 24-hour token for dashboard
    return this.jwtService.sign(payload, { expiresIn: '24h' });
  }

  /**
   * Verifies a JWT and returns the payload
   */
  async verifyToken(token: string): Promise<JwtPayload> {
    return this.jwtService.verify(token);
  }

  async getUserById(userId: string) {
    return this.prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, identifier: true, role: true, isMfaEnabled: true, isActive: true },
    });
  }

  /**
   * Checks if a token was revoked in Redis (blacklist).
   * Returns true if revoked, false if valid or Redis is unavailable.
   */
  async isTokenRevoked(userId: string, iat: number): Promise<boolean> {
    try {
      const key = `token:blacklist:${userId}:${iat}`;
      const result = await this.redis.get(key);
      return result === '1';
    } catch (error) {
      this.logger.error('SECURITY: Redis blacklist unavailable -- revoked tokens may be active until natural expiry', error);
      return false; // fail-open: if Redis is down, don't block
    }
  }

  /**
   * Hashes a token for secure storage
   */
  async hashToken(token: string): Promise<string> {
    return bcrypt.hash(token, 10);
  }

  /**
   * Compares a token with its hash
   */
  async compareToken(token: string, hash: string): Promise<boolean> {
    return bcrypt.compare(token, hash);
  }

  /**
   * Renews a device token if it is close to expiring
   * Returns a new token if less than 7 days remain until expiration
   */
  async renewDeviceToken(currentToken: string): Promise<string | null> {
    try {
      const payload = await this.verifyToken(currentToken);

      // Only renew device-type tokens
      if (payload.type !== 'device') {
        return null;
      }

      // Check if the token expires in less than 7 days (604800 seconds)
      const now = Math.floor(Date.now() / 1000);
      const expiresIn = payload.exp! - now;
      const sevenDays = 7 * 24 * 60 * 60;

      if (expiresIn < sevenDays) {
        // Fetch user to get latest role
        const user = await this.prisma.user.findUnique({
          where: { id: payload.userId },
          select: { role: true }
        });

        if (!user) return null; // User deleted?

        // Generate new token
        return this.generateDeviceToken(payload.sub, payload.userId, user.role);
      }

      return null; // No renewal needed
    } catch (error) {
      this.logger.error('Error renewing device token', error);
      return null;
    }
  }

  async forgotPassword(email: string): Promise<boolean> {
    const user = await this.prisma.user.findFirst({ where: { identifier: email, isActive: true } });
    if (!user) return true; // Don't reveal whether the email exists

    const token = crypto.randomBytes(32).toString('hex');
    const tokenHash = await bcrypt.hash(token, 10);
    const expires = new Date();
    expires.setHours(expires.getHours() + 1); // Expires in 1 hour

    await this.prisma.user.update({
      where: { id: user.id },
      data: {
        resetPasswordToken: tokenHash,
        resetPasswordExpires: expires,
      },
    });

    // Send original token to user (not the hash)
    await this.mailService.sendPasswordResetEmail(email, token);

    return true;
  }

  private validatePasswordStrength(password: string): void {
    const isStrong = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{12,}$/.test(password);
    if (!isStrong) {
      throw new BadRequestException(
        'Password must be at least 12 characters and include uppercase, lowercase, and a number.',
      );
    }
  }

  async resetPassword(token: string, newPassword: string): Promise<boolean> {
    // Token is stored hashed, so we cannot query by value directly.
    // Find all users with a non-expired reset token and compare with bcrypt.
    const candidates = await this.prisma.user.findMany({
      where: {
        resetPasswordToken: { not: null },
        resetPasswordExpires: { gt: new Date() },
      },
    });

    let user = null;
    for (const candidate of candidates) {
      const isValid = await bcrypt.compare(token, candidate.resetPasswordToken);
      if (isValid) {
        user = candidate;
        break;
      }
    }

    if (!user) throw new UnauthorizedException('Invalid or expired reset token');

    this.validatePasswordStrength(newPassword);

    const hashedPassword = await bcrypt.hash(newPassword, 10);

    await this.prisma.user.update({
      where: { id: user.id },
      data: {
        password: hashedPassword,
        resetPasswordToken: null,
        resetPasswordExpires: null,
        mustChangePassword: false, // User has already changed their password
      },
    });

    return true;
  }

  async changePassword(userId: string, oldPassword: string, newPassword: string): Promise<boolean> {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user || !user.password) throw new UnauthorizedException('User not found or no password set');

    const isMatch = await bcrypt.compare(oldPassword, user.password);
    if (!isMatch) throw new UnauthorizedException('Invalid old password');

    this.validatePasswordStrength(newPassword);

    const hashedPassword = await bcrypt.hash(newPassword, 10);

    await this.prisma.user.update({
      where: { id: userId },
      data: {
        password: hashedPassword,
        mustChangePassword: false,
      },
    });

    return true;
  }

  /**
   * Revokes a JWT by adding it to the Redis blacklist.
   * TTL = remaining token time to avoid wasting memory.
   * Called during logout for immediate invalidation.
   */
  async revokeToken(token: string): Promise<void> {
    try {
      const payload = this.jwtService.decode(token) as JwtPayload;
      if (!payload?.exp || !payload?.userId || !payload?.iat) return;

      const now = Math.floor(Date.now() / 1000);
      const ttlSeconds = payload.exp - now;
      if (ttlSeconds <= 0) return; // Already expired, no need to blacklist

      const key = `token:blacklist:${payload.userId}:${payload.iat}`;
      await this.redis.setex(key, ttlSeconds, '1');
      this.logger.log(`Token revoked for userId=${payload.userId}, TTL=${ttlSeconds}s`);
    } catch (error) {
      // Don't throw -- if Redis fails, the token still expires in 24h
      this.logger.warn('Failed to revoke token in Redis', error);
    }
  }
}
