import { Injectable, Logger, HttpException, HttpStatus } from '@nestjs/common';
import { LlmService } from './llm.service';
import { AnalyzeTextDto } from './dto/analyze-text.dto';
import { AnalysisResultDto } from './dto/analysis-result.dto';
import { PDFDocument } from 'pdf-lib';
import { RedisService } from '../redis/redis.service';
import { PrismaService } from '../prisma/prisma.service';
import { ConversationEventsService } from '../conversation-events/conversation-events.service';
import { GoogleDlpService } from './google-dlp.service';
import { GoogleDocumentAiService } from './google-document-ai.service';
import * as mammoth from 'mammoth';
import * as XLSX from 'xlsx';

@Injectable()
export class AiAnalysisService {
  private readonly logger = new Logger(AiAnalysisService.name);
  private readonly DEFAULT_RATE_LIMIT = 60;

  // Redis cache for user + settings lookup.
  // Settings change very rarely (admin-driven), so a 60s TTL avoids
  // a Postgres round-trip on every request while keeping staleness
  // bounded to 1 minute.
  private readonly USER_CTX_CACHE_TTL = 60; // seconds
  private readonly USER_CTX_CACHE_PREFIX = 'user_ctx:v3:';

  // Redis cache for the excluded domains list.
  private readonly EXCLUDED_DOMAINS_CACHE_TTL = 300; // 5 minutes
  private readonly EXCLUDED_DOMAINS_CACHE_PREFIX = 'excluded_domains:global:';

  constructor(
    private readonly llmService: LlmService,
    private readonly redis: RedisService,
    private readonly prisma: PrismaService,
    private readonly eventsService: ConversationEventsService,
    private readonly googleDlpService: GoogleDlpService,
    private readonly googleDocumentAiService: GoogleDocumentAiService,
  ) { }

  /**
   * Fetch the user + settings context needed by analyze(),
   * backed by a 60-second Redis cache.
   */
  private async getCachedUserContext(userId: string): Promise<any | null> {
    const cacheKey = this.USER_CTX_CACHE_PREFIX + userId;

    // 1. Try Redis
    try {
      const cached = await this.redis.get(cacheKey);
      if (cached) {
        return JSON.parse(cached);
      }
    } catch (e) {
      // Redis read failure is non-fatal; fall through to Postgres
      this.logger.warn(`user_ctx cache read failed: ${e.message}`);
    }

    // 2. Cache miss -> query Postgres
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) return null;

    // Also fetch the singleton settings
    const settings = await this.prisma.settings.findFirst();

    // 3. Persist a lean copy
    const lean = {
      id: user.id,
      settings: settings
        ? {
          id: settings.id,
          aiRateLimit: settings.aiRateLimit,
          aiContextPrompt: settings.aiContextPrompt,
          enableRegexBlocking: settings.enableRegexBlocking,
          interventionMode: settings.interventionMode,
          saveEvidence: settings.saveEvidence,
          approvedAiName: settings.approvedAiName,
          approvedAiUrl: settings.approvedAiUrl,
        }
        : null,
    };

    try {
      await this.redis.set(cacheKey, JSON.stringify(lean), 'EX', this.USER_CTX_CACHE_TTL);
    } catch (e) {
      this.logger.warn(`user_ctx cache write failed: ${e.message}`);
    }

    return lean;
  }

  /**
   * Check whether a domain is in the excluded (whitelisted) list,
   * backed by a 5-minute Redis cache.
   */
  private async isDomainExcluded(domain: string): Promise<boolean> {
    const cacheKey = this.EXCLUDED_DOMAINS_CACHE_PREFIX;
    let domainList: string[] | null = null;

    try {
      const cached = await this.redis.get(cacheKey);
      if (cached) {
        domainList = JSON.parse(cached);
      }
    } catch (e) {
      this.logger.warn(`excluded_domains cache read failed: ${e.message}`);
    }

    if (!domainList) {
      const records = await this.prisma.excludedDomain.findMany({
        select: { domain: true },
      });
      domainList = records.map(r => r.domain.toLowerCase());

      try {
        await this.redis.set(cacheKey, JSON.stringify(domainList), 'EX', this.EXCLUDED_DOMAINS_CACHE_TTL);
      } catch (e) {
        this.logger.warn(`excluded_domains cache write failed: ${e.message}`);
      }
    }

    return domainList.includes(domain);
  }

  async analyze(analyzeTextDto: AnalyzeTextDto): Promise<AnalysisResultDto> {
    const { userId, text } = analyzeTextDto;

    this.logger.log(`[AiAnalysis] Received Request. UserId: ${userId} | Text Len: ${text?.length}`);

    let user = null;

    if (userId) {
      try {
        user = await this.getCachedUserContext(userId);

        // Check Whitelisted Domains
        if (analyzeTextDto.metadata?.sourcedomain) {
          const domainToCheck = analyzeTextDto.metadata.sourcedomain.toLowerCase().trim();

          const isWhitelisted = await this.isDomainExcluded(domainToCheck);

          if (isWhitelisted) {
            this.logger.log(`[AiAnalysis] Skipped - Domain Whitelisted: ${domainToCheck}`);
            return {
              riskLevel: 'LOW',
              confidenceScore: 1.0,
              category: 'SAFE_BROWSING',
              summary: `Analysis skipped. Domain ${domainToCheck} is trusted by your organization.`,
            };
          }
        }

        // Rate limiting (simple, no tier logic)
        const effectiveLimit = user?.settings?.aiRateLimit || this.DEFAULT_RATE_LIMIT;

        const key = `rate_limit:ai:${userId}`;
        const currentUsage = await this.redis.incr(key);
        if (currentUsage === 1) {
          await this.redis.expire(key, 86400);
        }

        console.log(
          `[RateLimit] User: ${userId} | Count: ${currentUsage} / ${effectiveLimit}`
        );

        if (currentUsage > effectiveLimit) {
          console.warn(`[RateLimit] BLOCKED User ${userId} (Usage: ${currentUsage})`);
          throw new HttpException(
            {
              statusCode: 429,
              message: `Daily AI analysis limit reached (${effectiveLimit}/day).`,
              currentLimit: effectiveLimit,
            },
            HttpStatus.TOO_MANY_REQUESTS,
          );
        }
      } catch (error) {
        if (error instanceof HttpException) {
          throw error;
        }
        // Fail-Closed: If Rate Limiting fails (Redis down), we must BLOCK access to protect costs.
        this.logger.error(`Rate limiting check failed: ${error.message}`, error.stack);
        throw new HttpException('Service temporarily unavailable (Rate Limit Check Failed)', HttpStatus.SERVICE_UNAVAILABLE);
      }
    }

    // Multimodal processing

    const startMultimodal = Date.now();

    // Extract multimodal inputs
    const { images, documents } = analyzeTextDto;

    // Log multimodal request
    if (images?.length || documents?.length) {
      this.logger.log(
        `[Multimodal] Processing: ${images?.length || 0} image(s), ${documents?.length || 0} document(s)`
      );
    }

    // Process images in parallel (if provided)
    let redactedImages: Array<{ mimeType: string; data: string; findingsCount: number }> | undefined;

    if (images && images.length > 0) {
      try {
        redactedImages = await this.processImages(images);
        const totalFindings = redactedImages.reduce((sum, img) => sum + img.findingsCount, 0);
        this.logger.log(`[Multimodal] Image redaction complete: ${totalFindings} PII findings redacted`);
      } catch (imageError) {
        this.logger.error('[Multimodal] Image processing failed, continuing without images', imageError);
        redactedImages = undefined; // Fallback: Skip images on error
      }
    }

    // Direct document pass-through (native multimodal) - pass raw bytes directly to Gemini.
    let rawDocuments: Array<{ mimeType: string; data: string; filename?: string }> | undefined;

    if (documents && documents.length > 0) {
      rawDocuments = [];
      this.logger.log(`[Multimodal] Processing ${documents.length} document(s)...`);

      const MAX_TOTAL_CHARS = 120000; // ~30k tokens total across all documents
      let totalChars = 0;

      for (const doc of documents) {
        let finalDoc: any = { ...doc };
        const MAX_CHARS = 60000; // ~15,000 Tokens

        try {
          // Buffer creation safe guard
          const buffer = Buffer.from(doc.data, 'base64');

          // 1. PDF Handling (Truncate Pages, Keep as Binary for Multimodal)
          if (doc.mimeType === 'application/pdf') {
            try {
              const pdfDoc = await PDFDocument.load(buffer, { ignoreEncryption: true });
              const pageCount = pdfDoc.getPageCount();
              if (pageCount > 20) {
                this.logger.warn(`Truncating PDF ${doc.filename} from ${pageCount} pages`);
                const newDoc = await PDFDocument.create();
                const pages = await newDoc.copyPages(pdfDoc, Array.from({ length: 20 }, (_, i) => i));
                pages.forEach(p => newDoc.addPage(p));
                finalDoc.data = await newDoc.saveAsBase64();
              }
            } catch (e) {
              this.logger.warn('PDF Truncate failed, sending raw', e);
            }

            // 2. Word (DOCX) -> Extract Text -> Truncate
          } else if (doc.mimeType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
            const result = await mammoth.extractRawText({ buffer });
            let text = result.value || '';
            if (text.length > MAX_CHARS) {
              text = text.substring(0, MAX_CHARS) + '\n\n[SYSTEM NOTE: DOCUMENT TRUNCATED DUE TO SIZE]';
            }
            finalDoc.extractedText = text;
            finalDoc.data = undefined; // Remove binary to save bandwidth
            finalDoc.mimeType = 'text/plain'; // Treat as text

            // 3. Excel (XLSX) -> CSV -> Truncate
          } else if (doc.mimeType === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet') {
            const workbook = XLSX.read(buffer, { type: 'buffer' });
            let csvText = '';
            // Read first 3 sheets max for context
            const sheetsToCheck = workbook.SheetNames.slice(0, 3);
            for (const sheetName of sheetsToCheck) {
              csvText += `\n--- Sheet: ${sheetName} ---\n`;
              const sheet = workbook.Sheets[sheetName];
              csvText += XLSX.utils.sheet_to_csv(sheet);
            }
            if (csvText.length > MAX_CHARS) {
              csvText = csvText.substring(0, MAX_CHARS) + '\n\n[SYSTEM NOTE: SPREADSHEET TRUNCATED DUE TO SIZE]';
            }
            finalDoc.extractedText = csvText;
            finalDoc.data = undefined;
            finalDoc.mimeType = 'text/csv';

            // 4. Text/CSV/JSON -> Truncate String
          } else if (doc.mimeType?.startsWith('text/') || doc.mimeType?.includes('json') || doc.mimeType?.includes('csv')) {
            let text = buffer.toString('utf-8');
            if (text.length > MAX_CHARS) {
              text = text.substring(0, MAX_CHARS) + '\n\n[SYSTEM NOTE: FILE TRUNCATED DUE TO SIZE]';
            }
            finalDoc.extractedText = text;
            finalDoc.data = undefined;
          }

        } catch (err) {
          this.logger.error(`Failed to process document ${doc.filename}`, err);
        }

        // Accumulate total character count across all documents
        const docLength = finalDoc.extractedText?.length || finalDoc.data?.length || 0;
        totalChars += docLength;
        rawDocuments.push(finalDoc);

        if (totalChars > MAX_TOTAL_CHARS) {
          this.logger.warn(`Total document size exceeds limit (${totalChars}/${MAX_TOTAL_CHARS} chars), truncating remaining documents`);
          break;
        }
      }
    }

    const multimodalMs = Date.now() - startMultimodal;

    // Call LLM with multimodal content
    const result = await this.llmService.analyzeText(
      text,
      user?.settings,
      redactedImages,
      rawDocuments,
      analyzeTextDto.context, // Source context (e.g. "Claude Code CLI", "ChatGPT Web")
    );

    // Add multimodal metadata to result
    if (images?.length || documents?.length) {
      result.multimodal = {
        hasImages: !!images?.length,
        hasDocuments: !!documents?.length,
        imageCount: images?.length || 0,
        documentCount: documents?.length || 0,
        files: documents?.map(d => d.filename || 'unknown'),
        dlpRedacted: result.dlpTriggered,
        timings: result.debug?.timings
      };

      result.redactedImages = redactedImages;

      // Add multimodal timing to debug info
      if (result.debug?.timings) {
        result.debug.timings.dlpImageMs = multimodalMs;
      }
    }

    return result;
  }

  /**
   * Process images: Redact PII using DLP API
   * Runs in parallel for multiple images
   */
  private async processImages(
    images: Array<{ mimeType: string; data: string }>
  ): Promise<Array<{ mimeType: string; data: string; findingsCount: number }>> {
    this.logger.log(`[processImages] Processing ${images.length} image(s)...`);

    // Process all images in parallel
    const redactionPromises = images.map(async (image) => {
      const { redactedImage, findingsCount } = await this.googleDlpService.redactImagePii(
        image.data,
        image.mimeType
      );

      return {
        mimeType: image.mimeType,
        data: redactedImage,
        findingsCount,
      };
    });

    const redactedImages = await Promise.all(redactionPromises);

    this.logger.log(
      `[processImages] Completed: ${redactedImages.length} image(s) processed`
    );

    return redactedImages;
  }

  /**
   * Process documents:
   * 1. Extract text using Document AI OCR (via GCS)
   * 2. Redact PII from extracted text using DLP
   */
  private async processDocuments(
    documents: Array<{ mimeType: string; data: string; filename?: string }>
  ): Promise<Array<{ extractedText: string; filename?: string; pageCount?: number }>> {
    this.logger.log(`[processDocuments] Processing ${documents.length} document(s)...`);

    // Process all documents in parallel
    const docPromises = documents.map(async (doc) => {
      // Step 1: Extract Text via OCR
      const { extractedText, pageCount } = await this.googleDocumentAiService.processDocument(
        doc.data,
        doc.mimeType,
        doc.filename
      );

      this.logger.debug(`OCR Complete for ${doc.filename || 'doc'}: ${pageCount} pages, ${extractedText.length} chars`);

      if (!extractedText.trim()) {
        return { extractedText: '', filename: doc.filename, pageCount };
      }

      return {
        extractedText: extractedText,
        filename: doc.filename,
        pageCount,
      };
    });

    const processedDocs = await Promise.all(docPromises);

    this.logger.log(
      `[processDocuments] Completed: ${processedDocs.length} document(s) processed`
    );

    return processedDocs;
  }
}
