import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { RedisService } from '../redis/redis.service';
import { matchDomain, findBestDomainMatch } from '../common/utils/domain-matcher';

export interface ConfigResponse {
  applications: Array<{
    domain: string;
    name: string | null;
    action: string;
    riskScore: number;
    category: string;
    description?: string;
  }>;
  policies: Array<{
    applicationId: string;
    domain: string;
    action: string;
    priority: number;
    groupIds: string[];
  }>;
  patterns: Array<{
    id: string;
    name: string;
    regex: string;
    category: string;
    severity: string;
    action: string;
    description?: string;
    isBuiltIn: boolean;
    caseSensitive?: boolean;
    multiline?: boolean;
  }>;
  defaultAction: string;
  syncInterval: number;
  excludedDomains: string[];
  tenantSettings: any;
}

@Injectable()
export class ConfigService {
  private readonly logger = new Logger(ConfigService.name);
  private readonly CACHE_TTL = 300; // 5 minutes (Production value)

  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
  ) { }

  /**
   * Gets the complete configuration for a device/user
   * Includes: known applications, applicable policies, configuration, and DETECTION PATTERNS
   */
  async getConfig(userId: string): Promise<ConfigResponse> {
    const cacheKey = `config:${userId}`;

    // Try to get from cache
    const cached = await this.redis.get(cacheKey);
    if (cached) {
      this.logger.debug(`Config cache hit for ${cacheKey}`);
      return JSON.parse(cached);
    }

    this.logger.debug(`Config cache miss for ${cacheKey}, fetching from DB`);

    // Get user with their groups
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        groupMembers: {
          include: {
            group: true,
          },
        },
      },
    });

    if (!user) {
      throw new Error('User not found');
    }

    const userGroupIds = user.groupMembers.map((gm) => gm.groupId);

    // Get all applications
    const applications = await this.prisma.application.findMany({
      select: {
        id: true,
        domain: true,
        name: true,
        category: true,
        riskScore: true,
        isBlocked: true,
      },
    });

    // Get policies applicable to the user
    const policies = await this.prisma.policy.findMany({
      where: {
        OR: [
          { policyGroups: { some: { groupId: { in: userGroupIds } } } },
          { policyGroups: { none: {} } },
        ],
      },
      include: {
        application: {
          select: {
            domain: true,
          },
        },
        policyGroups: {
          include: {
            group: true,
          },
        },
      },
      orderBy: [{ priority: 'desc' }, { createdAt: 'desc' }],
    });

    // GET ACTIVE DETECTION PATTERNS (Built-in + Custom)
    const patterns = await this.prisma.detectionPattern.findMany({
      where: {
        isActive: true,
      },
      select: {
        id: true,
        name: true,
        regex: true,
        category: true,
        severity: true,
        defaultAction: true,
        description: true,
        isBuiltIn: true,
        caseSensitive: true,
        multiline: true,
      },
      orderBy: { name: 'asc' },
    });

    // Get settings (singleton)
    const settings = await this.prisma.settings.findFirst();

    // Get excluded domains
    const excludedDomains = await this.prisma.excludedDomain.findMany({
      select: { domain: true },
    });

    // Build response
    const config: ConfigResponse = {
      applications: applications.map((app) => ({
        domain: app.domain,
        name: app.name,
        action: app.isBlocked ? 'BLOCK' : 'ALLOW',
        riskScore: app.riskScore,
        category: app.category,
      })),
      policies: policies.map((policy) => ({
        applicationId: policy.applicationId,
        domain: policy.application.domain,
        action: policy.action,
        priority: policy.priority,
        groupIds: policy.policyGroups.map((pg) => pg.groupId),
      })),
      patterns: patterns.map((p) => ({
        id: p.id,
        name: p.name,
        regex: p.regex,
        category: p.category,
        severity: p.severity,
        action: p.defaultAction,
        description: p.description || undefined,
        isBuiltIn: p.isBuiltIn,
        caseSensitive: p.caseSensitive,
        multiline: p.multiline,
      })),
      defaultAction: 'ALLOW',
      syncInterval: 15 * 60 * 1000, // 15 minutes
      excludedDomains: excludedDomains.map((ed) => ed.domain),
      tenantSettings: {
        ...(settings || {}),
      },
    };

    this.logger.debug(
      `Returning config for user ${userId}: ${config.policies.length} policies, ${config.applications.length} apps, ${config.patterns.length} patterns, ${config.excludedDomains.length} excluded domains: ${config.excludedDomains.join(', ')}`,
    );

    // Save to cache
    await this.redis.set(cacheKey, JSON.stringify(config), 'EX', this.CACHE_TTL);

    return config;
  }

  /**
   * Records a heartbeat for a device
   */
  async recordHeartbeat(deviceId: string) {
    await this.prisma.device.update({
      where: { id: deviceId },
      data: { lastSyncAt: new Date() },
    });
  }

  /**
   * Invalidates the configuration cache
   * Should be called when policies or applications are updated
   */
  async invalidateCache(userId?: string) {
    if (userId) {
      const cacheKey = `config:${userId}`;
      await this.redis.del(cacheKey);
      this.logger.log(`Invalidated config cache for ${cacheKey}`);
    } else {
      // Invalidate all config cache entries
      const pattern = `config:*`;
      const keys = await this.redis.keys(pattern);
      if (keys.length > 0) {
        await Promise.all(keys.map((key) => this.redis.del(key)));
        this.logger.log(`Invalidated ${keys.length} config cache entries`);
      }
    }
  }
}
