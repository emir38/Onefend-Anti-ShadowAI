import { RiskLevel } from '@prisma/client';

export class AnalysisResultDto {
  category: string;
  riskLevel: RiskLevel;
  confidenceScore: number;
  summary: string;
  isCached?: boolean;
  redactedText?: string;
  // New fields for Unified Decision Flow
  dlpTriggered?: boolean;
  originalRisk?: RiskLevel;
  recommendation?: 'CONFIRM_REDACTION' | 'WARN_CONTEXT' | 'BLOCK' | 'NONE';

  /**
   * Redacted images (base64) after DLP processing
   * Only included if images were provided in the request
   */
  redactedImages?: Array<{
    mimeType: string;
    data: string; // Base64 redacted image
    findingsCount: number; // Number of PII findings redacted
  }>;

  /**
   * Extracted and redacted text from documents
   * Only included if documents were provided in the request
   */
  documentTexts?: Array<{
    filename?: string;
    extractedText: string; // OCR extracted text (redacted)
    pageCount?: number;
  }>;

  /**
   * Multimodal processing metadata
   */
  multimodal?: {
    hasImages: boolean;
    hasDocuments: boolean;
    imageCount: number;
    documentCount: number;
    files?: string[];
    timings?: any;
    dlpRedacted?: boolean;
  };

  // Debug information
  debug?: {
    dlpEnabled: boolean;
    dlpCalled: boolean;
    dlpRedacted: boolean;
    aiCalled: boolean;
    timings: {
      dlpMs?: number;
      dlpImageMs?: number; // NEW: Time for image redaction
      documentOcrMs?: number; // NEW: Time for document OCR
      aiMs?: number;
      totalMs: number;
    };
  };
}

