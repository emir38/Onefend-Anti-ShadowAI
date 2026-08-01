import { Module } from '@nestjs/common';
import { SystemAuditService } from './system-audit.service';
import { SystemAuditController } from './system-audit.controller';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [SystemAuditController],
  providers: [SystemAuditService],
  exports: [SystemAuditService],
})
export class SystemAuditModule {}
