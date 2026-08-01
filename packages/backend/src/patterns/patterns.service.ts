import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateSensitiveDataPatternDto } from './dto/create-pattern.dto';
import { UpdateSensitiveDataPatternDto } from './dto/update-pattern.dto';

@Injectable()
export class PatternsService {
  constructor(private prisma: PrismaService) { }

  async create(dto: CreateSensitiveDataPatternDto) {
    return this.prisma.sensitiveDataPattern.create({
      data: {
        ...dto,
      },
    });
  }

  async findAll(
    params?: {
      page?: number;
      limit?: number;
      category?: string;
      enabled?: boolean;
    },
  ) {
    const page = params?.page || 1;
    const limit = params?.limit || 50;
    const skip = (page - 1) * limit;

    const where: any = {};

    if (params?.category) {
      where.category = params.category;
    }

    if (params?.enabled !== undefined) {
      where.enabled = params.enabled;
    }

    const patterns = await this.prisma.sensitiveDataPattern.findMany({
      where,
      orderBy: [
        { createdAt: 'desc' },
      ],
    });

    const total = patterns.length;

    // Manual Pagination
    const startIndex = (page - 1) * limit;
    const endIndex = startIndex + limit;
    const data = patterns.slice(startIndex, endIndex);

    return {
      data: data.map((p) => ({
        ...p,
        isBuiltIn: false,
        regex: p.pattern, // Helper for frontend compatibility if it expects 'regex'
      })),
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async findOne(id: string) {
    const pattern = await this.prisma.sensitiveDataPattern.findFirst({
      where: { id },
    });

    if (!pattern) {
      throw new NotFoundException(`Pattern with ID ${id} not found`);
    }

    return pattern;
  }

  async update(id: string, dto: UpdateSensitiveDataPatternDto) {
    const pattern = await this.findOne(id);

    return this.prisma.sensitiveDataPattern.update({
      where: { id },
      data: dto,
    });
  }

  async remove(id: string) {
    const pattern = await this.findOne(id);

    return this.prisma.sensitiveDataPattern.delete({
      where: { id },
    });
  }

  // Get active patterns for extension sync
  async getActivePatterns() {
    const patterns = await this.prisma.sensitiveDataPattern.findMany({
      where: {
        enabled: true,
      },
      select: {
        id: true,
        name: true,
        category: true,
        pattern: true,
        severity: true,
        defaultAction: true,
        caseSensitive: true,
      },
    });

    console.log(`[Patterns] Fetched ${patterns.length} active patterns`);

    // Map 'pattern' to 'regex' for extension compatibility
    return {
      patterns: patterns.map((p) => ({
        id: p.id,
        name: p.name,
        category: p.category,
        regex: p.pattern,
        severity: p.severity,
        action: p.defaultAction,
        caseSensitive: p.caseSensitive,
      })),
    };
  }

  async getStats(id: string) {
    // Ensure pattern exists
    await this.findOne(id);

    // Calculate date ranges
    const now = new Date();
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    // Aggregation for 7 days
    const last7Days = await this.prisma.conversationEvent.count({
      where: {
        timestamp: { gte: sevenDaysAgo },
        patternMatches: {
          array_contains: [{ patternId: id }],
        },
      },
    });

    // Aggregation for 30 days
    const last30Days = await this.prisma.conversationEvent.count({
      where: {
        timestamp: { gte: thirtyDaysAgo },
        patternMatches: {
          array_contains: [{ patternId: id }],
        },
      },
    });

    const total = await this.prisma.conversationEvent.count({
      where: {
        patternMatches: {
          array_contains: [{ patternId: id }],
        },
      },
    });

    // Get last detected at
    const lastEvent = await this.prisma.conversationEvent.findFirst({
      where: {
        patternMatches: {
          array_contains: [{ patternId: id }],
        },
      },
      orderBy: { timestamp: 'desc' },
      select: { timestamp: true },
    });

    return {
      totalDetections: total,
      lastDetectedAt: lastEvent?.timestamp || null,
      detectionsLast7Days: last7Days,
      detectionsLast30Days: last30Days,
    };
  }

  testPattern(
    regex: string,
    testString: string,
    options: { caseSensitive?: boolean; multiline?: boolean } = {},
  ) {
    try {
      const flags = (options.caseSensitive ? '' : 'i') + (options.multiline ? 'm' : '') + 'g';
      const re = new RegExp(regex, flags);
      const matches = testString.match(re);
      return {
        isValid: true,
        hasMatch: !!matches,
        matches: matches || [],
      };
    } catch (e) {
      throw new BadRequestException('Invalid regex pattern: ' + e.message);
    }
  }

  private validateRegex(regex: string) {
    try {
      new RegExp(regex);
    } catch (e) {
      throw new BadRequestException('Invalid regex pattern: ' + e.message);
    }
  }
}
