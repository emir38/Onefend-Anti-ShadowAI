import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { UserRole } from '@prisma/client';
import * as bcrypt from 'bcrypt';

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) { }

  async create(dto: CreateUserDto) {
    // Check if a user with that identifier already exists
    const existing = await this.prisma.user.findUnique({
      where: {
        identifier: dto.identifier,
      },
    });

    if (existing) {
      throw new ConflictException(`User with identifier "${dto.identifier}" already exists`);
    }

    const hashedPassword = await bcrypt.hash(dto.password, 10);

    return this.prisma.user.create({
      data: {
        identifier: dto.identifier,
        password: hashedPassword,
        role: dto.role || UserRole.USER,
      },
    });
  }

  async findAll(
    options?: {
      page?: number;
      limit?: number;
      role?: UserRole;
      excludeRole?: UserRole;
      isActive?: boolean;
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
    if (options?.role) {
      where.role = options.role;
    }
    if (options?.excludeRole) {
      where.role = { not: options.excludeRole };
    }
    if (options?.isActive !== undefined) {
      where.isActive = options.isActive;
    }
    if (options?.search) {
      where.identifier = { contains: options.search, mode: 'insensitive' };
    }

    const [users, total] = await Promise.all([
      this.prisma.user.findMany({
        where,
        skip,
        take: limit,
        orderBy: { [sortBy]: sortOrder },
        include: {
          devices: {
            select: {
              id: true,
              deviceInfo: true,
              isActive: true,
              lastSyncAt: true,
              enrollmentToken: true,
            },
          },
          groupMembers: {
            include: {
              group: {
                select: {
                  id: true,
                  name: true,
                },
              },
            },
          },
        },
      }),
      this.prisma.user.count({ where }),
    ]);

    // Enrich with enrollment token names
    const enrollmentTokenStrings = users
      .flatMap((u) => u.devices)
      .map((d) => d.enrollmentToken)
      .filter((t): t is string => !!t);

    const uniqueTokenStrings = Array.from(new Set(enrollmentTokenStrings));

    let tokenMap = new Map<string, string>();
    if (uniqueTokenStrings.length > 0) {
      const tokens = await this.prisma.enrollmentToken.findMany({
        where: {
          token: { in: uniqueTokenStrings },
        },
        select: {
          token: true,
          name: true,
        },
      });
      tokenMap = new Map(tokens.map((t) => [t.token, t.name || t.token]));
    }

    const enrichedUsers = users.map((user) => ({
      ...user,
      devices: user.devices.map((device) => ({
        ...device,
        enrollmentTokenName: device.enrollmentToken
          ? tokenMap.get(device.enrollmentToken) || device.enrollmentToken
          : null,
      })),
    }));

    return {
      data: enrichedUsers,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async findOne(id: string) {
    const user = await this.prisma.user.findFirst({
      where: {
        id,
      },
      include: {
        devices: {
          select: {
            id: true,
            deviceInfo: true,
            isActive: true,
            lastSyncAt: true,
            createdAt: true,
          },
        },
      },
    });

    if (!user) {
      throw new NotFoundException(`User with ID "${id}" not found`);
    }

    return user;
  }

  async findByIdentifier(identifier: string) {
    const user = await this.prisma.user.findUnique({
      where: {
        identifier,
      },
      include: {
        devices: {
          select: {
            id: true,
            deviceInfo: true,
            isActive: true,
            lastSyncAt: true,
          },
        },
      },
    });

    if (!user) {
      throw new NotFoundException(`User with identifier "${identifier}" not found`);
    }

    return user;
  }

  async update(id: string, dto: UpdateUserDto) {
    // Verify it exists
    await this.findOne(id);

    const data: any = {
      role: dto.role,
      isActive: dto.isActive,
      identifier: dto.identifier,
    };

    if (dto.password) {
      data.password = await bcrypt.hash(dto.password, 10);
    }

    const updatedUser = await this.prisma.user.update({
      where: { id },
      data,
    });

    // Revoke access for associated devices if the user is deactivated
    if (dto.isActive === false) {
      await this.prisma.device.updateMany({
        where: { userId: id, isActive: true },
        data: { isActive: false, revokedAt: new Date(), revokedBy: 'system' }
      });
    }

    return updatedUser;
  }

  async remove(id: string) {
    // Verify it exists
    await this.findOne(id);

    await this.prisma.user.delete({
      where: { id },
    });

    return { success: true, message: 'User deleted successfully' };
  }
  async removeBatch(ids: string[]) {
    const result = await this.prisma.user.deleteMany({
      where: {
        id: { in: ids },
      },
    });

    return {
      success: true,
      count: result.count,
      message: `Successfully deleted ${result.count} users`,
    };
  }

  async exportData(id: string) {
    const user = await this.findOne(id);
    const events = await this.prisma.conversationEvent.findMany({
      where: { userId: id },
      orderBy: { timestamp: 'desc' }
    });
    const auditLogs = await this.prisma.systemAuditLog.findMany({
      where: { userId: id },
      orderBy: { timestamp: 'desc' }
    });

    return {
      userProfile: user,
      devices: user.devices,
      history: events,
      auditTrail: auditLogs,
      exportedAt: new Date().toISOString()
    };
  }
}
