import { Module } from '@nestjs/common';
import { PatternsService } from './patterns.service';
import { PatternsController } from './patterns.controller';
import { PrismaModule } from '../prisma/prisma.module';
import { SystemAuditModule } from '../system-audit/system-audit.module';

@Module({
  imports: [PrismaModule, SystemAuditModule],
  controllers: [PatternsController],
  providers: [PatternsService],
  exports: [PatternsService],
})
export class PatternsModule { }
