import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  Query,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { IntegrationsService } from './integrations.service';
import { CreateIntegrationDto } from './dto/create-integration.dto';
import { UpdateIntegrationDto } from './dto/update-integration.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '@prisma/client';
import { UserId } from '../common/decorators/user-id.decorator';
import { IpAddress } from '../common/decorators/ip-address.decorator';
import { UserAgent } from '../common/decorators/user-agent.decorator';
import { SystemAuditService } from '../system-audit/system-audit.service';

@ApiTags('integrations')
@ApiBearerAuth()
@Controller('integrations')
@UseGuards(JwtAuthGuard, RolesGuard)
export class IntegrationsController {
  constructor(
    private readonly integrationsService: IntegrationsService,
    private readonly auditService: SystemAuditService,
  ) { }

  @Post()
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Create a new integration' })
  @ApiResponse({ status: 201, description: 'Integration created successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async create(
    @UserId() userId: string,
    @IpAddress() ipAddress: string,
    @UserAgent() userAgent: string,
    @Body() createIntegrationDto: CreateIntegrationDto,
  ) {
    const integration = await this.integrationsService.create(createIntegrationDto);

    await this.auditService.log(
      userId,
      {
        action: 'INTEGRATION_CREATION',
        resourceId: integration.id,
        resourceType: 'Integration',
        details: {
          name: integration.name,
          type: integration.type,
        },
      },
      ipAddress,
      userAgent,
    );

    return integration;
  }

  @Get()
  @Roles(UserRole.ADMIN, UserRole.ANALYST, UserRole.VIEWER)
  @ApiOperation({ summary: 'Get all integrations' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'type', required: false, type: String })
  @ApiQuery({ name: 'isActive', required: false, type: Boolean })
  @ApiResponse({ status: 200, description: 'Integrations retrieved successfully' })
  findAll(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('type') type?: string,
    @Query('isActive') isActive?: string,
  ) {
    return this.integrationsService.findAll({
      page: page ? parseInt(page) : undefined,
      limit: limit ? parseInt(limit) : undefined,
      type,
      isActive: isActive ? isActive === 'true' : undefined,
    });
  }

  @Get(':id')
  @Roles(UserRole.ADMIN, UserRole.ANALYST, UserRole.VIEWER)
  @ApiOperation({ summary: 'Get a specific integration by ID' })
  @ApiResponse({ status: 200, description: 'Integration retrieved successfully' })
  @ApiResponse({ status: 404, description: 'Integration not found' })
  findOne(@Param('id') id: string) {
    return this.integrationsService.findOne(id);
  }

  @Patch(':id')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Update an integration' })
  @ApiResponse({ status: 200, description: 'Integration updated successfully' })
  @ApiResponse({ status: 404, description: 'Integration not found' })
  async update(
    @UserId() userId: string,
    @IpAddress() ipAddress: string,
    @UserAgent() userAgent: string,
    @Param('id') id: string,
    @Body() updateIntegrationDto: UpdateIntegrationDto,
  ) {
    const integration = await this.integrationsService.update(id, updateIntegrationDto);

    await this.auditService.log(
      userId,
      {
        action: 'INTEGRATION_UPDATE',
        resourceId: integration.id,
        resourceType: 'Integration',
        details: updateIntegrationDto,
      },
      ipAddress,
      userAgent,
    );

    return integration;
  }

  @Delete(':id')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Delete an integration' })
  @ApiResponse({ status: 200, description: 'Integration deleted successfully' })
  @ApiResponse({ status: 404, description: 'Integration not found' })
  async remove(
    @UserId() userId: string,
    @IpAddress() ipAddress: string,
    @UserAgent() userAgent: string,
    @Param('id') id: string,
  ) {
    const result = await this.integrationsService.remove(id);

    await this.auditService.log(
      userId,
      {
        action: 'INTEGRATION_DELETION',
        resourceId: id,
        resourceType: 'Integration',
        details: {},
      },
      ipAddress,
      userAgent,
    );

    return result;
  }
}
