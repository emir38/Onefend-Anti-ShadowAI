import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ApplicationCategory, PolicyAction } from '@prisma/client';
import { ConfigService } from '../config/config.service';
import { ApplicationsService } from '../applications/applications.service';

@Injectable()
export class DiscoveryService {
  private readonly logger = new Logger(DiscoveryService.name);

  // List of globally known AI domains
  private readonly KNOWN_AI_DOMAINS = new Map([
    ['chat.openai.com', { category: ApplicationCategory.AI_ASSISTANT, riskScore: 75 }],
    ['gemini.google.com', { category: ApplicationCategory.AI_ASSISTANT, riskScore: 70 }],
    ['claude.ai', { category: ApplicationCategory.AI_ASSISTANT, riskScore: 70 }],
    ['copilot.microsoft.com', { category: ApplicationCategory.AI_ASSISTANT, riskScore: 65 }],
    ['bard.google.com', { category: ApplicationCategory.AI_ASSISTANT, riskScore: 70 }],
    ['perplexity.ai', { category: ApplicationCategory.AI_ASSISTANT, riskScore: 65 }],
  ]);

  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
    private readonly applicationsService: ApplicationsService,
  ) { }

  async processDomainDiscovery(_userId: string, domain: string) {
    const normalizedDomain = this.normalizeDomain(domain);

    // 1. Check if it already exists
    const application = await this.prisma.application.findUnique({
      where: { domain: normalizedDomain },
      include: {
        policies: {
          orderBy: { priority: 'desc' },
          take: 1,
        },
      },
    });

    if (application) {
      this.logger.debug(`Domain ${normalizedDomain} already exists`);
      return {
        domain: normalizedDomain,
        action: application.policies[0]?.action || PolicyAction.ALLOW,
        category: application.category,
        riskScore: application.riskScore,
        isKnown: application.isKnown,
      };
    }

    // 2. Classify domain
    const classification = this.classifyDomain(normalizedDomain);

    // 3. Create new record
    const newApplication = await this.prisma.application.create({
      data: {
        domain: normalizedDomain,
        category: classification.category,
        riskScore: classification.riskScore,
        isKnown: classification.isKnown,
        name: this.extractAppName(normalizedDomain),
      },
    });

    this.logger.log(
      `New application discovered: ${newApplication.domain} (${classification.category})`,
    );

    // Trigger AI categorization asynchronously
    this.applicationsService.categorizeAndSaveDomain(newApplication.id, normalizedDomain).catch(err => {
      this.logger.error(`Failed to trigger categorization for ${normalizedDomain}`, err);
    });

    // 4. Invalidate cache
    await this.configService.invalidateCache();

    // 5. Return recommendation
    const recommendedAction =
      classification.isKnown && classification.category === ApplicationCategory.AI_ASSISTANT
        ? PolicyAction.WARN
        : PolicyAction.ALLOW;

    return {
      domain: normalizedDomain,
      action: recommendedAction,
      category: classification.category,
      riskScore: classification.riskScore,
      isKnown: classification.isKnown,
    };
  }

  private classifyDomain(domain: string): {
    category: ApplicationCategory;
    riskScore: number;
    isKnown: boolean;
  } {
    const knownApp = this.KNOWN_AI_DOMAINS.get(domain);
    if (knownApp) {
      return {
        ...knownApp,
        isKnown: true,
      };
    }

    if (domain.includes('chat') || domain.includes('ai') || domain.includes('gpt')) {
      return {
        category: ApplicationCategory.AI_ASSISTANT,
        riskScore: 80,
        isKnown: false,
      };
    }

    if (domain.includes('drive') || domain.includes('dropbox') || domain.includes('box')) {
      return {
        category: ApplicationCategory.CLOUD_STORAGE,
        riskScore: 60,
        isKnown: false,
      };
    }

    if (domain.includes('slack') || domain.includes('teams') || domain.includes('zoom')) {
      return {
        category: ApplicationCategory.COMMUNICATION,
        riskScore: 50,
        isKnown: false,
      };
    }

    return {
      category: ApplicationCategory.UNKNOWN,
      riskScore: 50,
      isKnown: false,
    };
  }

  private normalizeDomain(url: string): string {
    try {
      const { parse } = require('tldts');
      let hostname = url.startsWith('http') ? new URL(url).hostname : url;
      const parsed = parse(hostname);
      return parsed.domain || hostname.toLowerCase().trim();
    } catch {
      return url.toLowerCase().trim();
    }
  }

  private extractAppName(domain: string): string {
    const parts = domain.split('.');
    return parts.length >= 2 ? parts[parts.length - 2] : domain;
  }
}
