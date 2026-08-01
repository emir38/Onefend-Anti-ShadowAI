import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { ConfigService } from '@nestjs/config';
import { AuthService } from './auth.service';
import { JwtStrategy } from './jwt.strategy';
import { MailService } from './mail.service';
import { AuthController } from './auth.controller';
import { PrismaModule } from '../prisma/prisma.module';
import { MfaTempStrategy } from './mfa-temp.strategy';
import { SystemAuditModule } from '../system-audit/system-audit.module';
import { RedisModule } from '../redis/redis.module';

@Module({
  imports: [
    PrismaModule,
    SystemAuditModule,
    RedisModule,
    PassportModule.register({ defaultStrategy: 'jwt' }),
    JwtModule.registerAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => {
        const secret = config.get('JWT_SECRET');
        if (!secret || secret.length < 32) {
          throw new Error('JWT_SECRET must be at least 32 characters. Generate one with: openssl rand -hex 32');
        }
        if (secret === 'change-this-to-a-random-secret') {
          throw new Error('JWT_SECRET is using the default value. This is not safe for production. Generate a secure secret with: openssl rand -hex 32');
        }
        return {
          secret,
          signOptions: {
            expiresIn: config.get('JWT_EXPIRATION', '30d'),
          },
        };
      },
    }),
  ],
  controllers: [AuthController],
  providers: [AuthService, JwtStrategy, MfaTempStrategy, MailService],
  exports: [AuthService, JwtStrategy, MfaTempStrategy, PassportModule, MailService],
})
export class AuthModule { }
