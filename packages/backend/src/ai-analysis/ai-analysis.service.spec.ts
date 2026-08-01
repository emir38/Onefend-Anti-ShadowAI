import { Test, TestingModule } from '@nestjs/testing';
import { AiAnalysisService } from './ai-analysis.service';
import { LlmService } from './llm.service';
import { GoogleDlpService } from './google-dlp.service';
import { RedisService } from '../redis/redis.service';
import { PrismaService } from '../prisma/prisma.service';
import { ConversationEventsService } from '../conversation-events/conversation-events.service';
import { AnalyzeTextDto } from './dto/analyze-text.dto';
import { RiskLevel } from '@prisma/client';

import { GoogleDocumentAiService } from './google-document-ai.service';

describe('AiAnalysisService - Multimodal', () => {
    let service: AiAnalysisService;
    let mockLlmService: Partial<LlmService>;
    let mockDlpService: Partial<GoogleDlpService>;
    let mockDocumentAiService: Partial<GoogleDocumentAiService>;
    let mockRedisService: Partial<RedisService>;
    let mockPrismaService: Partial<PrismaService>;
    let mockEventsService: Partial<ConversationEventsService>;

    beforeEach(async () => {
        // Mock LlmService
        mockLlmService = {
            analyzeText: jest.fn().mockResolvedValue({
                category: 'Test Category',
                riskLevel: RiskLevel.LOW,
                confidenceScore: 0.9,
                summary: 'Test summary',
            }),
        };

        // Mock GoogleDlpService
        mockDlpService = {
            redactPii: jest.fn().mockResolvedValue('redacted text'),
            redactImagePii: jest.fn().mockResolvedValue({
                redactedImage: 'base64_redacted_image',
                findingsCount: 2,
            }),
        };

        // Mock GoogleDocumentAiService
        mockDocumentAiService = {
            processDocument: jest.fn().mockResolvedValue({
                extractedText: 'Extracted document text',
                pageCount: 3,
            }),
        };

        // ... (Redis, Prisma, Events mocks remain same)
        mockRedisService = {
            incr: jest.fn().mockResolvedValue(1),
            expire: jest.fn().mockResolvedValue(1),
        };

        mockPrismaService = {
            user: {
                findUnique: jest.fn().mockResolvedValue(null),
            } as any,
            excludedDomain: {
                findFirst: jest.fn().mockResolvedValue(null),
            } as any,
        };

        mockEventsService = {
            log: jest.fn().mockResolvedValue(undefined),
        };

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                AiAnalysisService,
                { provide: LlmService, useValue: mockLlmService },
                { provide: GoogleDlpService, useValue: mockDlpService },
                { provide: GoogleDocumentAiService, useValue: mockDocumentAiService },
                { provide: RedisService, useValue: mockRedisService },
                { provide: PrismaService, useValue: mockPrismaService },
                { provide: ConversationEventsService, useValue: mockEventsService },
            ],
        }).compile();

        service = module.get<AiAnalysisService>(AiAnalysisService);
    });

    it('should be defined', () => {
        expect(service).toBeDefined();
    });

    // ... (Text tests remain same)
    describe('Text-only analysis (backward compatibility)', () => {
        it('should analyze text without images', async () => {
            const dto: AnalyzeTextDto = {
                text: 'Test text content',
            };

            const result = await service.analyze(dto);

            expect(result).toBeDefined();
            expect(result.riskLevel).toBe(RiskLevel.LOW);
            expect(mockLlmService.analyzeText).toHaveBeenCalledWith(
                'Test text content',
                undefined,
                undefined,
                undefined
            );
        });
    });

    // ... (Image tests remain same)
    describe('Multimodal analysis (Images)', () => {
        // ... (Keep existing image tests)
        it('should process text + single image', async () => {
            const dto: AnalyzeTextDto = {
                text: 'Check this screenshot',
                images: [{ mimeType: 'image/png', data: 'base64_image_data' }],
            };
            await service.analyze(dto);
            expect(mockDlpService.redactImagePii).toHaveBeenCalled();
        });

        it('should handle image processing errors gracefully', async () => {
            const dto: AnalyzeTextDto = {
                text: 'Check this screenshot',
                images: [{ mimeType: 'image/png', data: 'base64_image_data' }],
            };
            mockDlpService.redactImagePii = jest.fn().mockRejectedValue(new Error('DLP Error'));

            const result = await service.analyze(dto);
            expect(result).toBeDefined();
        });
    });

    describe('Multimodal analysis (Documents)', () => {
        it('should search extract text from documents + redact + analyze', async () => {
            const dto: AnalyzeTextDto = {
                text: 'Ref',
                documents: [
                    {
                        mimeType: 'application/pdf',
                        data: 'base64_pdf',
                        filename: 'contract.pdf'
                    }
                ]
            };

            const result = await service.analyze(dto);

            // 1. Verify Document AI called
            expect(mockDocumentAiService.processDocument).toHaveBeenCalledWith(
                'base64_pdf', 'application/pdf', 'contract.pdf'
            );

            // 2. Verify extracted text is passed to DLP
            expect(mockDlpService.redactPii).toHaveBeenCalledWith('Extracted document text');

            // 3. Verify Gemini called with extracted docs
            expect(mockLlmService.analyzeText).toHaveBeenCalledWith(
                'Ref',
                undefined,
                undefined, // no images
                expect.arrayContaining([
                    expect.objectContaining({
                        extractedText: 'redacted text', // Result of DLP mock
                        filename: 'contract.pdf',
                        pageCount: 3
                    })
                ])
            );

            // 4. Verify result metadata
            expect(result.multimodal?.hasDocuments).toBe(true);
            expect(result.documentTexts).toHaveLength(1);
            expect(result.documentTexts?.[0].extractedText).toBe('redacted text');
        });

        it('should process multiple documents in parallel', async () => {
            const dto: AnalyzeTextDto = {
                text: 'Refs',
                documents: [
                    { mimeType: 'application/pdf', data: 'd1' },
                    { mimeType: 'application/pdf', data: 'd2' }
                ]
            };

            await service.analyze(dto);

            expect(mockDocumentAiService.processDocument).toHaveBeenCalledTimes(2);
            expect(mockDlpService.redactPii).toHaveBeenCalledTimes(2); // 2 for docs (text redaction handled in LLM service or skipped here)
        });

        it('should functionality handle documents execution failure gracefully', async () => {
            mockDocumentAiService.processDocument = jest.fn().mockRejectedValue(new Error('OCR Error'));

            const dto: AnalyzeTextDto = {
                text: 'Ref',
                documents: [{ mimeType: 'application/pdf', data: 'd1' }]
            };

            const result = await service.analyze(dto);

            // Should not crash, just skip docs
            expect(result).toBeDefined();
            expect(result.multimodal?.hasDocuments).toBe(true); // Input had documents, even if processing failed
            // Actually in implementation: "extractedDocuments = undefined; // Fallback"

            expect(mockLlmService.analyzeText).toHaveBeenCalledWith(
                'Ref', undefined, undefined, undefined
            );
        });
    });
});
