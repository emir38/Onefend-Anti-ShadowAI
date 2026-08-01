import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { JwtPayload } from './auth.service';

@Injectable()
export class MfaTempStrategy extends PassportStrategy(Strategy, 'mfa-temp') {
  constructor(configService: ConfigService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: configService.get('JWT_SECRET'),
    });
  }

  async validate(payload: JwtPayload): Promise<JwtPayload> {
    // This strategy EXPLICITLY allows and is designed for mfa_temp tokens
    // used during multiple-factor authentication setup or verification.
    if (payload.type !== 'mfa_temp') {
      // Optionally we could allow 'user' type here too if we want a unified guard,
      // but keeping it strict to 'mfa_temp' is clearer.
      // If we want both, we use AuthGuard(['jwt', 'mfa-temp'])
      throw new UnauthorizedException('Invalid token type');
    }
    return payload;
  }
}
