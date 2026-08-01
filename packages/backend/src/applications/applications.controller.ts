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
import { ApplicationsService } from './applications.service';
import { CreateApplicationDto } from './dto/create-application.dto';
import { UpdateApplicationDto } from './dto/update-application.dto';
import { ApplicationResponseDto } from './dto/application-response.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '@prisma/client';
import { UserId } from '../common/decorators/user-id.decorator';
import { IpAddress } from '../common/decorators/ip-address.decorator';
import { UserAgent } from '../common/decorators/user-agent.decorator';
import { SystemAuditService } from '../system-audit/system-audit.service';
import { ApplicationCategory } from '@prisma/client';

@ApiTags('Applications')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('applications')
export class ApplicationsController {
  constructor(
    private readonly applicationsService: ApplicationsService,
    private readonly auditService: SystemAuditService,
  ) { }

  @Post()
  @Roles(UserRole.ADMIN)
  @ApiOperation({
    summary: 'Create new application',
    description: 'Registers a new SaaS/AI application in the catalog',
  })
  @ApiResponse({
    status: 201,
    description: 'Application created successfully',
    type: ApplicationResponseDto,
  })
  @ApiResponse({
    status: 409,
    description: 'An application with that domain already exists',
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - Requires Admin role',
  })
  async create(
    @UserId() userId: string,
    @IpAddress() ipAddress: string,
    @UserAgent() userAgent: string,
    @Body() createApplicationDto: CreateApplicationDto,
  ) {
    const app = await this.applicationsService.create(createApplicationDto);

    await this.auditService.log(
      userId,
      {
        action: 'APPLICATION_CREATION',
        resourceId: app.id,
        resourceType: 'Application',
        details: {
          domain: app.domain,
          name: app.name,
        },
      },
      ipAddress,
      userAgent,
    );

    return app;
  }

  @Get()
  @Roles(UserRole.ADMIN, UserRole.ANALYST, UserRole.VIEWER)
  @ApiOperation({
    summary: 'List applications',
    description: 'Retrieves all applications with optional pagination',
  })
  @ApiQuery({ name: 'page', required: false, type: Number, example: 1 })
  @ApiQuery({ name: 'limit', required: false, type: Number, example: 50 })
  @ApiQuery({
    name: 'category',
    required: false,
    enum: ApplicationCategory,
    example: ApplicationCategory.AI_ASSISTANT,
  })
  @ApiQuery({ name: 'search', required: false, type: String })
  @ApiQuery({ name: 'sortBy', required: false, type: String, example: 'createdAt' })
  @ApiQuery({ name: 'sortOrder', required: false, enum: ['asc', 'desc'], example: 'desc' })
  @ApiResponse({
    status: 200,
    description: 'List of applications',
    schema: {
      example: {
        data: [
          {
            id: 'clx123',
            domain: 'chat.openai.com',
            name: 'ChatGPT',
            category: 'AI_ASSISTANT',
            riskScore: 75,
          },
        ],
        meta: {
          total: 100,
          page: 1,
          limit: 50,
          totalPages: 2,
        },
      },
    },
  })
  async findAll(
    @Query('page') page?: number,
    @Query('limit') limit?: number,
    @Query('category') category?: ApplicationCategory,
    @Query('search') search?: string,
    @Query('sortBy') sortBy?: string,
    @Query('sortOrder') sortOrder?: 'asc' | 'desc',
  ) {
    return this.applicationsService.findAll({
      page: page ? Number(page) : undefined,
      limit: limit ? Number(limit) : undefined,
      category,
      search,
      sortBy,
      sortOrder,
    });
  }

  @Get(':id')
  @Roles(UserRole.ADMIN, UserRole.ANALYST, UserRole.VIEWER)
  @ApiOperation({
    summary: 'Get application by ID',
    description: 'Retrieves the details of a specific application',
  })
  @ApiResponse({
    status: 200,
    description: 'Application found',
    type: ApplicationResponseDto,
  })
  @ApiResponse({
    status: 404,
    description: 'Application not found',
  })
  async findOne(@Param('id') id: string) {
    return this.applicationsService.findOne(id);
  }

  @Patch(':id')
  @Roles(UserRole.ADMIN, UserRole.ANALYST)
  @ApiOperation({
    summary: 'Update application',
    description: 'Updates the data of an existing application',
  })
  @ApiResponse({
    status: 200,
    description: 'Application updated successfully',
    type: ApplicationResponseDto,
  })
  @ApiResponse({
    status: 404,
    description: 'Application not found',
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - Requires Admin or Analyst role',
  })
  async update(
    @UserId() userId: string,
    @IpAddress() ipAddress: string,
    @UserAgent() userAgent: string,
    @Param('id') id: string,
    @Body() updateApplicationDto: UpdateApplicationDto,
  ) {
    const app = await this.applicationsService.update(id, updateApplicationDto);

    await this.auditService.log(
      userId,
      {
        action: 'APPLICATION_UPDATE',
        resourceId: app.id,
        resourceType: 'Application',
        details: updateApplicationDto,
      },
      ipAddress,
      userAgent,
    );

    return app;
  }

  @Delete(':id')
  @Roles(UserRole.ADMIN)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Delete application',
    description: 'Deletes an application from the catalog',
  })
  @ApiResponse({
    status: 200,
    description: 'Application deleted successfully',
    schema: {
      example: {
        success: true,
        message: 'Application deleted successfully',
      },
    },
  })
  @ApiResponse({
    status: 404,
    description: 'Application not found',
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - Requires Admin role',
  })
  async remove(
    @UserId() userId: string,
    @IpAddress() ipAddress: string,
    @UserAgent() userAgent: string,
    @Param('id') id: string,
  ) {
    const result = await this.applicationsService.remove(id);

    await this.auditService.log(
      userId,
      {
        action: 'APPLICATION_DELETION',
        resourceId: id,
        resourceType: 'Application',
        details: {},
      },
      ipAddress,
      userAgent,
    );

    return result;
  }

  @Post('bulk-delete')
  @Roles(UserRole.ADMIN)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Bulk delete applications',
    description: 'Deletes multiple selected applications',
  })
  @ApiResponse({
    status: 200,
    description: 'Applications deleted successfully',
  })
  async removeBatch(@Body() body: { ids: string[] }) {
    return this.applicationsService.removeBatch(body.ids);
  }
}
