import { Module } from '@nestjs/common';
import { ExcludedDomainsService } from './excluded-domains.service';
import { ExcludedDomainsController } from './excluded-domains.controller';
import { PrismaModule } from '../prisma/prisma.module';
import { ConfigModule } from '../config/config.module';

import { SystemAuditModule } from '../system-audit/system-audit.module';

@Module({
    imports: [PrismaModule, ConfigModule, SystemAuditModule],
    controllers: [ExcludedDomainsController],
    providers: [ExcludedDomainsService],
    exports: [ExcludedDomainsService],
})
export class ExcludedDomainsModule { }
