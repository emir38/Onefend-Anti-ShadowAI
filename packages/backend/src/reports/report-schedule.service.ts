import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../prisma/prisma.service';
import { ReportsService } from './reports.service';
import { ReportFrequency } from '@prisma/client';

@Injectable()
export class ReportScheduleService {
  private readonly logger = new Logger(ReportScheduleService.name);

  constructor(
    private prisma: PrismaService,
    private reportsService: ReportsService,
  ) {}

  @Cron(CronExpression.EVERY_HOUR)
  async handleScheduledReports() {
    this.logger.log('Checking for scheduled reports...');
    const now = new Date();

    const dueSchedules = await this.prisma.reportSchedule.findMany({
      where: {
        isActive: true,
        OR: [{ nextRunAt: { lte: now } }, { nextRunAt: null }],
      },
      include: { user: true },
    });

    for (const schedule of dueSchedules) {
      try {
        this.logger.log(`Processing schedule ${schedule.id}`);

        // Determine date range based on frequency
        const endDate = new Date();
        const startDate = new Date();

        if (schedule.frequency === 'WEEKLY') {
          startDate.setDate(endDate.getDate() - 7);
        } else if (schedule.frequency === 'DAILY') {
          startDate.setDate(endDate.getDate() - 1);
        } else if (schedule.frequency === 'MONTHLY') {
          startDate.setMonth(endDate.getMonth() - 1);
        }

        // Generate PDF
        const buffer = await this.reportsService.generateReport(
          'pdf',
          startDate,
          endDate,
        );

        // "Send" email (Simulation)
        this.logger.log(
          `[SIMULATION] Sending email to ${schedule.recipients.join(', ')} with PDF Report (${(buffer.length / 1024).toFixed(2)} KB).`,
        );

        // Update nextRunAt
        const [targetHour, targetMinute] = (schedule.runTime || '00:00').split(':').map(Number);
        const nextRun = new Date();
        nextRun.setHours(targetHour, targetMinute, 0, 0);

        while (nextRun <= now) {
          if (schedule.frequency === 'DAILY') {
            nextRun.setDate(nextRun.getDate() + 1);
          } else if (schedule.frequency === 'WEEKLY') {
            nextRun.setDate(nextRun.getDate() + 7);
          } else if (schedule.frequency === 'MONTHLY') {
            nextRun.setMonth(nextRun.getMonth() + 1);
          }
        }

        await this.prisma.reportSchedule.update({
          where: { id: schedule.id },
          data: {
            lastRunAt: now,
            nextRunAt: nextRun,
          },
        });

        this.logger.log(`Schedule ${schedule.id} completed. Next run at ${nextRun.toISOString()}`);
      } catch (error) {
        this.logger.error(`Failed to process schedule ${schedule.id}`, error);
      }
    }
  }

  async create(
    userId: string,
    data: { frequency: ReportFrequency; recipients: string[]; runTime?: string },
  ) {
    const count = await this.prisma.reportSchedule.count({ where: { isActive: true } });
    if (count >= 50) {
      throw new BadRequestException('Maximum scheduled reports limit reached (50)');
    }

    const runTime = data.runTime || '00:00';
    const [targetHour, targetMinute] = runTime.split(':').map(Number);

    // Calculate initial next run time
    const nextRun = new Date();
    nextRun.setHours(targetHour, targetMinute, 0, 0);

    // If passed, move to next cycle
    if (nextRun <= new Date()) {
      if (data.frequency === 'DAILY') {
        nextRun.setDate(nextRun.getDate() + 1);
      } else if (data.frequency === 'WEEKLY') {
        nextRun.setDate(nextRun.getDate() + 7);
      } else if (data.frequency === 'MONTHLY') {
        nextRun.setMonth(nextRun.getMonth() + 1);
      }
    }

    return this.prisma.reportSchedule.create({
      data: {
        userId,
        frequency: data.frequency,
        recipients: data.recipients,
        runTime,
        nextRunAt: nextRun,
      },
    });
  }

  async findAll() {
    return this.prisma.reportSchedule.findMany({
      orderBy: { createdAt: 'desc' },
    });
  }

  async delete(id: string) {
    const schedule = await this.prisma.reportSchedule.findFirst({
      where: { id },
    });

    if (!schedule) {
      throw new Error('Schedule not found');
    }

    return this.prisma.reportSchedule.delete({
      where: { id },
    });
  }
}
