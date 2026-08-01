import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class RetentionService {
  private readonly logger = new Logger(RetentionService.name);

  constructor(private readonly prisma: PrismaService) {}

  @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
  async handleDataRetention() {
    this.logger.log('Starting data retention cleanup task...');

    try {
      const settings = await this.prisma.settings.findFirst();

      const auditRetention = settings?.auditLogRetentionDays || 90;
      const eventRetention = settings?.eventRetentionDays || 30;

      const auditDate = new Date();
      auditDate.setDate(auditDate.getDate() - auditRetention);

      const eventDate = new Date();
      eventDate.setDate(eventDate.getDate() - eventRetention);

      // Delete old SystemAuditLogs
      const deletedLogs = await this.prisma.systemAuditLog.deleteMany({
        where: {
          timestamp: {
            lt: auditDate,
          },
        },
      });

      // Delete old ConversationEvents
      const deletedEvents = await this.prisma.conversationEvent.deleteMany({
        where: {
          timestamp: {
            lt: eventDate,
          },
        },
      });

      if (deletedLogs.count > 0 || deletedEvents.count > 0) {
        this.logger.log(
          `Retention cleanup: Deleted ${deletedLogs.count} logs (>${auditRetention}d) and ${deletedEvents.count} events (>${eventRetention}d).`,
        );
      }

      this.logger.log('Data retention cleanup task completed.');
    } catch (error) {
      this.logger.error('Error executing retention cleanup task', error);
    }
  }
}
