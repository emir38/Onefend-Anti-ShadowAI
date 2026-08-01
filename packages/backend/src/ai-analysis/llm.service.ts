import { Injectable } from '@nestjs/common';
import { AnalysisResultDto } from './dto/analysis-result.dto';

export abstract class LlmService {
  abstract analyzeText(
    text: string,
    settings?: any | null,
    images?: Array<{ mimeType: string; data: string }>,
    documents?: Array<{ mimeType?: string; data?: string; filename?: string; extractedText?: string }>,
    context?: string,
  ): Promise<AnalysisResultDto>;
}
