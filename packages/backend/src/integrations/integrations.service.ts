import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateIntegrationDto } from './dto/create-integration.dto';
import { UpdateIntegrationDto } from './dto/update-integration.dto';

@Injectable()
export class IntegrationsService {
  constructor(
    private prisma: PrismaService,
  ) { }

  async create(dto: CreateIntegrationDto) {
    this.validateHost(dto.config);
    return this.prisma.integration.create({
      data: {
        ...dto,
      },
    });
  }

  private validateHost(config: any) {
    if (config && config.host) {
      const forbiddenParams = ['localhost', '127.0.0.1', '0.0.0.0', '::1'];
      if (forbiddenParams.includes(config.host)) {
        throw new Error('Enterprise Policy Violation: Localhost/Loopback addresses are not allowed. Please use a valid remote SIEM/Syslog server.');
      }
    }
  }

  async findAll(
    params?: {
      page?: number;
      limit?: number;
      type?: string;
      isActive?: boolean;
    },
  ) {
    const page = params?.page || 1;
    const limit = params?.limit || 50;
    const skip = (page - 1) * limit;

    const where: any = {};

    if (params?.type) {
      where.type = params.type;
    }

    if (params?.isActive !== undefined) {
      where.isActive = params.isActive;
    }

    const [data, total] = await Promise.all([
      this.prisma.integration.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.integration.count({ where }),
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

  async findOne(id: string) {
    const integration = await this.prisma.integration.findFirst({
      where: { id },
    });

    if (!integration) {
      throw new NotFoundException(`Integration with ID ${id} not found`);
    }

    return integration;
  }

  async update(id: string, dto: UpdateIntegrationDto) {
    await this.findOne(id);

    this.validateHost(dto.config);
    return this.prisma.integration.update({
      where: { id },
      data: dto,
    });
  }

  async remove(id: string) {
    await this.findOne(id);

    return this.prisma.integration.delete({
      where: { id },
    });
  }

  async updateLastSync(id: string) {
    await this.findOne(id);

    return this.prisma.integration.update({
      where: { id },
      data: { lastSyncAt: new Date() },
    });
  }

  // Get active integrations by type
  async getActiveByType(type: string) {
    return this.prisma.integration.findMany({
      where: {
        type: type as any,
        isActive: true,
      },
    });
  }
}
