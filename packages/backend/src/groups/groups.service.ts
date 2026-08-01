import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateGroupDto } from './dto/create-group.dto';
import { UpdateGroupDto } from './dto/update-group.dto';

@Injectable()
export class GroupsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateGroupDto) {
    // Check if a group with that name already exists
    const existing = await this.prisma.group.findUnique({
      where: {
        name: dto.name,
      },
    });

    if (existing) {
      throw new ConflictException(`Group with name "${dto.name}" already exists`);
    }

    return this.prisma.group.create({
      data: {
        name: dto.name,
        description: dto.description,
      },
    });
  }

  async findAll(
    options?: {
      page?: number;
      limit?: number;
    },
  ) {
    const page = options?.page || 1;
    const limit = options?.limit || 50;
    const skip = (page - 1) * limit;

    const [groups, total] = await Promise.all([
      this.prisma.group.findMany({
        where: {},
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          _count: {
            select: { members: true },
          },
        },
      }),
      this.prisma.group.count({ where: {} }),
    ]);

    return {
      data: groups,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async findOne(id: string) {
    const group = await this.prisma.group.findFirst({
      where: {
        id,
      },
      include: {
        members: {
          include: {
            user: true,
          },
        },
        policyAssignments: {
          include: {
            policy: {
              include: {
                application: true,
              },
            },
          },
        },
      },
    });

    if (!group) {
      throw new NotFoundException(`Group with ID "${id}" not found`);
    }

    return group;
  }

  async update(id: string, dto: UpdateGroupDto) {
    // Verify it exists
    await this.findOne(id);

    // If the name is being updated, verify no other group has that name
    if (dto.name) {
      const existing = await this.prisma.group.findFirst({
        where: {
          name: dto.name,
          id: { not: id },
        },
      });

      if (existing) {
        throw new ConflictException(`Another group with name "${dto.name}" already exists`);
      }
    }

    return this.prisma.group.update({
      where: { id },
      data: {
        name: dto.name,
        description: dto.description,
      },
    });
  }

  async remove(id: string) {
    // Verify it exists
    await this.findOne(id);

    await this.prisma.group.delete({
      where: { id },
    });

    return { success: true, message: 'Group deleted successfully' };
  }

  async addMember(groupId: string, userId: string) {
    // Verify the group exists
    await this.findOne(groupId);

    // Verify the user exists
    const user = await this.prisma.user.findFirst({
      where: {
        id: userId,
      },
    });

    if (!user) {
      throw new BadRequestException('User not found');
    }

    // Check if already a member
    const existing = await this.prisma.groupMember.findUnique({
      where: {
        groupId_userId: {
          groupId,
          userId,
        },
      },
    });

    if (existing) {
      throw new ConflictException('User is already a member of this group');
    }

    return this.prisma.groupMember.create({
      data: {
        groupId,
        userId,
      },
      include: {
        user: true,
      },
    });
  }

  async removeMember(groupId: string, userId: string) {
    // Verify the group exists
    await this.findOne(groupId);

    // Verify the member exists
    const member = await this.prisma.groupMember.findUnique({
      where: {
        groupId_userId: {
          groupId,
          userId,
        },
      },
    });

    if (!member) {
      throw new NotFoundException('User is not a member of this group');
    }

    await this.prisma.groupMember.delete({
      where: {
        groupId_userId: {
          groupId,
          userId,
        },
      },
    });

    return { success: true, message: 'Member removed successfully' };
  }

  async getMembers(groupId: string) {
    // Verify the group exists
    await this.findOne(groupId);

    return this.prisma.groupMember.findMany({
      where: { groupId },
      include: {
        user: true,
      },
    });
  }
}
