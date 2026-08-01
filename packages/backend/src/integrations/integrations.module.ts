import { Module } from '@nestjs/common';
import { IntegrationsService } from './integrations.service';
import { IntegrationsController } from './integrations.controller';
import { LogExporterService } from './log-exporter.service';
import { PrismaModule } from '../prisma/prisma.module';

import { SystemAuditModule } from '../system-audit/system-audit.module';

@Module({
  imports: [PrismaModule, SystemAuditModule],
  controllers: [IntegrationsController],
  providers: [IntegrationsService, LogExporterService],
  exports: [IntegrationsService, LogExporterService],
})
export class IntegrationsModule { }
