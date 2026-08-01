import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateEnrollmentTokenDto } from './dto/create-enrollment-token.dto';
import { UpdateEnrollmentTokenDto } from './dto/update-enrollment-token.dto';
import { randomBytes } from 'crypto';

@Injectable()
export class EnrollmentService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Generates a unique enrollment token
   */
  private generateToken(): string {
    return `enroll_${randomBytes(32).toString('hex')}`;
  }

  /**
   * Creates a new enrollment token
   */
  async create(dto: CreateEnrollmentTokenDto, createdBy?: string) {
    const token = this.generateToken();

    return this.prisma.enrollmentToken.create({
      data: {
        token,
        name: dto.name,
        maxUses: dto.maxUses,
        expiresAt: dto.expiresAt ? new Date(dto.expiresAt) : null,
        createdBy,
      },
    });
  }

  /**
   * Lists all enrollment tokens
   */
  async findAll(
    options?: {
      page?: number;
      limit?: number;
      isActive?: boolean;
    },
  ) {
    const page = options?.page || 1;
    const limit = options?.limit || 50;
    const skip = (page - 1) * limit;

    const where: any = {};
    if (options?.isActive !== undefined) {
      where.isActive = options.isActive;
    }

    const [tokens, total] = await Promise.all([
      this.prisma.enrollmentToken.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.enrollmentToken.count({ where }),
    ]);

    // Enrich tokens with assigned users
    const tokenStrings = tokens.map((t) => t.token);
    const devices = await this.prisma.device.findMany({
      where: {
        enrollmentToken: { in: tokenStrings },
      },
      select: {
        enrollmentToken: true,
        user: {
          select: {
            id: true,
            identifier: true,
          },
        },
      },
    });

    // Map devices to tokens
    const enrichedTokens = tokens.map((token) => {
      const tokenDevices = devices.filter((d) => d.enrollmentToken === token.token);
      // Get unique users
      const uniqueUsers = Array.from(
        new Map(tokenDevices.map((d) => [d.user.id, d.user])).values(),
      );
      return {
        ...token,
        assignedUsers: uniqueUsers,
      };
    });

    return {
      data: enrichedTokens,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Gets a specific token
   */
  async findOne(id: string) {
    const token = await this.prisma.enrollmentToken.findFirst({
      where: { id },
    });

    if (!token) {
      throw new NotFoundException(`Enrollment token with ID "${id}" not found`);
    }

    return token;
  }

  /**
   * Validates an enrollment token
   * Returns the token if valid, throws an exception if not
   */
  async validateToken(tokenString: string) {
    const token = await this.prisma.enrollmentToken.findUnique({
      where: { token: tokenString },
    });

    if (!token) {
      throw new BadRequestException('Invalid enrollment token');
    }

    if (!token.isActive) {
      throw new BadRequestException('Enrollment token is inactive');
    }

    // Check expiration
    if (token.expiresAt && token.expiresAt < new Date()) {
      throw new BadRequestException('Enrollment token has expired');
    }

    // Check usage limit
    if (token.maxUses && token.usedCount >= token.maxUses) {
      throw new BadRequestException('Enrollment token has reached its usage limit');
    }

    return token;
  }

  /**
   * Increments the usage counter of a token
   */
  async incrementUsage(tokenId: string) {
    return this.prisma.enrollmentToken.update({
      where: { id: tokenId },
      data: {
        usedCount: { increment: 1 },
      },
    });
  }

  /**
   * Updates an enrollment token
   */
  async update(id: string, dto: UpdateEnrollmentTokenDto) {
    // Verify it exists
    await this.findOne(id);

    const data: any = {};
    if (dto.name !== undefined) data.name = dto.name;
    if (dto.maxUses !== undefined) data.maxUses = dto.maxUses;
    if (dto.expiresAt !== undefined)
      data.expiresAt = dto.expiresAt ? new Date(dto.expiresAt) : null;
    if (dto.isActive !== undefined) data.isActive = dto.isActive;

    return this.prisma.enrollmentToken.update({
      where: { id },
      data,
    });
  }

  /**
   * Deletes an enrollment token
   */
  async remove(id: string) {
    // Verify it exists
    await this.findOne(id);

    await this.prisma.enrollmentToken.delete({
      where: { id },
    });

    return { success: true, message: 'Enrollment token deleted successfully' };
  }

  /**
   * Deactivates an enrollment token (soft delete)
   */
  async deactivate(id: string) {
    return this.update(id, { isActive: false });
  }
}
