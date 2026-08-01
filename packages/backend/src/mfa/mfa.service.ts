import { Injectable, BadRequestException, Logger } from '@nestjs/common';
import { authenticator } from 'otplib';
import { toDataURL } from 'qrcode';
import { PrismaService } from '../prisma/prisma.service';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class MfaService {
  private readonly logger = new Logger(MfaService.name);

  constructor(
    private prisma: PrismaService,
    private configService: ConfigService,
  ) {
    // Widen the TOTP validation window to +/-2 steps (+/-60s)
    // to tolerate clock skew between the user's device and Cloud Run
    authenticator.options = { window: 2 };
  }

  async generateMfaSecret(userId: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      throw new BadRequestException('User not found');
    }

    const secret = authenticator.generateSecret();
    const appName = this.configService.get('APP_NAME') || 'Onefend';
    const otpAuthUrl = authenticator.keyuri(user.identifier, appName, secret);

    // Save secret to users (unconfirmed yet, but typical flow)
    await this.prisma.user.update({
      where: { id: userId },
      data: { mfaSecret: secret },
    });

    return {
      secret,
      otpAuthUrl,
    };
  }

  async generateQrCode(otpAuthUrl: string) {
    return toDataURL(otpAuthUrl);
  }

  async verifyMfaToken(userId: string, token: string): Promise<boolean> {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user || !user.mfaSecret) {
      this.logger.warn(`MFA verify failed: user=${userId}, hasSecret=${!!user?.mfaSecret}`);
      return false;
    }

    const isValid = authenticator.verify({ token, secret: user.mfaSecret });

    if (!isValid) {
      // Debug: log server-expected token vs received for clock skew diagnosis
      const serverToken = authenticator.generate(user.mfaSecret);
      this.logger.warn(
        `MFA verify failed for userId=${userId}: ` +
        `received="${token}", serverExpects="${serverToken}", ` +
        `secretLen=${user.mfaSecret.length}, window=${authenticator.options.window}`
      );
    }

    return isValid;
  }

  async enableMfa(userId: string, token: string) {
    const isValid = await this.verifyMfaToken(userId, token);  // already uses window:1
    if (!isValid) {
      throw new BadRequestException('Invalid MFA code');
    }
    await this.prisma.user.update({
      where: { id: userId },
      data: { isMfaEnabled: true },
    });
    return { success: true };
  }

  async disableMfa(userId: string) {
    await this.prisma.user.update({
      where: { id: userId },
      data: {
        isMfaEnabled: false,
        mfaSecret: null,
      },
    });
    return { success: true };
  }

  async getUserForResponse(userId: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) return null;
    return {
      id: user.id,
      email: user.identifier,
      role: user.role,
      isMfaEnabled: user.isMfaEnabled,
    };
  }
}
