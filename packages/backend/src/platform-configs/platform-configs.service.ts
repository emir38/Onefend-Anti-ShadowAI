import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreatePlatformConfigDto } from './dto/create-platform-config.dto';
import { UpdatePlatformConfigDto } from './dto/update-platform-config.dto';

@Injectable()
export class PlatformConfigsService {
  constructor(private prisma: PrismaService) {}

  async create(dto: CreatePlatformConfigDto, isOfficial = false) {
    const existing = await this.prisma.platformConfig.findFirst({
      where: {
        name: dto.name,
      },
    });

    if (existing) {
      throw new ConflictException(`Platform config with name "${dto.name}" already exists`);
    }

    return this.prisma.platformConfig.create({
      data: {
        isOfficial,
        ...dto,
      },
    });
  }

  async findAll(
    params?: {
      page?: number;
      limit?: number;
      category?: string;
      isActive?: boolean;
    },
  ) {
    const page = params?.page || 1;
    const limit = params?.limit || 50;
    const skip = (page - 1) * limit;

    const where: any = {};

    if (params?.category) {
      where.category = params.category;
    }

    if (params?.isActive !== undefined) {
      where.isActive = params.isActive;
    }

    const [data, total] = await Promise.all([
      this.prisma.platformConfig.findMany({
        where,
        skip,
        take: limit,
        orderBy: [{ isOfficial: 'desc' }, { name: 'asc' }],
      }),
      this.prisma.platformConfig.count({ where }),
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
    const config = await this.prisma.platformConfig.findFirst({
      where: { id },
    });

    if (!config) {
      throw new NotFoundException(`Platform config with ID ${id} not found`);
    }

    return config;
  }

  async update(id: string, dto: UpdatePlatformConfigDto) {
    const config = await this.findOne(id);

    if (config.isOfficial) {
      throw new ConflictException('Cannot update official platform configs');
    }

    return this.prisma.platformConfig.update({
      where: { id },
      data: dto,
    });
  }

  async remove(id: string) {
    const config = await this.findOne(id);

    if (config.isOfficial) {
      throw new ConflictException('Cannot delete official platform configs');
    }

    return this.prisma.platformConfig.delete({
      where: { id },
    });
  }

  async getActiveConfigs() {
    const configs = await this.prisma.platformConfig.findMany({
      where: {
        isActive: true,
      },
      select: {
        id: true,
        name: true,
        domains: true,
        category: true,
        selectors: true,
        features: true,
        isOfficial: true,
      },
      orderBy: [{ isOfficial: 'desc' }, { name: 'asc' }],
    });

    return { configs };
  }

  async findByDomain(domain: string) {
    const configs = await this.prisma.platformConfig.findMany({
      where: {
        isActive: true,
      },
    });

    const matching = configs.filter((config) =>
      config.domains.some((d) => domain.includes(d) || d.includes(domain)),
    );

    return matching;
  }
}
