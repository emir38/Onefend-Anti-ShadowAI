
import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { GoogleDocumentAiService } from './google-document-ai.service';
import { DocumentProcessorServiceClient } from '@google-cloud/documentai';
import { Storage } from '@google-cloud/storage';

// Mock dependencies
jest.mock('@google-cloud/documentai');
jest.mock('@google-cloud/storage');
jest.mock('uuid', () => ({ v4: () => 'test-uuid' }));

describe('GoogleDocumentAiService', () => {
    let service: GoogleDocumentAiService;
    let mockClient: any;
    let mockStorage: any;
    let mockBucket: any;
    let mockFile: any;

    beforeEach(async () => {
        // Reset mocks
        mockClient = {
            processDocument: jest.fn(),
        };
        (DocumentProcessorServiceClient as unknown as jest.Mock).mockImplementation(() => mockClient);

        mockFile = {
            save: jest.fn().mockResolvedValue(undefined),
            delete: jest.fn().mockResolvedValue(undefined),
        };

        mockBucket = {
            file: jest.fn().mockReturnValue(mockFile),
        };

        mockStorage = {
            bucket: jest.fn().mockReturnValue(mockBucket),
        };
        (Storage as unknown as jest.Mock).mockImplementation(() => mockStorage);

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                GoogleDocumentAiService,
                {
                    provide: ConfigService,
                    useValue: {
                        getOrThrow: jest.fn((key) => {
                            if (key === 'GCP_PROJECT_ID') return 'test-project';
                            return null;
                        }),
                        get: jest.fn((key) => {
                            if (key === 'GCP_DOCAI_PROCESSOR_ID') return 'test-processor';
                            if (key === 'GCP_DOCS_BUCKET') return 'test-bucket';
                            return null;
                        }),
                    },
                },
            ],
        }).compile();

        service = module.get<GoogleDocumentAiService>(GoogleDocumentAiService);
    });

    it('should be defined', () => {
        expect(service).toBeDefined();
    });

    describe('processDocument', () => {
        it('should upload, process, and clean up document', async () => {
            // Mock Document AI response
            const mockResult = {
                document: {
                    text: 'Extracted text content',
                    pages: [{ pageNumber: 1 }],
                },
            };
            mockClient.processDocument.mockResolvedValue([mockResult]);

            const base64Data = 'base64data';
            const mimeType = 'application/pdf';
            const filename = 'test.pdf';

            const result = await service.processDocument(base64Data, mimeType, filename);

            // Verify GCS upload
            expect(mockStorage.bucket).toHaveBeenCalledWith('test-bucket');
            expect(mockBucket.file).toHaveBeenCalledWith('test-uuid-test.pdf');
            expect(mockFile.save).toHaveBeenCalled();

            // Verify Document AI call
            expect(mockClient.processDocument).toHaveBeenCalledWith({
                name: 'projects/test-project/locations/us/processors/test-processor',
                gcsDocument: {
                    gcsUri: 'gs://test-bucket/test-uuid-test.pdf',
                    mimeType: 'application/pdf',
                },
                processOptions: expect.any(Object),
            });

            // Verify GCS cleanup (delete)
            expect(mockFile.delete).toHaveBeenCalled();

            // Verify result
            expect(result).toEqual({
                extractedText: 'Extracted text content',
                pageCount: 1,
            });
        });

        it('should attempt cleanup even if processing fails', async () => {
            mockClient.processDocument.mockRejectedValue(new Error('OCR Failed'));

            await expect(service.processDocument('data', 'mime', 'name'))
                .rejects.toThrow('OCR Failed');

            // Verify delete was attempted in catch block
            expect(mockFile.delete).toHaveBeenCalled();
        });

        it('should return empty parsed text if no text extracted', async () => {
            mockClient.processDocument.mockResolvedValue([{ document: { text: '' } }]);

            const result = await service.processDocument('data', 'mime');

            expect(result.extractedText).toBe('');
        });
    });
});
