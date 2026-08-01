import { Injectable, Inject, forwardRef } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { LogConversationEventDto } from './dto/log-conversation-event.dto';

import { AlertsService } from '../alerts/alerts.service';
import { LogExporterService } from '../integrations/log-exporter.service';
import { DetectionPatternsService } from '../detection-patterns/detection-patterns.service';

import { ApplicationsService } from '../applications/applications.service';

@Injectable()
export class ConversationEventsService {
  constructor(
    private prisma: PrismaService,
    private alertsService: AlertsService,
    private logExporter: LogExporterService,
    private patternsService: DetectionPatternsService,
    @Inject(forwardRef(() => ApplicationsService))
    private applicationsService: ApplicationsService,
  ) { }

  private async normalizeAndResolveApp(domain?: string, existingAppId?: string): Promise<string | null> {
    if (existingAppId) return existingAppId;
    if (!domain) return null;

    let normalizedDomain = domain;
    try {
      const { parse } = require('tldts');
      const parsed = parse(domain);
      if (parsed.domain) normalizedDomain = parsed.domain;
    } catch {
      normalizedDomain = domain.toLowerCase().trim();
    }

    let app = await this.prisma.application.findFirst({
      where: { domain: normalizedDomain },
    });

    if (!app) {
      app = await this.prisma.application.create({
        data: {
          domain: normalizedDomain,
          name: normalizedDomain,
          category: 'UNKNOWN',
          riskScore: 0,
          isBlocked: false,
        },
      });
      this.applicationsService.categorizeAndSaveDomain(app.id, normalizedDomain).catch(() => { });
    }
    return app.id;
  }

  async log(userId: string, dto: LogConversationEventDto) {
    const resolvedAppId = await this.normalizeAndResolveApp(dto.domain, dto.applicationId);
    let evidence = dto.evidence;
    if (evidence) {
      try {
        const patterns = await this.patternsService.findAll();
        for (const p of patterns) {
          try {
            const flags = (p.caseSensitive ? '' : 'i') + 'g';
            const re = new RegExp(p.regex, flags);
            evidence = evidence.replace(re, `[${p.category.toUpperCase()}]`);
          } catch (e) {
            console.warn(`[Redaction] Pattern ${p.id} (${p.name}) failed during redaction:`, e?.message);
          }
        }
      } catch (e) {
        console.error('Redaction error:', e);
      }
    }

    const createdEvent = await this.prisma.conversationEvent.create({
      data: {
        userId,
        deviceId: dto.deviceId,
        applicationId: resolvedAppId,
        platform: dto.platform,
        conversationId: dto.conversationId,
        messageCount: dto.messageCount || 1,
        sensitiveDataDetected: dto.sensitiveDataDetected,
        dataTypes: dto.dataTypes,
        riskLevel: dto.riskLevel,
        action: dto.action,
        userOverride: dto.userOverride || false,
        justification: dto.justification,
        inputLength: dto.inputLength,
        patternMatches: dto.patternMatches,
        analysisSource: dto.analysisSource,
        confidence: dto.confidence,
        evidence: evidence,
        aiCategory: dto.aiCategory,
        aiRiskLevel: dto.aiRiskLevel,
        aiSummary: dto.aiSummary,
      },
    });

    // Trigger alerts check asynchronously
    this.alertsService
      .checkAlerts(createdEvent)
      .catch((err) => console.error('Error triggering alerts:', err));

    // Trigger Log Exporter asynchronously
    this.logExporter
      .exportEvent(createdEvent)
      .catch((err) => console.error('Error exporting event:', err));

    return createdEvent;
  }

  async logBatch(userId: string, dtos: LogConversationEventDto[]) {
    // Fetch patterns once for efficiency
    let patterns = [];
    try {
      patterns = await this.patternsService.findAll();
    } catch (e) {
      console.error('Failed to fetch patterns for batch redaction', e);
    }

    const data = await Promise.all(dtos.map(async (dto) => {
      let evidence = dto.evidence;
      if (evidence && patterns.length > 0) {
        for (const p of patterns) {
          try {
            const flags = (p.caseSensitive ? '' : 'i') + 'g';
            const re = new RegExp(p.regex, flags);
            evidence = evidence.replace(re, `[${p.category.toUpperCase()}]`);
          } catch (e) {
            console.warn(`[Redaction] Pattern ${p.id} (${p.name}) failed during redaction:`, e?.message);
          }
        }
      }

      const resolvedAppId = await this.normalizeAndResolveApp(dto.domain, dto.applicationId);

      return {
        userId,
        deviceId: dto.deviceId,
        applicationId: resolvedAppId,
        platform: dto.platform,
        conversationId: dto.conversationId,
        messageCount: dto.messageCount || 1,
        sensitiveDataDetected: dto.sensitiveDataDetected,
        dataTypes: dto.dataTypes,
        riskLevel: dto.riskLevel,
        action: dto.action,
        userOverride: dto.userOverride || false,
        justification: dto.justification,
        inputLength: dto.inputLength,
        patternMatches: dto.patternMatches,
        analysisSource: dto.analysisSource,
        confidence: dto.confidence,
        evidence: dto.evidence,
        aiCategory: dto.aiCategory,
        aiRiskLevel: dto.aiRiskLevel,
        aiSummary: dto.aiSummary,
      }; // end of map return
    }));

    const result = await this.prisma.conversationEvent.createMany({
      data,
    });

    // For batch, we ideally check individual high risk events, but since createMany doesn't return created objects,
    // we might only check simple thresholds or skip detailed content alerting for now to save perf,
    // or re-fetch if critical.
    // For this phase, we'll just check if any in the batch was critical before insertion (from DTOs).
    data.forEach((eventData) => {
      if (eventData.riskLevel === 'HIGH' || eventData.riskLevel === 'CRITICAL') {
        this.alertsService
          .checkAlerts(eventData)
          .catch((err) => console.error('Error batch alert:', err));
      }
    });

    return result;
  }

  async findAll(
    params?: {
      page?: number;
      limit?: number;
      userId?: string;
      applicationId?: string;
      platform?: string;
      riskLevel?: string;
      action?: string;
      dataType?: string;
      sensitiveData?: boolean;
      startDate?: Date;
      endDate?: Date;
      sortBy?: string;
      sortOrder?: 'asc' | 'desc';
    },
  ) {
    const page = params?.page || 1;
    const limit = params?.limit || 50;
    const skip = (page - 1) * limit;

    const where: any = {};

    if (params?.userId) {
      where.userId = params.userId;
    }

    if (params?.applicationId) {
      where.applicationId = params.applicationId;
    }

    if (params?.platform) {
      where.platform = params.platform;
    }

    if (params?.riskLevel) {
      where.riskLevel = params.riskLevel;
    }

    if (params?.action) {
      where.action = params.action;
    }

    if (params?.dataType) {
      where.dataTypes = {
        array_contains: params.dataType,
      };
    }

    if (params?.sensitiveData !== undefined) {
      where.sensitiveDataDetected = params.sensitiveData;
    }

    if (params?.startDate || params?.endDate) {
      where.timestamp = {};
      if (params.startDate) {
        where.timestamp.gte = params.startDate;
      }
      if (params.endDate) {
        where.timestamp.lte = params.endDate;
      }
    }

    const orderBy: any = {};
    const sortBy = params?.sortBy || 'timestamp';
    const sortOrder = params?.sortOrder || 'desc';
    orderBy[sortBy] = sortOrder;

    const [data, total] = await Promise.all([
      this.prisma.conversationEvent.findMany({
        where,
        skip,
        take: limit,
        orderBy,
        include: {
          user: {
            select: {
              id: true,
              identifier: true,
            },
          },
          application: {
            select: {
              id: true,
              name: true,
              domain: true,
              aiDescription: true,
            },
          },
          device: {
            select: {
              id: true,
              deviceInfo: true,
            },
          },
        },
      }),
      this.prisma.conversationEvent.count({ where }),
    ]);

    return {
      data,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  // Analytics: Get summary statistics
  async getStats(
    startDate?: Date,
    endDate?: Date,
    platform?: string,
    riskLevel?: string,
    action?: string,
  ) {
    const where: any = {};

    if (startDate || endDate) {
      where.timestamp = {};
      if (startDate) where.timestamp.gte = startDate;
      if (endDate) where.timestamp.lte = endDate;
    }

    // Add filters
    if (platform) where.platform = platform;
    if (riskLevel) where.riskLevel = riskLevel;
    if (action) where.action = action;

    const [totalEvents, sensitiveDataDetected, byRiskLevel, byAction, byPlatform, byAnalysisSource] =
      await Promise.all([
        this.prisma.conversationEvent.count({ where }),
        this.prisma.conversationEvent.count({
          where: { ...where, sensitiveDataDetected: true },
        }),
        this.prisma.conversationEvent.groupBy({
          by: ['riskLevel'],
          where,
          _count: true,
        }),
        this.prisma.conversationEvent.groupBy({
          by: ['action'],
          where,
          _count: true,
        }),
        this.prisma.conversationEvent.groupBy({
          by: ['platform'],
          where,
          _count: true,
        }),
        this.prisma.conversationEvent.groupBy({
          by: ['analysisSource'],
          where,
          _count: true,
        }),
      ]);

    return {
      totalEvents,
      sensitiveDataDetected,
      byRiskLevel,
      byAction,
      byPlatform,
      byAnalysisSource,
    };
  }

  // Analytics: Get trends (events grouped by day or hour)
  async getTrends(
    startDate?: Date,
    endDate?: Date,
    groupBy: 'day' | 'hour' = 'day',
  ) {
    const where: any = {};

    if (startDate || endDate) {
      where.timestamp = {};
      if (startDate) where.timestamp.gte = startDate;
      if (endDate) where.timestamp.lte = endDate;
    }

    const events = await this.prisma.conversationEvent.findMany({
      where,
      select: {
        timestamp: true,
      },
      orderBy: {
        timestamp: 'asc',
      },
    });

    const grouped = new Map<string, number>();

    events.forEach((event) => {
      const date = new Date(event.timestamp);
      let key: string;

      if (groupBy === 'day') {
        key = date.toISOString().split('T')[0];
      } else {
        const hour = date.getHours().toString().padStart(2, '0');
        key = `${date.toISOString().split('T')[0]} ${hour}:00`;
      }

      grouped.set(key, (grouped.get(key) || 0) + 1);
    });

    return Array.from(grouped.entries())
      .map(([date, count]) => ({ date, count }))
      .sort((a, b) => a.date.localeCompare(b.date));
  }

  // Analytics: Get top users by event count
  async getTopUsers(
    startDate?: Date,
    endDate?: Date,
    limit: number = 5,
    platform?: string,
    riskLevel?: string,
    action?: string,
  ) {
    const where: any = {};

    if (startDate || endDate) {
      where.timestamp = {};
      if (startDate) where.timestamp.gte = startDate;
      if (endDate) where.timestamp.lte = endDate;
    }

    // Add filters
    if (platform) where.platform = platform;
    if (riskLevel) where.riskLevel = riskLevel;
    if (action) where.action = action;

    const result = await this.prisma.conversationEvent.groupBy({
      by: ['userId'],
      where,
      _count: true,
      orderBy: {
        _count: {
          userId: 'desc',
        },
      },
      take: limit,
    });

    const userIds = result.map((r) => r.userId);
    const users = await this.prisma.user.findMany({
      where: {
        id: { in: userIds },
      },
      select: {
        id: true,
        identifier: true,
      },
    });

    const userMap = new Map(users.map((u) => [u.id, u.identifier]));

    return result.map((r) => ({
      userId: r.userId,
      userName: userMap.get(r.userId) || 'Unknown',
      count: r._count,
    }));
  }

  // Analytics: Get top applications by event count
  async getTopApps(
    startDate?: Date,
    endDate?: Date,
    limit: number = 5,
    platform?: string,
    riskLevel?: string,
    action?: string,
  ) {
    const where: any = { applicationId: { not: null } };

    if (startDate || endDate) {
      where.timestamp = {};
      if (startDate) where.timestamp.gte = startDate;
      if (endDate) where.timestamp.lte = endDate;
    }

    // Add filters
    if (platform) where.platform = platform;
    if (riskLevel) where.riskLevel = riskLevel;
    if (action) where.action = action;

    const result = await this.prisma.conversationEvent.groupBy({
      by: ['applicationId'],
      where,
      _count: true,
      orderBy: {
        _count: {
          applicationId: 'desc',
        },
      },
      take: limit,
    });

    const appIds = result.map((r) => r.applicationId).filter((id): id is string => id !== null);

    const apps = await this.prisma.application.findMany({
      where: {
        id: { in: appIds },
      },
      select: {
        id: true,
        name: true,
        domain: true,
      },
    });

    const appMap = new Map(apps.map((a) => [a.id, { name: a.name, domain: a.domain }]));

    return result.map((r) => ({
      applicationId: r.applicationId!,
      appName: appMap.get(r.applicationId!)?.name || 'Unknown',
      appDomain: appMap.get(r.applicationId!)?.domain || '',
      count: r._count,
    }));
  }

  // Analytics: Get timeline (events by time interval with risk breakdown)
  async getTimeline(
    startDate?: Date,
    endDate?: Date,
    interval: 'hour' | 'day' = 'hour',
    platform?: string,
    riskLevel?: string,
    action?: string,
  ) {
    const where: any = {};

    if (startDate || endDate) {
      where.timestamp = {};
      if (startDate) where.timestamp.gte = startDate;
      if (endDate) where.timestamp.lte = endDate;
    }

    // Add filters
    if (platform) where.platform = platform;
    if (riskLevel) where.riskLevel = riskLevel;
    if (action) where.action = action;

    const events = await this.prisma.conversationEvent.findMany({
      where,
      select: {
        timestamp: true,
        riskLevel: true,
      },
      orderBy: {
        timestamp: 'asc',
      },
    });

    const grouped = new Map<string, { total: number; high: number; medium: number; low: number }>();

    events.forEach((event) => {
      const date = new Date(event.timestamp);
      let key: string;

      if (interval === 'day') {
        key = date.toISOString().split('T')[0];
      } else {
        const hour = date.getHours().toString().padStart(2, '0');
        key = `${date.toISOString().split('T')[0]} ${hour}:00`;
      }

      if (!grouped.has(key)) {
        grouped.set(key, { total: 0, high: 0, medium: 0, low: 0 });
      }

      const stats = grouped.get(key)!;
      stats.total++;

      if (event.riskLevel === 'HIGH') stats.high++;
      else if (event.riskLevel === 'MEDIUM') stats.medium++;
      else if (event.riskLevel === 'LOW') stats.low++;
    });

    return Array.from(grouped.entries())
      .map(([timestamp, stats]) => ({
        timestamp,
        ...stats,
      }))
      .sort((a, b) => a.timestamp.localeCompare(b.timestamp));
  }

  // Analytics: Get top detected patterns from data_types JSON array
  async getTopPatterns(startDate?: Date, endDate?: Date, limit: number = 5) {
    try {
      const { Prisma } = await import('@prisma/client');

      const result = await this.prisma.$queryRaw<any[]>`
        SELECT UPPER(value) as name, COUNT(*)::int as count
        FROM (
          SELECT jsonb_array_elements_text(
            CASE
              WHEN jsonb_typeof(data_types) = 'array' THEN data_types
              ELSE '[]'::jsonb
            END
          ) as value
          FROM "conversation_events"
          WHERE 1=1
            ${startDate ? Prisma.sql`AND timestamp >= ${startDate}` : Prisma.empty}
            ${endDate ? Prisma.sql`AND timestamp <= ${endDate}` : Prisma.empty}

          UNION ALL

          SELECT ai_category as value
          FROM "conversation_events"
          WHERE ai_category IS NOT NULL
            AND ai_category != 'General'
            ${startDate ? Prisma.sql`AND timestamp >= ${startDate}` : Prisma.empty}
            ${endDate ? Prisma.sql`AND timestamp <= ${endDate}` : Prisma.empty}
        ) as combined
        WHERE value != 'USER_OVERRIDE'
        GROUP BY UPPER(value)
        ORDER BY count DESC
        LIMIT ${limit}
      `;

      return result.map((r) => ({
        name: r.name,
        count: Number(r.count),
      }));
    } catch (error) {
      console.error('Error fetching top patterns:', error);
      return [];
    }
  }

  // Analytics: Get global risk score (0-100)
  async getRiskScore(startDate?: Date, endDate?: Date) {
    const where: any = {};

    if (startDate || endDate) {
      where.timestamp = {};
      if (startDate) where.timestamp.gte = startDate;
      if (endDate) where.timestamp.lte = endDate;
    }

    const stats = await this.prisma.conversationEvent.groupBy({
      by: ['riskLevel'],
      where,
      _count: true,
    });

    const counts = {
      CRITICAL: 0,
      HIGH: 0,
      MEDIUM: 0,
      LOW: 0,
      TOTAL: 0,
    };

    stats.forEach((s) => {
      counts[s.riskLevel] = s._count;
      counts.TOTAL += s._count;
    });

    if (counts.TOTAL === 0) return 100; // No risk

    // Weighted Score Calculation
    const totalRiskPoints =
      counts.CRITICAL * 10 + counts.HIGH * 5 + counts.MEDIUM * 2 + counts.LOW * 1;

    const maxPossiblePoints = counts.TOTAL * 10;
    const riskPercentage = (totalRiskPoints / maxPossiblePoints) * 100;

    return Math.round(100 - riskPercentage);
  }
}
