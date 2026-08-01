import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateAuditLogDto } from './dto/create-audit-log.dto';

@Injectable()
export class SystemAuditService {
  private readonly logger = new Logger(SystemAuditService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Log a system action
   */
  async log(
    userId: string,
    dto: CreateAuditLogDto,
    ipAddress?: string,
    userAgent?: string,
  ) {
    try {
      const auditLog = await this.prisma.systemAuditLog.create({
        data: {
          userId,
          action: dto.action,
          resourceId: dto.resourceId,
          resourceType: dto.resourceType,
          details: dto.details || {},
          ipAddress,
          userAgent,
        },
      });

      this.logger.log(
        `${dto.action} by user ${userId} on ${dto.resourceType || 'system'}`,
      );

      return auditLog;
    } catch (error) {
      this.logger.error(
        `AUDIT FAILURE: action=${dto.action} resource=${dto.resourceType ?? 'unknown'}/${dto.resourceId ?? 'unknown'} user=${userId}`,
        error,
      );
      // Don't throw - audit logging should not break the main flow
    }
  }

  /**
   * Get audit logs with pagination and filters
   */
  async findAll(
    options: {
      page?: number;
      limit?: number;
      action?: string;
      userId?: string;
      resourceType?: string;
      startDate?: Date;
      endDate?: Date;
    } = {},
  ) {
    const page = options.page || 1;
    const limit = options.limit || 50;
    const skip = (page - 1) * limit;

    const where: any = {};

    if (options.action) {
      where.action = options.action;
    }

    if (options.userId) {
      where.userId = options.userId;
    }

    if (options.resourceType) {
      where.resourceType = options.resourceType;
    }

    if (options.startDate || options.endDate) {
      where.timestamp = {};
      if (options.startDate) {
        where.timestamp.gte = options.startDate;
      }
      if (options.endDate) {
        where.timestamp.lte = options.endDate;
      }
    }

    const [data, total] = await Promise.all([
      this.prisma.systemAuditLog.findMany({
        where,
        skip,
        take: limit,
        orderBy: { timestamp: 'desc' },
        include: {
          user: {
            select: {
              id: true,
              identifier: true,
              role: true,
            },
          },
        },
      }),
      this.prisma.systemAuditLog.count({ where }),
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

  /**
   * Get unique actions for filtering
   */
  async getUniqueActions(): Promise<string[]> {
    const actions = await this.prisma.systemAuditLog.findMany({
      select: { action: true },
      distinct: ['action'],
    });

    return actions.map((a) => a.action);
  }

  /**
   * Get unique resource types for filtering
   */
  async getUniqueResourceTypes(): Promise<string[]> {
    const types = await this.prisma.systemAuditLog.findMany({
      where: { resourceType: { not: null } },
      select: { resourceType: true },
      distinct: ['resourceType'],
    });

    return types.map((t) => t.resourceType).filter(Boolean) as string[];
  }
}
