import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { MailService } from '../auth/mail.service';
import { EnrollmentService } from '../enrollment/enrollment.service';

export interface InvitationResult {
  email: string;
  status: 'CREATED' | 'ALREADY_EXISTS' | 'FAILED';
  invitationId?: string;
  enrollmentToken?: string;
  emailSent?: boolean;
  error?: string;
}

export type DeviceHealthValue = 'PENDING' | 'ACTIVE' | 'INACTIVE' | 'UNRESPONSIVE' | 'REVOKED';

export interface HealthStatus {
  extension: DeviceHealthValue;
  desktopAgent: DeviceHealthValue;
}

const TEN_MINUTES = 10 * 60 * 1000;
const FORTY_EIGHT_HOURS = 48 * 60 * 60 * 1000;

function computeDeviceHealth(device: any | null): 'PENDING' | 'ACTIVE' | 'INACTIVE' | 'UNRESPONSIVE' | 'REVOKED' {
  if (!device) return 'PENDING';
  if (device.revokedAt) return 'REVOKED';
  if (!device.lastSyncAt) return 'PENDING';

  const diff = Date.now() - new Date(device.lastSyncAt).getTime();
  if (diff <= TEN_MINUTES) return 'ACTIVE';
  if (diff <= FORTY_EIGHT_HOURS) return 'INACTIVE';
  return 'UNRESPONSIVE';
}

@Injectable()
export class InvitationsService {
  private readonly logger = new Logger(InvitationsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly mailService: MailService,
    private readonly enrollmentService: EnrollmentService,
  ) {}

  async createInvitations(
    emails: string[],
    createdBy: string,
  ): Promise<InvitationResult[]> {
    const results: InvitationResult[] = [];

    for (const rawEmail of emails) {
      const email = rawEmail.toLowerCase().trim();

      try {
        // Check if invitation already exists for this email
        const existing = await this.prisma.invitation.findUnique({
          where: { email },
        });

        if (existing && existing.status !== 'REVOKED' && existing.status !== 'EXPIRED') {
          results.push({ email, status: 'CREATED', invitationId: existing.id });
          continue;
        }

        // If revoked/expired, delete old invitation to allow re-invite
        if (existing) {
          await this.prisma.invitation.delete({ where: { id: existing.id } });
        }

        // Create dedicated enrollment token (maxUses=2: 1 extension + 1 desktop agent)
        const enrollmentToken = await this.enrollmentService.create(
          { name: `Invite: ${email}`, maxUses: 10 },
          createdBy,
        );

        // Create invitation record
        const invitation = await this.prisma.invitation.create({
          data: {
            email,
            enrollmentTokenId: enrollmentToken.id,
            status: 'PENDING',
            createdBy,
          },
        });

        // Send email
        const emailSent = await this.mailService.sendInvitationEmail(
          email,
          enrollmentToken.token,
        );

        if (!emailSent) {
          this.logger.warn(`Invitation created but email failed for ${email}`);
        }

        results.push({
          email,
          status: 'CREATED',
          invitationId: invitation.id,
          enrollmentToken: enrollmentToken.token,
          emailSent,
        });
      } catch (error: any) {
        this.logger.error(`Failed to create invitation for ${email}`, error);
        results.push({
          email,
          status: 'FAILED',
          error: error.message,
        });
      }
    }

    return results;
  }

  async findAll(
    params: {
      page?: number;
      limit?: number;
      status?: string;
      search?: string;
    },
  ) {
    const page = params.page || 1;
    const limit = params.limit || 20;
    const skip = (page - 1) * limit;

    const where: any = {};

    // Hide revoked invitations after 24 hours
    const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    where.NOT = {
      status: 'REVOKED',
      revokedAt: { lt: twentyFourHoursAgo },
    };

    if (params.status) {
      where.status = params.status;
    }

    if (params.search) {
      where.email = { contains: params.search, mode: 'insensitive' };
    }

    const [invitations, total] = await Promise.all([
      this.prisma.invitation.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          enrollmentToken: { select: { token: true } },
        },
      }),
      this.prisma.invitation.count({ where }),
    ]);

    // Enrich with device health status
    const enriched = await Promise.all(
      invitations.map(async (inv) => {
        // Find devices registered with this invitation's enrollment token
        const devices = await this.prisma.device.findMany({
          where: {
            enrollmentToken: inv.enrollmentToken.token,
          },
          select: {
            id: true,
            deviceType: true,
            isActive: true,
            lastSyncAt: true,
            revokedAt: true,
            extensionVersion: true,
          },
        });

        const extensions = devices.filter((d) => d.deviceType === 'EXTENSION');
        const desktopAgents = devices.filter((d) => d.deviceType === 'DESKTOP_AGENT');
        const activeDevices = devices.filter((d) => d.isActive && !d.revokedAt);

        // Best health = most active device of each type
        const bestHealth = (devs: typeof devices): DeviceHealthValue => {
          if (devs.length === 0) return 'PENDING';
          const statuses = devs.map(computeDeviceHealth);
          if (statuses.includes('ACTIVE')) return 'ACTIVE';
          if (statuses.includes('INACTIVE')) return 'INACTIVE';
          if (statuses.includes('UNRESPONSIVE')) return 'UNRESPONSIVE';
          if (statuses.includes('REVOKED')) return 'REVOKED';
          return 'PENDING';
        };

        const health: HealthStatus = {
          extension: bestHealth(extensions),
          desktopAgent: bestHealth(desktopAgents),
        };

        // Compute last seen (most recent of all devices)
        const syncTimes = devices
          .map((d) => d.lastSyncAt)
          .filter(Boolean) as Date[];
        const lastSeen = syncTimes.length > 0
          ? new Date(Math.max(...syncTimes.map((d) => d.getTime())))
          : null;

        return {
          id: inv.id,
          email: inv.email,
          status: inv.status,
          enrollmentToken: inv.enrollmentToken.token,
          health,
          deviceCount: activeDevices.length,
          extensionCount: extensions.filter((d) => d.isActive && !d.revokedAt).length,
          desktopAgentCount: desktopAgents.filter((d) => d.isActive && !d.revokedAt).length,
          lastSeen,
          sentAt: inv.sentAt,
          installedAt: inv.installedAt,
          createdAt: inv.createdAt,
        };
      }),
    );

    return {
      data: enriched,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async resendInvitation(invitationId: string) {
    const invitation = await this.prisma.invitation.findFirst({
      where: { id: invitationId },
      include: { enrollmentToken: { select: { token: true } } },
    });

    if (!invitation) {
      throw new NotFoundException('Invitation not found');
    }

    const emailSent = await this.mailService.sendInvitationEmail(
      invitation.email,
      invitation.enrollmentToken.token,
    );

    // Update sentAt timestamp
    await this.prisma.invitation.update({
      where: { id: invitationId },
      data: { sentAt: new Date() },
    });

    return { success: emailSent, email: invitation.email };
  }

  async revokeInvitation(invitationId: string, revokedBy: string) {
    const invitation = await this.prisma.invitation.findFirst({
      where: { id: invitationId },
      include: { enrollmentToken: true },
    });

    if (!invitation) {
      throw new NotFoundException('Invitation not found');
    }

    // 1. Revoke the invitation
    await this.prisma.invitation.update({
      where: { id: invitationId },
      data: {
        status: 'REVOKED',
        revokedAt: new Date(),
        revokedBy,
      },
    });

    // 2. Deactivate the enrollment token
    await this.enrollmentService.deactivate(invitation.enrollmentToken.id);

    // 3. Revoke any devices registered with this token
    await this.prisma.device.updateMany({
      where: {
        enrollmentToken: invitation.enrollmentToken.token,
        isActive: true,
      },
      data: {
        isActive: false,
        revokedAt: new Date(),
        revokedBy,
      },
    });

    return { success: true };
  }

  async getStats() {
    const invitations = await this.prisma.invitation.findMany({
      where: { status: { not: 'REVOKED' } },
      include: {
        enrollmentToken: { select: { token: true } },
      },
    });

    let total = invitations.length;
    let installed = 0;
    let active = 0;
    let unresponsive = 0;

    for (const inv of invitations) {
      const devices = await this.prisma.device.findMany({
        where: {
          enrollmentToken: inv.enrollmentToken.token,
          isActive: true,
        },
        select: { lastSyncAt: true },
      });

      if (devices.length === 0) continue;

      installed++;

      const hasActive = devices.some((d) => {
        if (!d.lastSyncAt) return false;
        return Date.now() - new Date(d.lastSyncAt).getTime() <= TEN_MINUTES;
      });

      const hasUnresponsive = devices.some((d) => {
        if (!d.lastSyncAt) return true;
        return Date.now() - new Date(d.lastSyncAt).getTime() > FORTY_EIGHT_HOURS;
      });

      if (hasActive) active++;
      else if (hasUnresponsive) unresponsive++;
    }

    return { total, installed, active, unresponsive, pending: total - installed };
  }
}
