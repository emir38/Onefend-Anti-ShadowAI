import { Global, Module } from '@nestjs/common';
import { OrganizationsService } from './organizations.service';
import { OrganizationsController } from './organizations.controller';
import { PrismaModule } from '../prisma/prisma.module';

import { RetentionService } from './retention.service';

import { ConfigModule } from '../config/config.module';
import { SystemAuditModule } from '../system-audit/system-audit.module';

@Global()
@Module({
  imports: [PrismaModule, ConfigModule, SystemAuditModule],
  controllers: [OrganizationsController],
  providers: [OrganizationsService, RetentionService],
  exports: [OrganizationsService],
})
export class OrganizationsModule { }
