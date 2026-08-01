import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { GroupsService } from './groups.service';
import { CreateGroupDto } from './dto/create-group.dto';
import { UpdateGroupDto } from './dto/update-group.dto';
import { AddMemberDto } from './dto/add-member.dto';
import { GroupResponseDto } from './dto/group-response.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '@prisma/client';
import { UserId } from '../common/decorators/user-id.decorator';
import { IpAddress } from '../common/decorators/ip-address.decorator';
import { UserAgent } from '../common/decorators/user-agent.decorator';
import { SystemAuditService } from '../system-audit/system-audit.service';

@ApiTags('Groups')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('groups')
export class GroupsController {
  constructor(
    private readonly groupsService: GroupsService,
    private readonly auditService: SystemAuditService,
  ) { }

  @Post()
  @Roles(UserRole.ADMIN)
  @ApiOperation({
    summary: 'Create new group',
    description: 'Creates a user group in the organization',
  })
  @ApiResponse({
    status: 201,
    description: 'Group created successfully',
    type: GroupResponseDto,
  })
  @ApiResponse({
    status: 409,
    description: 'A group with that name already exists',
  })
  async create(
    @UserId() userId: string,
    @IpAddress() ipAddress: string,
    @UserAgent() userAgent: string,
    @Body() createGroupDto: CreateGroupDto,
  ) {
    const group = await this.groupsService.create(createGroupDto);

    await this.auditService.log(
      userId,
      {
        action: 'GROUP_CREATION',
        resourceId: group.id,
        resourceType: 'Group',
        details: {
          name: group.name,
        },
      },
      ipAddress,
      userAgent,
    );

    return group;
  }

  @Get()
  @Roles(UserRole.ADMIN, UserRole.ANALYST, UserRole.VIEWER)
  @ApiOperation({
    summary: 'List groups',
    description: 'Gets all groups in the organization',
  })
  @ApiQuery({ name: 'page', required: false, type: Number, example: 1 })
  @ApiQuery({ name: 'limit', required: false, type: Number, example: 50 })
  @ApiResponse({
    status: 200,
    description: 'List of groups',
    schema: {
      example: {
        data: [
          {
            id: 'clx123',
            name: 'Development Team',
            description: 'Developers',
            _count: { members: 5 },
          },
        ],
        meta: {
          total: 10,
          page: 1,
          limit: 50,
          totalPages: 1,
        },
      },
    },
  })
  async findAll(
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    return this.groupsService.findAll({
      page: page ? Number(page) : undefined,
      limit: limit ? Number(limit) : undefined,
    });
  }

  @Get(':id')
  @Roles(UserRole.ADMIN, UserRole.ANALYST, UserRole.VIEWER)
  @ApiOperation({
    summary: 'Get group by ID',
    description: 'Gets the details of a specific group',
  })
  @ApiResponse({
    status: 200,
    description: 'Group found',
    type: GroupResponseDto,
  })
  @ApiResponse({
    status: 404,
    description: 'Group not found',
  })
  async findOne(@Param('id') id: string) {
    return this.groupsService.findOne(id);
  }

  @Patch(':id')
  @Roles(UserRole.ADMIN, UserRole.ANALYST)
  @ApiOperation({
    summary: 'Update group',
    description: 'Updates the data of a group',
  })
  @ApiResponse({
    status: 200,
    description: 'Group updated successfully',
    type: GroupResponseDto,
  })
  @ApiResponse({
    status: 404,
    description: 'Group not found',
  })
  async update(
    @UserId() userId: string,
    @IpAddress() ipAddress: string,
    @UserAgent() userAgent: string,
    @Param('id') id: string,
    @Body() updateGroupDto: UpdateGroupDto,
  ) {
    const group = await this.groupsService.update(id, updateGroupDto);

    await this.auditService.log(
      userId,
      {
        action: 'GROUP_UPDATE',
        resourceId: group.id,
        resourceType: 'Group',
        details: updateGroupDto,
      },
      ipAddress,
      userAgent,
    );

    return group;
  }

  @Delete(':id')
  @Roles(UserRole.ADMIN)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Delete group',
    description: 'Deletes a group from the organization',
  })
  @ApiResponse({
    status: 200,
    description: 'Group deleted successfully',
    schema: {
      example: {
        success: true,
        message: 'Group deleted successfully',
      },
    },
  })
  @ApiResponse({
    status: 404,
    description: 'Group not found',
  })
  async remove(
    @UserId() userId: string,
    @IpAddress() ipAddress: string,
    @UserAgent() userAgent: string,
    @Param('id') id: string,
  ) {
    const result = await this.groupsService.remove(id);

    await this.auditService.log(
      userId,
      {
        action: 'GROUP_DELETION',
        resourceId: id,
        resourceType: 'Group',
        details: {},
      },
      ipAddress,
      userAgent,
    );

    return result;
  }

  @Post(':id/members')
  @Roles(UserRole.ADMIN, UserRole.ANALYST)
  @ApiOperation({
    summary: 'Add member to group',
    description: 'Adds a user as a member of the group',
  })
  @ApiResponse({
    status: 201,
    description: 'Member added successfully',
  })
  @ApiResponse({
    status: 400,
    description: 'User not found',
  })
  @ApiResponse({
    status: 409,
    description: 'User is already a member of the group',
  })
  async addMember(
    @UserId() userId: string,
    @IpAddress() ipAddress: string,
    @UserAgent() userAgent: string,
    @Param('id') groupId: string,
    @Body() addMemberDto: AddMemberDto,
  ) {
    const member = await this.groupsService.addMember(groupId, addMemberDto.userId);

    await this.auditService.log(
      userId,
      {
        action: 'GROUP_MEMBER_ADD',
        resourceId: groupId,
        resourceType: 'Group',
        details: {
          memberId: addMemberDto.userId,
        },
      },
      ipAddress,
      userAgent,
    );

    return member;
  }

  @Delete(':id/members/:userId')
  @Roles(UserRole.ADMIN, UserRole.ANALYST)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Remove member from group',
    description: 'Removes a user from the group',
  })
  @ApiResponse({
    status: 200,
    description: 'Member removed successfully',
    schema: {
      example: {
        success: true,
        message: 'Member removed successfully',
      },
    },
  })
  @ApiResponse({
    status: 404,
    description: 'User is not a member of the group',
  })
  async removeMember(
    @UserId() userId: string,
    @IpAddress() ipAddress: string,
    @UserAgent() userAgent: string,
    @Param('id') groupId: string,
    @Param('userId') memberId: string,
  ) {
    const result = await this.groupsService.removeMember(groupId, memberId);

    await this.auditService.log(
      userId,
      {
        action: 'GROUP_MEMBER_REMOVE',
        resourceId: groupId,
        resourceType: 'Group',
        details: {
          memberId: memberId,
        },
      },
      ipAddress,
      userAgent,
    );

    return result;
  }

  @Get(':id/members')
  @Roles(UserRole.ADMIN, UserRole.ANALYST, UserRole.VIEWER)
  @ApiOperation({
    summary: 'List group members',
    description: 'Gets all members of a group',
  })
  @ApiResponse({
    status: 200,
    description: 'List of members',
  })
  async getMembers(@Param('id') groupId: string) {
    return this.groupsService.getMembers(groupId);
  }
}
