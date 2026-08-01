import { Module, forwardRef } from '@nestjs/common';
import { DetectionPatternsModule } from '../detection-patterns/detection-patterns.module';
import { ConversationEventsService } from './conversation-events.service';
import { ConversationEventsController } from './conversation-events.controller';
import { PrismaModule } from '../prisma/prisma.module';
import { AlertsModule } from '../alerts/alerts.module';
import { IntegrationsModule } from '../integrations/integrations.module';
import { ApplicationsModule } from '../applications/applications.module';

@Module({
  imports: [PrismaModule, AlertsModule, IntegrationsModule, DetectionPatternsModule, forwardRef(() => ApplicationsModule)],
  controllers: [ConversationEventsController],
  providers: [ConversationEventsService],
  exports: [ConversationEventsService],
})
export class ConversationEventsModule { }
