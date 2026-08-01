import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { ReportsController } from './reports.controller';
import { ReportScheduleController } from './report-schedule.controller';
import { ReportsService } from './reports.service';
import { ReportScheduleService } from './report-schedule.service';
import { PrismaModule } from '../prisma/prisma.module';
import { ConversationEventsModule } from '../conversation-events/conversation-events.module';

@Module({
  imports: [PrismaModule, ConversationEventsModule, ScheduleModule.forRoot()],
  controllers: [ReportsController, ReportScheduleController],
  providers: [ReportsService, ReportScheduleService],
})
export class ReportsModule {}
