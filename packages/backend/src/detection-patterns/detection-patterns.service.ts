import {
  Injectable,
  BadRequestException,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateDetectionPatternDto } from './dto/create-detection-pattern.dto';
import { UpdateDetectionPatternDto } from './dto/update-detection-pattern.dto';
import { ConfigService } from '../config/config.service';

@Injectable()
export class DetectionPatternsService {
  constructor(
    private prisma: PrismaService,
    private configService: ConfigService,
  ) { }

  async create(dto: CreateDetectionPatternDto) {
    this.validateRegex(dto.regex);

    const pattern = await this.prisma.detectionPattern.create({
      data: {
        ...dto,
        isBuiltIn: false,
      },
    });

    await this.configService.invalidateCache();

    return pattern;
  }

  async findAll() {
    return this.prisma.detectionPattern.findMany({
      orderBy: [
        { isBuiltIn: 'desc' }, // Built-in first
        { name: 'asc' },
      ],
    });
  }

  async findOne(id: string) {
    const pattern = await this.prisma.detectionPattern.findUnique({
      where: { id },
    });

    if (!pattern) {
      throw new NotFoundException(`Pattern with ID ${id} not found`);
    }

    return pattern;
  }

  async update(id: string, dto: UpdateDetectionPatternDto) {
    const pattern = await this.findOne(id);

    if (dto.regex) {
      this.validateRegex(dto.regex);
    }

    const updated = await this.prisma.detectionPattern.update({
      where: { id },
      data: dto,
    });

    await this.configService.invalidateCache();

    return updated;
  }

  async getStats(id: string) {
    const pattern = await this.findOne(id);

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

  async remove(id: string) {
    const pattern = await this.findOne(id);

    if (pattern.isBuiltIn) {
      throw new ForbiddenException(
        'Cannot delete built-in patterns. You can disable them instead.',
      );
    }

    await this.prisma.detectionPattern.delete({
      where: { id },
    });

    await this.configService.invalidateCache();

    return { success: true };
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

    // Reject nested quantifiers -- the primary cause of ReDoS attacks.
    if (/\([^()]*[+*][^()]*\)[+*{]/.test(regex)) {
      throw new BadRequestException(
        'Regex contains nested quantifiers (e.g. (a+)+) which can cause severe performance issues. Rewrite the pattern without nesting quantified groups.',
      );
    }
  }
}
