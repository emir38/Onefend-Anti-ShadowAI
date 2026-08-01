import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { RedisService } from '../redis/redis.service';
import { CreateApplicationDto } from './dto/create-application.dto';
import { UpdateApplicationDto } from './dto/update-application.dto';
import { ApplicationCategory } from '@prisma/client';
import { ConfigService } from '../config/config.service';
import { GoogleGeminiService } from '../ai-analysis/google-gemini.service';
import { Logger } from '@nestjs/common';

@Injectable()
export class ApplicationsService {
  private readonly logger = new Logger(ApplicationsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
    private readonly configService: ConfigService,
    private readonly aiService: GoogleGeminiService,
  ) { }

  async create(dto: CreateApplicationDto) {
    // Check if an application with that domain already exists
    const existing = await this.prisma.application.findUnique({
      where: {
        domain: dto.domain,
      },
    });

    if (existing) {
      throw new ConflictException(`Application with domain "${dto.domain}" already exists`);
    }

    const application = await this.prisma.application.create({
      data: {
        domain: dto.domain,
        name: dto.name,
        category: dto.category || ApplicationCategory.UNKNOWN,
        riskScore: dto.riskScore ?? 50,
        metadata: dto.metadata || {},
      },
    });

    await this.configService.invalidateCache();

    // Asynchronously categorize the domain using AI
    this.categorizeAndSaveDomain(application.id, dto.domain);

    return application;
  }

  async categorizeAndSaveDomain(applicationId: string, domain: string) {
    try {
      this.logger.log(`[DomainProfiler] Triggering async analysis for domain: ${domain}`);
      const description = await this.aiService.categorizeDomain(domain);

      await this.prisma.application.update({
        where: { id: applicationId },
        data: { aiDescription: description },
      });

      this.logger.log(`[DomainProfiler] Domain ${domain} categorized successfully`);
      await this.configService.invalidateCache();
    } catch (error) {
      this.logger.error(`[DomainProfiler] Categorization failed for ${domain}`, error);
    }
  }

  async findAll(
    options?: {
      page?: number;
      limit?: number;
      category?: ApplicationCategory;
      search?: string;
      sortBy?: string;
      sortOrder?: 'asc' | 'desc';
    },
  ) {
    const page = options?.page || 1;
    const limit = options?.limit || 50;
    const skip = (page - 1) * limit;
    const sortBy = options?.sortBy || 'createdAt';
    const sortOrder = options?.sortOrder || 'desc';

    const where: any = {};

    if (options?.category) {
      where.category = options.category;
    }

    if (options?.search) {
      where.OR = [
        { name: { contains: options.search, mode: 'insensitive' } },
        { domain: { contains: options.search, mode: 'insensitive' } },
      ];
    }

    const [applications, total] = await Promise.all([
      this.prisma.application.findMany({
        where,
        skip,
        take: limit,
        orderBy: { [sortBy]: sortOrder },
      }),
      this.prisma.application.count({ where }),
    ]);

    return {
      data: applications,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async findOne(id: string) {
    const application = await this.prisma.application.findFirst({
      where: {
        id,
      },
    });

    if (!application) {
      throw new NotFoundException(`Application with ID "${id}" not found`);
    }

    return application;
  }

  async update(id: string, dto: UpdateApplicationDto) {
    // Verify it exists
    await this.findOne(id);

    // If updating the domain, check that no other application has that domain
    if (dto.domain) {
      const existing = await this.prisma.application.findFirst({
        where: {
          domain: dto.domain,
          id: { not: id },
        },
      });

      if (existing) {
        throw new ConflictException(
          `Another application with domain "${dto.domain}" already exists`,
        );
      }
    }

    const data: any = {};
    if (dto.name !== undefined) data.name = dto.name;
    if (dto.domain !== undefined) data.domain = dto.domain;
    if (dto.category !== undefined) data.category = dto.category;
    if (dto.riskScore !== undefined) data.riskScore = dto.riskScore;
    if (dto.isBlocked !== undefined) data.isBlocked = dto.isBlocked;
    if (dto.metadata !== undefined) data.metadata = dto.metadata;

    const application = await this.prisma.application.update({
      where: { id },
      data,
    });

    await this.configService.invalidateCache();
    return application;
  }

  async remove(id: string) {
    // Verify it exists
    await this.findOne(id);

    await this.prisma.application.delete({
      where: { id },
    });

    await this.configService.invalidateCache();
    return { success: true, message: 'Application deleted successfully' };
  }

  async removeBatch(ids: string[]) {
    const result = await this.prisma.application.deleteMany({
      where: {
        id: { in: ids },
      },
    });

    await this.configService.invalidateCache();
    return {
      success: true,
      count: result.count,
      message: `Successfully deleted ${result.count} applications`,
    };
  }


}
