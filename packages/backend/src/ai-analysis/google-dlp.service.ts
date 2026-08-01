import { Injectable, Logger } from '@nestjs/common';
import { DlpServiceClient } from '@google-cloud/dlp';
import { createHash } from 'crypto';
import { RedisService } from '../redis/redis.service';

@Injectable()
export class GoogleDlpService {
    private readonly logger = new Logger(GoogleDlpService.name);
    private dlp: DlpServiceClient;
    private projectId: string;

    // Cache config: DLP redaction is deterministic for the same input,
    // so we can safely cache the result for 24h to skip the API call entirely on repeats.
    private readonly REDACT_CACHE_TTL = 86400; // 24 hours
    private readonly REDACT_CACHE_PREFIX = 'dlp:redact:';

    constructor(private readonly redis: RedisService) {
        this.projectId = process.env.GCP_PROJECT_ID;
        const clientEmail = process.env.GCP_CLIENT_EMAIL;
        const privateKey = process.env.GCP_PRIVATE_KEY;

        if (!this.projectId) {
            this.logger.error('Missing GCP_PROJECT_ID in .env');
        }

        try {
            const clientOptions: any = {};

            if (clientEmail && privateKey) {
                this.logger.log('Using explicit GCP Credentials from .env');
                clientOptions.credentials = {
                    client_email: clientEmail,
                    private_key: privateKey.replace(/\\n/g, '\n'),
                };
            } else {
                this.logger.log('Using Application Default Credentials (ADC)');
            }

            this.dlp = new DlpServiceClient(clientOptions);
        } catch (error) {
            this.logger.error('Failed to initialize Google DLP Client', error);
        }
    }

    async redactPii(text: string): Promise<string> {
        if (!text) return text;
        if (!this.dlp) {
            this.logger.warn('DLP Client not initialized, returning original text');
            return text;
        }

        // 1. Check Redis cache. DLP is deterministic for the same input, so identical
        //    text always yields identical redaction.
        const hash = createHash('sha256').update(text).digest('hex');
        const cacheKey = `${this.REDACT_CACHE_PREFIX}${hash}`;

        try {
            const cached = await this.redis.get(cacheKey);
            if (cached !== null) {
                this.logger.debug(`DLP cache HIT (${cacheKey.substring(0, 24)}...)`);
                return cached;
            }
        } catch (cacheReadErr) {
            // Redis read failure is non-fatal: fall through to live DLP call
            this.logger.warn(`DLP cache read failed, falling through to API: ${cacheReadErr.message}`);
        }

        // 2. Cache miss -> call DLP API
        const result = await this.callDlpApi(text);

        // 3. Persist result to cache (fire-and-forget; do not block on write failure)
        try {
            await this.redis.set(cacheKey, result, 'EX', this.REDACT_CACHE_TTL);
        } catch (cacheWriteErr) {
            this.logger.warn(`DLP cache write failed: ${cacheWriteErr.message}`);
        }

        return result;
    }

    /**
     * Live Google DLP API call. Extracted from redactPii() so the cache wrapper
     * can short-circuit it.
     */
    private async callDlpApi(text: string): Promise<string> {
        // Latency Optimization: Truncate payload to max 4KB to ensure <2s response time
        const MAX_PAYLOAD_SIZE = 4096;
        const textToAnalyze = text.length > MAX_PAYLOAD_SIZE
            ? text.substring(0, MAX_PAYLOAD_SIZE)
            : text;

        const startTime = Date.now();

        try {
            const [response] = await this.dlp.deidentifyContent({
                parent: `projects/${this.projectId}/locations/global`,
                deidentifyConfig: {
                    infoTypeTransformations: {
                        transformations: [
                            {
                                primitiveTransformation: {
                                    replaceWithInfoTypeConfig: {},
                                },
                            },
                        ],
                    },
                },
                inspectConfig: {
                    infoTypes: [
                        { name: 'EMAIL_ADDRESS' },
                        { name: 'PHONE_NUMBER' },
                        { name: 'CREDIT_CARD_NUMBER' },
                        { name: 'US_SOCIAL_SECURITY_NUMBER' },
                        { name: 'IBAN_CODE' },
                        { name: 'SWIFT_CODE' },
                        // Cloud & Tech Credentials
                        { name: 'AWS_CREDENTIALS' },
                        { name: 'GCP_API_KEY' },
                        { name: 'GCP_CREDENTIALS' },
                        { name: 'AZURE_AUTH_TOKEN' },
                        { name: 'JSON_WEB_TOKEN' },
                        { name: 'BASIC_AUTH_HEADER' },
                        { name: 'ENCRYPTION_KEY' },
                        { name: 'SSL_CERTIFICATE' },
                        { name: 'PASSWORD' },
                    ],
                    customInfoTypes: [
                        {
                            infoType: { name: 'CONNECTION_STRING' },
                            regex: {
                                pattern: '(?:mongodb(?:\\+srv)?|postgres(?:ql)?|mysql|redis|mssql|jdbc):\\/\\/[a-zA-Z0-9_.-]+:[^@\\s]+@[a-zA-Z0-9_.-]+(?::\\d+)?(?:\\/[a-zA-Z0-9_.-]*)?'
                            },
                            likelihood: 'LIKELY'
                        }
                    ],
                    minLikelihood: 'POSSIBLE',
                },
                item: {
                    value: textToAnalyze,
                },
            });

            const duration = Date.now() - startTime;

            // Debug Logging for DLP
            if (response.item.value !== textToAnalyze) {
                this.logger.log(`DLP Redaction SUCCESS. Original len: ${textToAnalyze.length}, Redacted len: ${response.item.value.length}`);

                if (text.length > MAX_PAYLOAD_SIZE) {
                    return response.item.value + text.substring(MAX_PAYLOAD_SIZE);
                }
                return response.item.value;
            } else {
                this.logger.warn(`DLP Redaction NO CHANGE. Text len: ${textToAnalyze.length}. Input Start: "${textToAnalyze.substring(0, 20)}..."`);
                if (textToAnalyze.includes('DNI')) {
                    this.logger.debug(`[Debug] Text contained 'DNI' keyword but DLP returned no redaction.`);
                }

                // Fallback Redaction (Defense in Depth)
                let fallbackText = textToAnalyze;

                // Credit card numbers (basic Luhn-format)
                const creditCardRegex = /\b\d{4}[\s-]?\d{4}[\s-]?\d{4}[\s-]?\d{4}\b/g;
                // US SSN
                const ssnRegex = /\b\d{3}-\d{2}-\d{4}\b/g;
                // API keys (generic long alphanumeric)
                const apiKeyRegex = /\b[A-Za-z0-9]{32,}\b/g;

                if (creditCardRegex.test(fallbackText)) {
                    this.logger.warn('Fallback Regex caught CREDIT_CARD that DLP missed.');
                    fallbackText = fallbackText.replace(creditCardRegex, '[CREDIT_CARD]');
                }

                if (ssnRegex.test(fallbackText)) {
                    this.logger.warn('Fallback Regex caught SSN that DLP missed.');
                    fallbackText = fallbackText.replace(ssnRegex, '[SSN]');
                }

                // API key detection: only redact if mixed case + digits (likely a key)
                fallbackText = fallbackText.replace(apiKeyRegex, (match) => {
                    if (/[A-Z]/.test(match) && /[a-z]/.test(match) && /\d/.test(match)) {
                        this.logger.warn('Fallback Regex caught API_KEY that DLP missed.');
                        return '[API_KEY]';
                    }
                    return match;
                });

                const emailRegex = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
                const phoneRegex = /(\+\d{1,3}[- ]?)?\(?\d{3}\)?[- ]?\d{3}[- ]?\d{4}/g;

                if (emailRegex.test(fallbackText)) {
                    this.logger.warn('Fallback Regex caught EMAIL that DLP missed.');
                    fallbackText = fallbackText.replace(emailRegex, '[EMAIL_ADDRESS]');
                }

                if (phoneRegex.test(fallbackText)) {
                    this.logger.warn('Fallback Regex caught PHONE that DLP missed.');
                    fallbackText = fallbackText.replace(phoneRegex, '[PHONE_NUMBER]');
                }

                if (fallbackText !== textToAnalyze) {
                    if (text.length > MAX_PAYLOAD_SIZE) {
                        return fallbackText + text.substring(MAX_PAYLOAD_SIZE);
                    }
                    return fallbackText;
                }

                return text;
            }
        } catch (error) {
            this.logger.error('DLP API error, applying regex fallback');
            // Apply regex-based redaction as defense-in-depth when DLP API fails
            let fallbackText = text;
            // Credit card, SSN, API keys
            fallbackText = fallbackText.replace(/\b\d{4}[\s-]?\d{4}[\s-]?\d{4}[\s-]?\d{4}\b/g, '[CREDIT_CARD]');
            fallbackText = fallbackText.replace(/\b\d{3}-\d{2}-\d{4}\b/g, '[SSN]');
            fallbackText = fallbackText.replace(/\b[A-Za-z0-9]{32,}\b/g, (match) => {
                if (/[A-Z]/.test(match) && /[a-z]/.test(match) && /\d/.test(match)) {
                    return '[API_KEY]';
                }
                return match;
            });
            // Email, phone
            const emailRegex = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
            const phoneRegex = /(\+\d{1,3}[- ]?)?\(?\d{3}\)?[- ]?\d{3}[- ]?\d{4}/g;
            fallbackText = fallbackText.replace(emailRegex, '[EMAIL_ADDRESS]');
            fallbackText = fallbackText.replace(phoneRegex, '[PHONE_NUMBER]');
            return fallbackText;
        }
    }

    /**
     * Redact PII from images using Google DLP API
     */
    async redactImagePii(
        imageBase64: string,
        mimeType: string
    ): Promise<{ redactedImage: string; findingsCount: number }> {
        if (!imageBase64) {
            return { redactedImage: imageBase64, findingsCount: 0 };
        }

        if (!this.dlp) {
            this.logger.warn('DLP Client not initialized, returning original image');
            return { redactedImage: imageBase64, findingsCount: 0 };
        }

        const startTime = Date.now();

        try {
            const imageBytes = Buffer.from(imageBase64, 'base64');

            this.logger.log(`DLP Image Redaction: Processing ${mimeType} (${(imageBytes.length / 1024).toFixed(2)} KB)`);

            const response = await this.dlp.redactImage({
                parent: `projects/${this.projectId}/locations/global`,
                byteItem: {
                    type: this.mapMimeTypeToDlpType(mimeType) as any,
                    data: imageBytes,
                },
                inspectConfig: {
                    infoTypes: [
                        { name: 'EMAIL_ADDRESS' },
                        { name: 'PHONE_NUMBER' },
                        { name: 'CREDIT_CARD_NUMBER' },
                        { name: 'US_SOCIAL_SECURITY_NUMBER' },
                        { name: 'IBAN_CODE' },
                        { name: 'SWIFT_CODE' },
                        { name: 'AWS_CREDENTIALS' },
                        { name: 'GCP_API_KEY' },
                        { name: 'GCP_CREDENTIALS' },
                        { name: 'AZURE_AUTH_TOKEN' },
                        { name: 'JSON_WEB_TOKEN' },
                        { name: 'BASIC_AUTH_HEADER' },
                        { name: 'ENCRYPTION_KEY' },
                        { name: 'SSL_CERTIFICATE' },
                        { name: 'PASSWORD' },
                    ],
                    minLikelihood: 'POSSIBLE',
                },
                imageRedactionConfigs: [
                    {
                        redactionColor: {
                            red: 0,
                            green: 0,
                            blue: 0,
                        },
                    },
                ],
            });

            const duration = Date.now() - startTime;

            const redactImageResponse = response[0];

            const redactedImageBase64 = redactImageResponse?.redactedImage
                ? Buffer.from(redactImageResponse.redactedImage as Uint8Array).toString('base64')
                : imageBase64;

            const findingsCount = redactImageResponse?.redactedImage && redactImageResponse.redactedImage.length !== imageBytes.length
                ? 1
                : 0;

            if (findingsCount > 0) {
                this.logger.log(`DLP Image Redaction SUCCESS: ${findingsCount} findings redacted (${duration}ms)`);
            } else {
                this.logger.log(`DLP Image Redaction: No PII detected (${duration}ms)`);
            }

            return {
                redactedImage: redactedImageBase64,
                findingsCount,
            };
        } catch (error) {
            this.logger.error('Error calling Google DLP redactImage:', error);
            return { redactedImage: imageBase64, findingsCount: 0 };
        }
    }

    /**
     * Map MIME type to DLP BytesType enum
     */
    private mapMimeTypeToDlpType(mimeType: string): string {
        const typeMap: Record<string, string> = {
            'image/png': 'IMAGE_PNG',
            'image/jpeg': 'IMAGE_JPEG',
            'image/jpg': 'IMAGE_JPEG',
            'image/webp': 'IMAGE',
            'image/heic': 'IMAGE',
            'image/heif': 'IMAGE',
        };

        return typeMap[mimeType] || 'IMAGE';
    }
}
