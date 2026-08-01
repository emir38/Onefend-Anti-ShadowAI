import { Module } from '@nestjs/common';
import { PoliciesService } from './policies.service';
import { PoliciesController } from './policies.controller';
import { PrismaModule } from '../prisma/prisma.module';
import { RedisModule } from '../redis/redis.module';
import { SystemAuditModule } from '../system-audit/system-audit.module';
import { ConfigModule } from '../config/config.module';

@Module({
  imports: [PrismaModule, RedisModule, SystemAuditModule, ConfigModule],
  controllers: [PoliciesController],
  providers: [PoliciesService],
  exports: [PoliciesService],
})
export class PoliciesModule { }
