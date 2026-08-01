import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { RedisService } from '../redis/redis.service';
import { CreatePolicyDto } from './dto/create-policy.dto';
import { UpdatePolicyDto } from './dto/update-policy.dto';
import { PolicyAction } from '@prisma/client';
import { ConfigService } from '../config/config.service';

@Injectable()
export class PoliciesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
    private readonly configService: ConfigService,
  ) { }

  async create(dto: CreatePolicyDto) {
    // Validate that the application exists
    const application = await this.prisma.application.findFirst({
      where: {
        id: dto.applicationId,
      },
    });

    if (!application) {
      throw new BadRequestException(
        'Application not found',
      );
    }

    // If groups are specified, validate that all exist
    if (dto.groupIds && dto.groupIds.length > 0) {
      const groups = await this.prisma.group.findMany({
        where: {
          id: { in: dto.groupIds },
        },
      });

      if (groups.length !== dto.groupIds.length) {
        throw new BadRequestException(
          'One or more groups not found',
        );
      }
    }

    // Check if a policy already exists for this application
    const existing = await this.prisma.policy.findFirst({
      where: {
        applicationId: dto.applicationId,
      },
    });

    if (existing) {
      throw new ConflictException(
        'A policy already exists for this application. Please edit the existing policy or delete it first.',
      );
    }

    // Create policy with group assignments
    const policy = await this.prisma.policy.create({
      data: {
        applicationId: dto.applicationId,
        action: dto.action,
        priority: dto.priority ?? 0,
        policyGroups:
          dto.groupIds && dto.groupIds.length > 0
            ? {
              create: dto.groupIds.map((groupId) => ({
                groupId,
              })),
            }
            : undefined,
      },
      include: {
        application: true,
        policyGroups: {
          include: {
            group: true,
          },
        },
      },
    });

    // Invalidate configuration cache
    await this.configService.invalidateCache();

    return policy;
  }

  async findAll(
    options?: {
      page?: number;
      limit?: number;
      applicationId?: string;
      groupId?: string;
      action?: PolicyAction;
      sortBy?: string;
      sortOrder?: 'asc' | 'desc';
    },
  ) {
    const page = options?.page || 1;
    const limit = options?.limit || 50;
    const skip = (page - 1) * limit;
    const sortBy = options?.sortBy || 'priority';
    const sortOrder = options?.sortOrder || 'desc';

    const where: any = {};
    if (options?.applicationId) {
      where.applicationId = options.applicationId;
    }
    if (options?.groupId) {
      // Filter by policies that have this group assigned
      where.policyGroups = {
        some: {
          groupId: options.groupId,
        },
      };
    }
    if (options?.action) {
      where.action = options.action;
    }

    const [policies, total] = await Promise.all([
      this.prisma.policy.findMany({
        where,
        skip,
        take: limit,
        include: {
          application: true,
          policyGroups: {
            include: {
              group: true,
            },
          },
        },
        orderBy: { [sortBy]: sortOrder },
      }),
      this.prisma.policy.count({ where }),
    ]);

    return {
      data: policies,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async findOne(id: string) {
    const policy = await this.prisma.policy.findFirst({
      where: {
        id,
      },
      include: {
        application: true,
        policyGroups: {
          include: {
            group: true,
          },
        },
      },
    });

    if (!policy) {
      throw new NotFoundException(`Policy with ID "${id}" not found`);
    }

    return policy;
  }

  async update(id: string, dto: UpdatePolicyDto) {
    // Verify it exists
    await this.findOne(id);

    // If the application is being updated, validate it exists
    if (dto.applicationId) {
      const application = await this.prisma.application.findFirst({
        where: {
          id: dto.applicationId,
        },
      });

      if (!application) {
        throw new BadRequestException(
          'Application not found',
        );
      }
    }

    // If groups are being updated, validate that all exist
    if (dto.groupIds !== undefined) {
      if (dto.groupIds && dto.groupIds.length > 0) {
        const groups = await this.prisma.group.findMany({
          where: {
            id: { in: dto.groupIds },
          },
        });

        if (groups.length !== dto.groupIds.length) {
          throw new BadRequestException(
            'One or more groups not found',
          );
        }
      }

      // Update policy and replace group assignments
      const policy = await this.prisma.policy.update({
        where: { id },
        data: {
          action: dto.action,
          priority: dto.priority,
          applicationId: dto.applicationId,
          // Replace all group assignments
          policyGroups: {
            deleteMany: {}, // Delete all existing assignments
            create:
              dto.groupIds && dto.groupIds.length > 0
                ? dto.groupIds.map((groupId) => ({
                  groupId,
                }))
                : [],
          },
        },
        include: {
          application: true,
          policyGroups: {
            include: {
              group: true,
            },
          },
        },
      });

      // Invalidate configuration cache
      await this.configService.invalidateCache();

      return policy;
    } else {
      // If groups are not being updated, only update other fields
      const policy = await this.prisma.policy.update({
        where: { id },
        data: {
          action: dto.action,
          priority: dto.priority,
          applicationId: dto.applicationId,
        },
        include: {
          application: true,
          policyGroups: {
            include: {
              group: true,
            },
          },
        },
      });

      // Invalidate configuration cache
      await this.configService.invalidateCache();

      return policy;
    }
  }

  async remove(id: string) {
    // Verify it exists
    await this.findOne(id);

    await this.prisma.policy.delete({
      where: { id },
    });

    // Invalidate configuration cache
    await this.configService.invalidateCache();

    return { success: true, message: 'Policy deleted successfully' };
  }


}
