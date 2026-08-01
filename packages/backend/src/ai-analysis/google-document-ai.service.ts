
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DocumentProcessorServiceClient } from '@google-cloud/documentai';
import { Storage } from '@google-cloud/storage';
import { v4 as uuidv4 } from 'uuid';
import { PDFDocument } from 'pdf-lib';

@Injectable()
export class GoogleDocumentAiService {
    private readonly logger = new Logger(GoogleDocumentAiService.name);
    private client: DocumentProcessorServiceClient | null = null;
    private storage: Storage | null = null;
    private readonly projectId: string;
    private readonly location = 'us';
    private readonly processorId: string;
    private readonly bucketName: string;
    private readonly enabled: boolean;

    constructor(private readonly configService: ConfigService) {
        this.projectId = this.configService.get<string>('GCP_PROJECT_ID') || '';
        this.processorId = this.configService.get<string>('GCP_DOCAI_PROCESSOR_ID') || '';
        this.bucketName = this.configService.get<string>('GCP_DOCS_BUCKET') || `onefend-docs-temp-${this.projectId}`;

        if (!this.projectId) {
            this.logger.warn('GCP_PROJECT_ID is not set. Document AI is disabled.');
            this.enabled = false;
            return;
        }

        this.enabled = true;

        this.client = new DocumentProcessorServiceClient({
            projectId: this.projectId,
            keyFilename: process.env.GCP_KEY_FILE || undefined,
            credentials: this.configService.get('GCP_PRIVATE_KEY') ? {
                client_email: this.configService.get('GCP_CLIENT_EMAIL'),
                private_key: this.configService.get('GCP_PRIVATE_KEY'),
            } : undefined
        });

        this.storage = new Storage({
            projectId: this.projectId,
            credentials: this.configService.get('GCP_PRIVATE_KEY') ? {
                client_email: this.configService.get('GCP_CLIENT_EMAIL'),
                private_key: this.configService.get('GCP_PRIVATE_KEY'),
            } : undefined
        });

        if (!this.processorId) {
            this.logger.warn('GCP_DOCAI_PROCESSOR_ID is not set. Document analysis will fail.');
        }
    }

    /**
     * Process a document: Upload -> OCR -> Delete -> Return Text
     */
    async processDocument(
        base64Data: string,
        mimeType: string,
        originalFilename?: string
    ): Promise<{ extractedText: string; pageCount: number }> {
        if (!this.enabled || !this.client || !this.storage) {
            this.logger.warn('Document AI is not configured. Skipping document analysis.');
            return { extractedText: '', pageCount: 0 };
        }
        const startTime = Date.now();
        const fileId = uuidv4();
        const safeName = (originalFilename || 'doc').replace(/[^a-zA-Z0-9._-]/g, '_');
        const gcsFileName = `${fileId}-${safeName}`;

        let finalBuffer = Buffer.from(base64Data, 'base64');
        let wasTruncated = false;
        let originalPageCount = 0;

        // VALIDATION & OPTIMIZATION: Check PDF properties
        if (mimeType === 'application/pdf') {
            const signature = finalBuffer.slice(0, 4).toString();
            if (signature !== '%PDF') {
                // FAIL FAST: This proves the data arriving is NOT a valid PDF
                throw new Error('Invalid PDF signature');
            }

            // TRUNCATE > 15 Pages (Document AI Synchronous Limit)
            try {
                const pdfDoc = await PDFDocument.load(finalBuffer, { ignoreEncryption: true });
                originalPageCount = pdfDoc.getPageCount();

                if (originalPageCount > 15) {
                    this.logger.warn(`📄 Document has ${originalPageCount} pages. Truncating to first 15 for sync analysis.`);
                    const newDoc = await PDFDocument.create();
                    // Copy pages 0 to 14
                    const pages = await newDoc.copyPages(pdfDoc, Array.from({ length: 15 }, (_, i) => i));
                    pages.forEach(page => newDoc.addPage(page));

                    const newPdfBytes = await newDoc.save();
                    finalBuffer = Buffer.from(newPdfBytes);
                    wasTruncated = true;
                }
            } catch (pdfErr) {
                this.logger.error('Failed to parse/truncate PDF locally, attempting raw upload. DocAI might fail if >15 pages.', pdfErr);
                // Continue with original buffer
            }
        }

        try {
            // 1. Upload to GCS
            this.logger.log(`Uploading document for analysis (${mimeType})`);
            const bucket = this.storage.bucket(this.bucketName);
            const file = bucket.file(gcsFileName);

            await file.save(finalBuffer, {
                contentType: mimeType,
                resumable: false
            });

            // 2. Call Document AI
            const name = `projects/${this.projectId}/locations/${this.location}/processors/${this.processorId}`;

            // Using processDocument (Online Processing) pointing to GCS URI
            // This is suitable for single document immediate response
            const [result] = await this.client.processDocument({
                name,
                gcsDocument: {
                    gcsUri: `gs://${this.bucketName}/${gcsFileName}`,
                    mimeType
                },
                processOptions: {
                    // Optional: distinct from batch processing
                }
            });

            const document = result.document;
            const text = document?.text || '';
            const pageCount = document?.pages?.length || 0;

            this.logger.log(`✅ Document processed. Extracted ${text.length} chars from ${pageCount} pages.`);

            // 3. Cleanup GCS (Fire and forget, or await)
            // Await to ensure we don't leak storage if this fails, but catch errors to not fail main flow if delete fails
            try {
                await file.delete();
            } catch (cleanupErr) {
                this.logger.warn(`Failed to delete temp file ${gcsFileName}: ${cleanupErr.message}`);
            }

            let finalText = text;
            if (wasTruncated) {
                finalText = `⚠️ [SYSTEM NOTE: DOCUMENT TRUNCATED. ANALYZING FIRST 15 PAGES OF ${originalPageCount}. ASSUME POTENTIAL OF HIDDEN CONTENT.]\n\n${text}`;
            }

            return {
                extractedText: finalText,
                pageCount
            };

        } catch (error) {
            this.logger.error(`Error processing document with ID ${fileId}:`, error);
            // Attempt cleanup on error
            try {
                const bucket = this.storage.bucket(this.bucketName);
                await bucket.file(gcsFileName).delete().catch(() => { });
            } catch (e) { }

            throw error;
        }
    }
}
