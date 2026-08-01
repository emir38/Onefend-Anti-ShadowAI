import { Injectable, BadRequestException, NotFoundException, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AuthService } from '../auth/auth.service';
import { EnrollmentService } from '../enrollment/enrollment.service';
import { RegisterDeviceDto } from './dto/register-device.dto';
import { UserRole, DeviceType } from '@prisma/client';

@Injectable()
export class DevicesService {
  private readonly logger = new Logger(DevicesService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly authService: AuthService,
    private readonly enrollmentService: EnrollmentService,
  ) { }

  /**
   * Registers a new device or updates an existing one
   * 1. Validates enrollment token
   * 2. Creates or finds the user
   * 3. Creates or updates the device
   * 4. Generates a long-lived JWT (90 days)
   */
  private readonly MAX_DEVICES_PER_USER = 5;

  async registerDevice(dto: RegisterDeviceDto) {
    // 1. Validate enrollment token
    const enrollmentToken = await this.enrollmentService.validateToken(dto.enrollmentToken);

    // 2. Verify identifier matches invitation email (if token was created via invitation)
    const invitation = await this.prisma.invitation.findFirst({
      where: {
        enrollmentToken: { token: dto.enrollmentToken },
      },
    });

    if (invitation && invitation.email.toLowerCase() !== dto.identifier.toLowerCase()) {
      throw new BadRequestException(
        'The email you entered does not match the invitation. Please use the email where you received the invitation.',
      );
    }

    // 3. Verify that the organization is active
    const settings = await this.prisma.settings.findFirst();

    if (!settings) {
      throw new BadRequestException('Organization settings not configured');
    }

    // 4. Create or find user
    let user = await this.prisma.user.findUnique({
      where: {
        identifier: dto.identifier,
      },
    });

    if (!user) {
      user = await this.prisma.user.create({
        data: {
          identifier: dto.identifier,
          role: UserRole.USER,
          isActive: true,
        },
      });

      this.logger.log(`Created new user: ${user.id} (${dto.identifier})`);
    } else {
      // Update lastSeenAt
      user = await this.prisma.user.update({
        where: { id: user.id },
        data: { lastSeenAt: new Date() },
      });
    }

    // 5. Check device limit per user
    const deviceType = dto.deviceType || DeviceType.EXTENSION;

    const activeDeviceCount = await this.prisma.device.count({
      where: {
        userId: user.id,
        isActive: true,
        revokedAt: null,
      },
    });

    if (activeDeviceCount >= this.MAX_DEVICES_PER_USER) {
      // Check if this is a re-registration (same device type + same browser fingerprint)
      const existingDevice = await this.prisma.device.findFirst({
        where: {
          userId: user.id,
          deviceType,
          enrollmentToken: dto.enrollmentToken,
          isActive: true,
        },
      });

      if (!existingDevice) {
        throw new BadRequestException(
          `Device limit reached (${this.MAX_DEVICES_PER_USER}). Please revoke an existing device before registering a new one.`,
        );
      }
    }

    // 6. Find existing device for re-registration (same token + same type)
    let device = await this.prisma.device.findFirst({
      where: {
        userId: user.id,
        deviceType,
        enrollmentToken: dto.enrollmentToken,
      },
    });

    // 5. Generate 90-day JWT
    const deviceId = device?.id || 'temp';
    const token = await this.authService.generateDeviceToken(deviceId, user.id, user.role);

    const tokenHash = await this.authService.hashToken(token);

    if (!device) {
      // Create new device
      device = await this.prisma.device.create({
        data: {
          userId: user.id,
          deviceType,
          deviceInfo: dto.deviceInfo || {},
          enrollmentToken: dto.enrollmentToken,
          jwtTokenHash: tokenHash,
          isActive: true,
          lastSyncAt: new Date(),
        },
      });

      this.logger.log(`Created new ${deviceType} device: ${device.id} for user ${user.id}`);

      // Regenerate token with the actual device ID
      const finalToken = await this.authService.generateDeviceToken(device.id, user.id, user.role);

      const finalTokenHash = await this.authService.hashToken(finalToken);

      // Update the token hash
      await this.prisma.device.update({
        where: { id: device.id },
        data: { jwtTokenHash: finalTokenHash },
      });

      // Increment enrollment token usage counter
      await this.enrollmentService.incrementUsage(enrollmentToken.id);

      // Update invitation status if this device was created via an invitation
      await this.updateInvitationStatus(dto.enrollmentToken);

      return {
        success: true,
        token: finalToken,
        deviceId: device.id,
        userId: user.id,
      };
    } else {
      // Update existing device (re-registration)
      device = await this.prisma.device.update({
        where: { id: device.id },
        data: {
          deviceInfo: dto.deviceInfo || device.deviceInfo,
          deviceType,
          jwtTokenHash: tokenHash,
          lastSyncAt: new Date(),
          isActive: true,
          revokedAt: null,
          revokedBy: null,
        },
      });

      this.logger.log(`Updated ${deviceType} device: ${device.id}`);

      // Update invitation status if applicable
      await this.updateInvitationStatus(dto.enrollmentToken);

      return {
        success: true,
        token,
        deviceId: device.id,
        userId: user.id,
      };
    }
  }

  /**
   * Update invitation status to INSTALLED when a device registers via an invitation token
   */
  private async updateInvitationStatus(enrollmentTokenStr: string) {
    try {
      const invitation = await this.prisma.invitation.findFirst({
        where: {
          enrollmentToken: {
            token: enrollmentTokenStr,
          },
          status: 'PENDING',
        },
      });

      if (invitation) {
        await this.prisma.invitation.update({
          where: { id: invitation.id },
          data: {
            status: 'INSTALLED',
            installedAt: new Date(),
          },
        });
        this.logger.log(`Invitation ${invitation.id} marked as INSTALLED`);
      }
    } catch (error) {
      // Non-critical: don't fail device registration if invitation update fails
      this.logger.warn(`Failed to update invitation status: ${error.message}`);
    }
  }

  /**
   * Gets all devices with pagination and filters
   */
  async findAll(
    params: {
      skip?: number;
      take?: number;
      search?: string;
      isActive?: boolean;
      isRevoked?: boolean;
    },
  ) {
    const { skip, take, search, isActive, isRevoked } = params;

    const where: any = {};

    if (search) {
      where.OR = [
        { user: { identifier: { contains: search, mode: 'insensitive' } } },
        { enrollmentToken: { contains: search, mode: 'insensitive' } },
      ];
    }

    if (isActive !== undefined) {
      where.isActive = isActive;
    }

    if (isRevoked !== undefined) {
      if (isRevoked) {
        where.revokedAt = { not: null };
      } else {
        where.revokedAt = null;
      }
    }

    const [devices, total] = await Promise.all([
      this.prisma.device.findMany({
        where,
        skip,
        take,
        include: {
          user: {
            select: {
              identifier: true,
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
          },
        },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.device.count({ where }),
    ]);

    // Fetch enrollment token names
    const tokenStrings = devices
      .map((d) => d.enrollmentToken)
      .filter((t): t is string => t !== null);

    const enrollmentTokens = await this.prisma.enrollmentToken.findMany({
      where: {
        token: { in: tokenStrings },
      },
      select: {
        token: true,
        name: true,
      },
    });

    const tokenMap = new Map(enrollmentTokens.map((t) => [t.token, t.name]));

    const enrichedDevices = devices.map((device) => ({
      ...device,
      enrollmentTokenName: device.enrollmentToken
        ? tokenMap.get(device.enrollmentToken) || 'Unknown Token'
        : null,
    }));

    return {
      data: enrichedDevices,
      meta: {
        total,
        page: skip ? Math.floor(skip / take) + 1 : 1,
        limit: take,
        totalPages: Math.ceil(total / take),
      },
    };
  }

  /**
   * List devices grouped by user email -- for Assets/Devices view
   */
  async findGroupedByUser(
    params: { page?: number; limit?: number; search?: string },
  ) {
    const page = params.page || 1;
    const limit = params.limit || 20;
    const skip = (page - 1) * limit;

    const userWhere: any = { devices: { some: {} } };
    if (params.search) {
      userWhere.identifier = { contains: params.search, mode: 'insensitive' };
    }

    const [users, total] = await Promise.all([
      this.prisma.user.findMany({
        where: userWhere,
        skip,
        take: limit,
        orderBy: { lastSeenAt: 'desc' },
        include: {
          devices: {
            orderBy: { createdAt: 'desc' },
            select: {
              id: true,
              deviceType: true,
              deviceInfo: true,
              extensionVersion: true,
              isActive: true,
              lastSyncAt: true,
              revokedAt: true,
              createdAt: true,
            },
          },
          groupMembers: {
            include: { group: { select: { id: true, name: true } } },
          },
        },
      }),
      this.prisma.user.count({ where: userWhere }),
    ]);

    const TEN_MINUTES = 10 * 60 * 1000;
    const FORTY_EIGHT_HOURS = 48 * 60 * 60 * 1000;

    const computeHealth = (device: any): string => {
      if (device.revokedAt) return 'REVOKED';
      if (!device.lastSyncAt) return 'PENDING';
      const diff = Date.now() - new Date(device.lastSyncAt).getTime();
      if (diff <= TEN_MINUTES) return 'ACTIVE';
      if (diff <= FORTY_EIGHT_HOURS) return 'INACTIVE';
      return 'UNRESPONSIVE';
    };

    const bestHealth = (devices: any[]): string => {
      if (devices.length === 0) return 'PENDING';
      const statuses = devices.map(computeHealth);
      if (statuses.includes('ACTIVE')) return 'ACTIVE';
      if (statuses.includes('INACTIVE')) return 'INACTIVE';
      if (statuses.includes('UNRESPONSIVE')) return 'UNRESPONSIVE';
      if (statuses.includes('REVOKED')) return 'REVOKED';
      return 'PENDING';
    };

    const data = users.map((user) => {
      const extensions = user.devices.filter((d) => d.deviceType === 'EXTENSION');
      const agents = user.devices.filter((d) => d.deviceType === 'DESKTOP_AGENT');
      const activeDevices = user.devices.filter((d) => d.isActive && !d.revokedAt);

      const syncTimes = user.devices
        .map((d) => d.lastSyncAt)
        .filter(Boolean) as Date[];
      const lastSeen = syncTimes.length > 0
        ? new Date(Math.max(...syncTimes.map((d) => d.getTime())))
        : null;

      return {
        userId: user.id,
        email: user.identifier,
        groups: user.groupMembers.map((gm) => ({ id: gm.group.id, name: gm.group.name })),
        extensionHealth: bestHealth(extensions),
        agentHealth: bestHealth(agents),
        extensionCount: extensions.filter((d) => d.isActive && !d.revokedAt).length,
        agentCount: agents.filter((d) => d.isActive && !d.revokedAt).length,
        deviceCount: activeDevices.length,
        lastSeen,
        devices: user.devices.map((d) => ({
          id: d.id,
          deviceType: d.deviceType,
          browser: (d.deviceInfo as any)?.browser || 'Unknown',
          os: (d.deviceInfo as any)?.os || 'Unknown',
          extensionVersion: d.extensionVersion,
          health: computeHealth(d),
          lastSyncAt: d.lastSyncAt,
          isActive: d.isActive,
          revokedAt: d.revokedAt,
        })),
      };
    });

    return {
      data,
      meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
    };
  }

  /**
   * Revokes access for a device
   */
  async revokeDevice(deviceId: string, revokedBy: string) {
    const device = await this.prisma.device.findUnique({
      where: { id: deviceId },
    });

    if (!device) {
      throw new NotFoundException('Device not found');
    }

    if (device.revokedAt) {
      throw new BadRequestException('Device is already revoked');
    }

    const updatedDevice = await this.prisma.device.update({
      where: { id: deviceId },
      data: {
        isActive: false,
        revokedAt: new Date(),
        revokedBy,
      },
    });

    this.logger.log(`Device revoked: ${deviceId} by ${revokedBy}`);

    return updatedDevice;
  }

  /**
   * Validates whether a device is active and not revoked
   */
  async validateDeviceStatus(deviceId: string): Promise<boolean> {
    const device = await this.prisma.device.findUnique({
      where: { id: deviceId },
      select: { isActive: true, revokedAt: true },
    });

    if (!device) return false;
    return device.isActive && !device.revokedAt;
  }
  /**
   * Deletes a device (hard delete)
   */
  async deleteDevice(deviceId: string) {
    const device = await this.prisma.device.findUnique({
      where: { id: deviceId },
    });

    if (!device) {
      throw new NotFoundException('Device not found');
    }

    await this.prisma.device.delete({
      where: { id: deviceId },
    });

    this.logger.log(`Device deleted: ${deviceId}`);

    return { success: true };
  }
}
