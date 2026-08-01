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
import { PoliciesService } from './policies.service';
import { CreatePolicyDto } from './dto/create-policy.dto';
import { UpdatePolicyDto } from './dto/update-policy.dto';
import { PolicyResponseDto } from './dto/policy-response.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '@prisma/client';
import { PolicyAction } from '@prisma/client';

import { UserId } from '../common/decorators/user-id.decorator';
import { IpAddress } from '../common/decorators/ip-address.decorator';
import { UserAgent } from '../common/decorators/user-agent.decorator';
import { SystemAuditService } from '../system-audit/system-audit.service';

@ApiTags('Policies')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('policies')
export class PoliciesController {
  constructor(
    private readonly policiesService: PoliciesService,
    private readonly auditService: SystemAuditService,
  ) { }

  @Post()
  @Roles(UserRole.ADMIN)
  @ApiOperation({
    summary: 'Create new policy',
    description: 'Creates an access policy for an application (global or per group)',
  })
  @ApiResponse({
    status: 201,
    description: 'Policy created successfully',
    type: PolicyResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Application or group not found',
  })
  @ApiResponse({
    status: 409,
    description: 'A policy already exists for this combination',
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - Requires Administrator role',
  })
  async create(
    @UserId() userId: string,
    @IpAddress() ipAddress: string,
    @UserAgent() userAgent: string,
    @Body() createPolicyDto: CreatePolicyDto,
  ) {
    const policy = await this.policiesService.create(createPolicyDto);

    await this.auditService.log(
      userId,
      {
        action: 'POLICY_CREATION',
        resourceId: policy.id,
        resourceType: 'Policy',
        details: {
          applicationId: policy.applicationId,
          action: policy.action,
        },
      },
      ipAddress,
      userAgent,
    );

    return policy;
  }

  @Get()
  @Roles(UserRole.ADMIN, UserRole.ANALYST, UserRole.VIEWER)
  @ApiOperation({
    summary: 'List policies',
    description: 'Gets all policies with optional filters',
  })
  @ApiQuery({ name: 'page', required: false, type: Number, example: 1 })
  @ApiQuery({ name: 'limit', required: false, type: Number, example: 50 })
  @ApiQuery({ name: 'applicationId', required: false, type: String })
  @ApiQuery({ name: 'groupId', required: false, type: String })
  @ApiQuery({ name: 'action', required: false, enum: PolicyAction })
  @ApiQuery({ name: 'sortBy', required: false, type: String, example: 'priority' })
  @ApiQuery({ name: 'sortOrder', required: false, enum: ['asc', 'desc'], example: 'desc' })
  @ApiResponse({
    status: 200,
    description: 'List of policies',
    schema: {
      example: {
        data: [
          {
            id: 'clx123',
            applicationId: 'app123',
            groupId: 'grp123',
            action: 'WARN',
            priority: 10,
          },
        ],
        meta: {
          total: 50,
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
    @Query('applicationId') applicationId?: string,
    @Query('groupId') groupId?: string,
    @Query('action') action?: PolicyAction,
    @Query('sortBy') sortBy?: string,
    @Query('sortOrder') sortOrder?: 'asc' | 'desc',
  ) {
    return this.policiesService.findAll({
      page: page ? Number(page) : undefined,
      limit: limit ? Number(limit) : undefined,
      applicationId,
      groupId,
      action,
      sortBy,
      sortOrder,
    });
  }

  @Get(':id')
  @Roles(UserRole.ADMIN, UserRole.ANALYST, UserRole.VIEWER)
  @ApiOperation({
    summary: 'Get policy by ID',
    description: 'Gets the details of a specific policy',
  })
  @ApiResponse({
    status: 200,
    description: 'Policy found',
    type: PolicyResponseDto,
  })
  @ApiResponse({
    status: 404,
    description: 'Policy not found',
  })
  async findOne(@Param('id') id: string) {
    return this.policiesService.findOne(id);
  }

  @Patch(':id')
  @Roles(UserRole.ADMIN, UserRole.ANALYST)
  @ApiOperation({
    summary: 'Update policy',
    description: 'Updates the data of an existing policy',
  })
  @ApiResponse({
    status: 200,
    description: 'Policy updated successfully',
    type: PolicyResponseDto,
  })
  @ApiResponse({
    status: 404,
    description: 'Policy not found',
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - Requires Administrator or Analyst role',
  })
  async update(
    @UserId() userId: string,
    @IpAddress() ipAddress: string,
    @UserAgent() userAgent: string,
    @Param('id') id: string,
    @Body() updatePolicyDto: UpdatePolicyDto,
  ) {
    const policy = await this.policiesService.update(id, updatePolicyDto);

    await this.auditService.log(
      userId,
      {
        action: 'POLICY_UPDATE',
        resourceId: policy.id,
        resourceType: 'Policy',
        details: updatePolicyDto,
      },
      ipAddress,
      userAgent,
    );

    return policy;
  }

  @Delete(':id')
  @Roles(UserRole.ADMIN)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Delete policy',
    description: 'Deletes a policy from the system',
  })
  @ApiResponse({
    status: 200,
    description: 'Policy deleted successfully',
    schema: {
      example: {
        success: true,
        message: 'Policy deleted successfully',
      },
    },
  })
  @ApiResponse({
    status: 404,
    description: 'Policy not found',
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - Requires Administrator role',
  })
  async remove(
    @UserId() userId: string,
    @IpAddress() ipAddress: string,
    @UserAgent() userAgent: string,
    @Param('id') id: string,
  ) {
    const policy = await this.policiesService.remove(id);

    await this.auditService.log(
      userId,
      {
        action: 'POLICY_DELETION',
        resourceId: id,
        resourceType: 'Policy',
        details: {},
      },
      ipAddress,
      userAgent,
    );

    return policy;
  }
}
