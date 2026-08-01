import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from './prisma/prisma.module';
import { RedisModule } from './redis/redis.module';
import { AuthModule } from './auth/auth.module';
import { DevicesModule } from './devices/devices.module';
// import { ConfigSyncModule } from './config-sync/config-sync.module'; // OBSOLETE - Removed in favor of AppConfigModule
import { DiscoveryModule } from './discovery/discovery.module';
import { EventsModule } from './events/events.module';
import { ApplicationsModule } from './applications/applications.module';
import { PoliciesModule } from './policies/policies.module';
import { UsersModule } from './users/users.module';
import { OrganizationsModule } from './organizations/organizations.module';
import { GroupsModule } from './groups/groups.module';
import { EnrollmentModule } from './enrollment/enrollment.module';
import { ConfigModule as AppConfigModule } from './config/config.module';
import { PatternsModule } from './patterns/patterns.module';
import { ConversationEventsModule } from './conversation-events/conversation-events.module';
import { IntegrationsModule } from './integrations/integrations.module';
import { PlatformConfigsModule } from './platform-configs/platform-configs.module';
import { DetectionPatternsModule } from './detection-patterns/detection-patterns.module';
import { ReportsModule } from './reports/reports.module';
import { AlertsModule } from './alerts/alerts.module';
import { SystemAuditModule } from './system-audit/system-audit.module';
import { MfaModule } from './mfa/mfa.module';
import { AiAnalysisModule } from './ai-analysis/ai-analysis.module';
import { ExcludedDomainsModule } from './excluded-domains/excluded-domains.module';
import { AnalyticsModule } from './analytics/analytics.module';
import { AdminModule } from './admin/admin.module';
import { InvitationsModule } from './invitations/invitations.module';
import { ExtensionModule } from './extension/extension.module';

import { HealthController } from './health.controller';

import { ScheduleModule } from '@nestjs/schedule';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),
    ScheduleModule.forRoot(),
    ThrottlerModule.forRoot([
      {
        ttl: 60000,
        limit: 200,
      },
    ]),
    PrismaModule,
    RedisModule,
    AuthModule,
    DevicesModule,
    // ConfigSyncModule, // OBSOLETE - Removed in favor of AppConfigModule
    DiscoveryModule,
    EventsModule,
    ApplicationsModule,
    PoliciesModule,
    UsersModule,
    OrganizationsModule,
    GroupsModule,
    EnrollmentModule,
    AppConfigModule,
    PatternsModule,
    ConversationEventsModule,
    IntegrationsModule,
    PlatformConfigsModule,
    DetectionPatternsModule,
    ReportsModule,
    AlertsModule,
    SystemAuditModule,
    MfaModule,
    AiAnalysisModule,
    ExcludedDomainsModule,
    AnalyticsModule,
    AdminModule,
    InvitationsModule,
    ExtensionModule,
  ],
  controllers: [HealthController],
  providers: [
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
  ],
})
export class AppModule { }
