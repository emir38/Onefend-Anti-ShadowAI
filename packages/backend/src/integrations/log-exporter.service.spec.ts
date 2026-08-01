import { Test, TestingModule } from '@nestjs/testing';
import { LogExporterService } from './log-exporter.service';
import { PrismaService } from '../prisma/prisma.service';
import { IntegrationType, RiskLevel } from '@prisma/client';
import * as net from 'net';

describe('LogExporterService', () => {
    let service: LogExporterService;
    let prismaService: PrismaService;

    const mockPrismaService = {
        integration: {
            findMany: jest.fn(),
        },
    };

    const mockEvent: any = {
        id: 'test-event-id',
        createdAt: new Date(),
        updatedAt: new Date(),
        timestamp: new Date(),
        userId: 'test-user',
        platform: 'TestPlatform',
        riskLevel: 'HIGH', // Use string literal to match enum if needed, or import enum
        action: 'BLOCK',
        sensitiveDataDetected: true,
        aiCategory: 'PII',
        aiSummary: 'Detected PII',
        patternMatches: ['email'],
        userOverride: false,
        overrideReason: null,
        fullPrompt: 'test prompt',
        metadata: {},
    };

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [
                LogExporterService,
                { provide: PrismaService, useValue: mockPrismaService },
            ],
        }).compile();

        service = module.get<LogExporterService>(LogExporterService);
        prismaService = module.get<PrismaService>(PrismaService);
        jest.clearAllMocks();
    });

    it('should be defined', () => {
        expect(service).toBeDefined();
    });

    it('should not export if no integrations found', async () => {
        mockPrismaService.integration.findMany.mockResolvedValue([]);
        await service.exportEvent(mockEvent);
        // Should complete without error
        expect(mockPrismaService.integration.findMany).toHaveBeenCalledWith({
            where: { isActive: true },
        });
    });

    it('should export to webhook successfully', async () => {
        mockPrismaService.integration.findMany.mockResolvedValue([
            {
                id: 'int-1',
                name: 'Test Webhook',
                type: IntegrationType.WEBHOOK,
                config: { url: 'http://test.com/webhook' },
                isActive: true,
            },
        ]);

        global.fetch = jest.fn().mockResolvedValue({
            ok: true,
            status: 200,
        });

        await service.exportEvent(mockEvent);

        expect(fetch).toHaveBeenCalledWith('http://test.com/webhook', expect.objectContaining({
            method: 'POST',
            body: expect.stringContaining(mockEvent.id),
        }));
    });

    it('should skip syslog export if host is missing', async () => {
        mockPrismaService.integration.findMany.mockResolvedValue([
            {
                id: 'int-2',
                name: 'Test Syslog',
                type: IntegrationType.SYSLOG,
                config: { port: 514, protocol: 'TCP' }, // Missing host
                isActive: true,
            },
        ]);

        // Spy on logger
        const loggerSpy = jest.spyOn((service as any).logger, 'warn');
        await service.exportEvent(mockEvent);
        expect(loggerSpy).toHaveBeenCalledWith(expect.stringContaining('missing host/port'));
    });
});
