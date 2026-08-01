import {
  Controller,
  Post,
  Body,
  HttpCode,
  HttpStatus,
  Get,
  Query,
  UseGuards,
  Patch,
  Param,
  Delete,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { ApiTags, ApiOperation, ApiResponse, ApiQuery, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '@prisma/client';
import { UserId } from '../common/decorators/tenant.decorator';
import { DevicesService } from './devices.service';
import { RegisterDeviceDto } from './dto/register-device.dto';
import { IpAddress } from '../common/decorators/ip-address.decorator';
import { UserAgent } from '../common/decorators/user-agent.decorator';
import { SystemAuditService } from '../system-audit/system-audit.service';

@ApiTags('Devices')
@Controller('devices')
export class DevicesController {
  constructor(
    private readonly devicesService: DevicesService,
    private readonly auditService: SystemAuditService,
  ) { }

  @Post('register')
  @Throttle({ default: { limit: 3, ttl: 300000 } })
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Device/extension registration',
    description:
      'Public endpoint for browser extensions to register. ' +
      'Validates the enrollment token, creates or updates the user and device, ' +
      'and returns a long-lived JWT (90 days).',
  })
  @ApiResponse({
    status: 200,
    description: 'Device registered successfully',
    schema: {
      example: {
        success: true,
        token: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
        deviceId: 'clx_device123',
        userId: 'clx_user456',
      },
    },
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid, expired, or usage-limit-reached enrollment token',
  })
  @ApiResponse({
    status: 404,
    description: 'Organization not found',
  })
  async registerDevice(
    @Body() dto: RegisterDeviceDto,
    @IpAddress() ipAddress: string,
    @UserAgent() userAgent: string,
  ) {
    const result = await this.devicesService.registerDevice(dto);

    if (result && result.userId) {
      await this.auditService.log(
        result.userId,
        {
          action: 'DEVICE_REGISTRATION',
          resourceId: result.deviceId,
          resourceType: 'Device',
          details: {
            success: true,
          },
        },
        ipAddress,
        userAgent,
      );
    }

    return result;
  }

  @Get()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.ANALYST, UserRole.VIEWER)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'List devices' })
  @ApiQuery({ name: 'skip', required: false, type: Number })
  @ApiQuery({ name: 'take', required: false, type: Number })
  @ApiQuery({ name: 'search', required: false, type: String })
  @ApiQuery({ name: 'isActive', required: false, type: Boolean })
  @ApiQuery({ name: 'isRevoked', required: false, type: Boolean })
  async findAll(
    @Query('skip') skip?: number,
    @Query('take') take?: number,
    @Query('search') search?: string,
    @Query('isActive') isActive?: boolean,
    @Query('isRevoked') isRevoked?: boolean,
  ) {
    return this.devicesService.findAll({
      skip: skip ? Number(skip) : undefined,
      take: take ? Number(take) : undefined,
      search,
      isActive: isActive !== undefined ? String(isActive) === 'true' : undefined,
      isRevoked: isRevoked !== undefined ? String(isRevoked) === 'true' : undefined,
    });
  }

  @Get('grouped')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.ANALYST, UserRole.VIEWER)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'List devices grouped by user email' })
  async findGroupedByUser(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('search') search?: string,
  ) {
    return this.devicesService.findGroupedByUser({
      page: page ? parseInt(page, 10) : undefined,
      limit: limit ? parseInt(limit, 10) : undefined,
      search,
    });
  }

  @Patch(':id/revoke')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Revoke device' })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - Requires Administrator role',
  })
  async revokeDevice(
    @Param('id') deviceId: string,
    @UserId() userId: string,
    @IpAddress() ipAddress: string,
    @UserAgent() userAgent: string,
  ) {
    const result = await this.devicesService.revokeDevice(deviceId, userId);

    await this.auditService.log(
      userId,
      {
        action: 'DEVICE_REVOCATION',
        resourceId: deviceId,
        resourceType: 'Device',
        details: {},
      },
      ipAddress,
      userAgent,
    );

    return result;
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Delete device' })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - Requires Administrator role',
  })
  async deleteDevice(
    @Param('id') deviceId: string,
    @UserId() userId: string,
    @IpAddress() ipAddress: string,
    @UserAgent() userAgent: string,
  ) {
    const result = await this.devicesService.deleteDevice(deviceId);

    await this.auditService.log(
      userId,
      {
        action: 'DEVICE_DELETION',
        resourceId: deviceId,
        resourceType: 'Device',
        details: {},
      },
      ipAddress,
      userAgent,
    );

    return result;
  }
}
