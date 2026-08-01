import { Module } from '@nestjs/common';
import { AiAnalysisController } from './ai-analysis.controller';
import { AiAnalysisService } from './ai-analysis.service';
import { LlmService } from './llm.service';
import { GoogleGeminiService } from './google-gemini.service';
import { GoogleDlpService } from './google-dlp.service';
import { GoogleDocumentAiService } from './google-document-ai.service';
import { RedisModule } from '../redis/redis.module';

import { ConversationEventsModule } from '../conversation-events/conversation-events.module';

@Module({
  controllers: [AiAnalysisController],
  providers: [
    AiAnalysisService,
    GoogleDlpService,
    GoogleGeminiService,
    GoogleDocumentAiService,
    {
      provide: LlmService,
      useClass: GoogleGeminiService,
    },
  ],
  imports: [RedisModule, ConversationEventsModule],
  exports: [AiAnalysisService, GoogleGeminiService],
})
export class AiAnalysisModule { }
