
import { Test, TestingModule } from '@nestjs/testing';
import { GoogleDlpService } from './google-dlp.service';
import { RedisService } from '../redis/redis.service';
import * as dotenv from 'dotenv';
import * as path from 'path';

// Load environment variables from the backend package .env
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

describe('GoogleDlpService', () => {
    let service: GoogleDlpService;

    // In-memory Redis mock so the cache wrapper around redactPii() doesn't
    // require a real Redis connection during unit tests.
    const redisMock: Partial<RedisService> = {
        get: jest.fn().mockResolvedValue(null),
        set: jest.fn().mockResolvedValue('OK'),
    };

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [
                GoogleDlpService,
                { provide: RedisService, useValue: redisMock },
            ],
        }).compile();

        service = module.get<GoogleDlpService>(GoogleDlpService);
    });

    it('should be defined', () => {
        expect(service).toBeDefined();
    });

    // ============================================================================
    // TEXT REDACTION TESTS (Existing)
    // ============================================================================

    it('should redact Argentina DNI', async () => {
        const input = 'My Argentina DNI is 21.123.236';
        const result = await service.redactPii(input);

        console.log('--- DLP TEXT TEST ---');
        console.log('Input:', input);
        console.log('Result:', result);
        console.log('---------------------');

        expect(result).not.toContain('21.123.236');
        expect(result.length).toBeGreaterThan(0);
    }, 30000);

    describe('redactImagePii', () => {
        /**
         * Test 1: Image with PII (simulated with a 1x1 PNG)
         * Note: Real PII detection requires actual text in the image
         * This test validates the method works without errors
         */
        it('should process image without errors', async () => {
            // 1x1 transparent PNG (base64)
            const base64Image = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';

            const result = await service.redactImagePii(base64Image, 'image/png');

            console.log('--- DLP IMAGE TEST 1 ---');
            console.log('Input MIME:', 'image/png');
            console.log('Input Size:', base64Image.length, 'bytes');
            console.log('Output Size:', result.redactedImage.length, 'bytes');
            console.log('Findings:', result.findingsCount);
            console.log('------------------------');

            expect(result).toBeDefined();
            expect(result.redactedImage).toBeDefined();
            expect(result.findingsCount).toBeGreaterThanOrEqual(0);
            expect(typeof result.redactedImage).toBe('string');
        }, 30000);

        /**
         * Test 2: Empty image data
         */
        it('should handle empty image gracefully', async () => {
            const result = await service.redactImagePii('', 'image/png');

            expect(result).toBeDefined();
            expect(result.redactedImage).toBe('');
            expect(result.findingsCount).toBe(0);
        }, 10000);

        /**
         * Test 3: Different MIME types
         */
        it('should handle JPEG images', async () => {
            // 1x1 red JPEG (base64)
            const base64Jpeg = '/9j/4AAQSkZJRgABAQEAYABgAAD/2wBDAAgGBgcGBQgHBwcJCQgKDBQNDAsLDBkSEw8UHRofHh0aHBwgJC4nICIsIxwcKDcpLDAxNDQ0Hyc5PTgyPC4zNDL/2wBDAQkJCQwLDBgNDRgyIRwhMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjL/wAARCAABAAEDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAv/xAAUEAEAAAAAAAAAAAAAAAAAAAAA/8QAFQEBAQAAAAAAAAAAAAAAAAAAAAX/xAAUEQEAAAAAAAAAAAAAAAAAAAAA/9oADAMBAAIRAxEAPwCwAA8A/9k=';

            const result = await service.redactImagePii(base64Jpeg, 'image/jpeg');

            console.log('--- DLP IMAGE TEST 3 ---');
            console.log('MIME Type:', 'image/jpeg');
            console.log('Processed:', result.redactedImage.length > 0);
            console.log('------------------------');

            expect(result).toBeDefined();
            expect(result.redactedImage).toBeDefined();
        }, 30000);

        /**
         * Test 4: Unsupported MIME type (should still work with generic IMAGE type)
         */
        it('should handle unsupported MIME types with fallback', async () => {
            const base64Image = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';

            const result = await service.redactImagePii(base64Image, 'image/webp');

            expect(result).toBeDefined();
            expect(result.redactedImage).toBeDefined();
        }, 30000);

        /**
         * Test 5: Large image handling
         * Tests that the service can handle reasonably sized images
         */
        it('should handle larger images', async () => {
            // Create a larger base64 string (simulating a bigger image)
            const smallImage = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';
            const largerImage = smallImage.repeat(10); // Simulate larger payload

            const result = await service.redactImagePii(largerImage, 'image/png');

            console.log('--- DLP IMAGE TEST 5 ---');
            console.log('Input Size:', largerImage.length, 'bytes');
            console.log('Processed successfully:', !!result.redactedImage);
            console.log('------------------------');

            expect(result).toBeDefined();
            expect(result.redactedImage).toBeDefined();
        }, 30000);

        /**
         * Test 6: Return type validation
         */
        it('should return correct structure', async () => {
            const base64Image = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';

            const result = await service.redactImagePii(base64Image, 'image/png');

            // Validate return structure
            expect(result).toHaveProperty('redactedImage');
            expect(result).toHaveProperty('findingsCount');
            expect(typeof result.redactedImage).toBe('string');
            expect(typeof result.findingsCount).toBe('number');
            expect(result.findingsCount).toBeGreaterThanOrEqual(0);
        }, 30000);
    });
});
