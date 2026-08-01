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
import { PatternsService } from './patterns.service';
import { CreateSensitiveDataPatternDto } from './dto/create-pattern.dto';
import { UpdateSensitiveDataPatternDto } from './dto/update-pattern.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '@prisma/client';
import { UserId } from '../common/decorators/user-id.decorator';
import { IpAddress } from '../common/decorators/ip-address.decorator';
import { UserAgent } from '../common/decorators/user-agent.decorator';
import { SystemAuditService } from '../system-audit/system-audit.service';

@ApiTags('patterns')
@ApiBearerAuth()
@Controller('patterns')
@UseGuards(JwtAuthGuard, RolesGuard)
export class PatternsController {
  constructor(
    private readonly patternsService: PatternsService,
    private readonly auditService: SystemAuditService,
  ) { }

  @Post()
  @Roles(UserRole.ADMIN, UserRole.ANALYST)
  @ApiOperation({ summary: 'Create a new sensitive data pattern' })
  @ApiResponse({ status: 201, description: 'Pattern created successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async create(
    @UserId() userId: string,
    @IpAddress() ipAddress: string,
    @UserAgent() userAgent: string,
    @Body() createPatternDto: CreateSensitiveDataPatternDto,
  ) {
    const pattern = await this.patternsService.create(createPatternDto);

    await this.auditService.log(
      userId,
      {
        action: 'PATTERN_CREATION',
        resourceId: pattern.id,
        resourceType: 'SensitiveDataPattern',
        details: {
          name: pattern.name,
          category: pattern.category,
          severity: pattern.severity,
        },
      },
      ipAddress,
      userAgent,
    );

    return pattern;
  }

  @Get()
  @Roles(UserRole.ADMIN, UserRole.ANALYST, UserRole.VIEWER)
  @ApiOperation({ summary: 'Get all patterns' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'category', required: false, type: String })
  @ApiQuery({ name: 'enabled', required: false, type: Boolean })
  @ApiResponse({ status: 200, description: 'Patterns retrieved successfully' })
  findAll(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('category') category?: string,
    @Query('enabled') enabled?: string,
  ) {
    return this.patternsService.findAll({
      page: page ? parseInt(page) : undefined,
      limit: limit ? parseInt(limit) : undefined,
      category,
      enabled: enabled ? enabled === 'true' : undefined,
    });
  }

  @Get('active')
  @Roles(UserRole.ADMIN, UserRole.ANALYST, UserRole.VIEWER, UserRole.USER)
  @ApiOperation({ summary: 'Get active patterns for extension sync' })
  @ApiResponse({ status: 200, description: 'Active patterns retrieved successfully' })
  getActivePatterns() {
    return this.patternsService.getActivePatterns();
  }

  @Get(':id')
  @Roles(UserRole.ADMIN, UserRole.ANALYST, UserRole.VIEWER)
  @ApiOperation({ summary: 'Get a specific pattern by ID' })
  @ApiResponse({ status: 200, description: 'Pattern retrieved successfully' })
  @ApiResponse({ status: 404, description: 'Pattern not found' })
  findOne(@Param('id') id: string) {
    return this.patternsService.findOne(id);
  }

  @Patch(':id')
  @Roles(UserRole.ADMIN, UserRole.ANALYST)
  @ApiOperation({ summary: 'Update a pattern' })
  @ApiResponse({ status: 200, description: 'Pattern updated successfully' })
  @ApiResponse({ status: 404, description: 'Pattern not found' })
  async update(
    @UserId() userId: string,
    @IpAddress() ipAddress: string,
    @UserAgent() userAgent: string,
    @Param('id') id: string,
    @Body() updatePatternDto: UpdateSensitiveDataPatternDto,
  ) {
    const pattern = await this.patternsService.update(id, updatePatternDto);

    await this.auditService.log(
      userId,
      {
        action: 'PATTERN_UPDATE',
        resourceId: pattern.id,
        resourceType: 'SensitiveDataPattern',
        details: updatePatternDto,
      },
      ipAddress,
      userAgent,
    );

    return pattern;
  }

  @Delete(':id')
  @Roles(UserRole.ADMIN, UserRole.ANALYST)
  @ApiOperation({ summary: 'Delete a pattern' })
  @ApiResponse({ status: 200, description: 'Pattern deleted successfully' })
  @ApiResponse({ status: 404, description: 'Pattern not found' })
  async remove(
    @UserId() userId: string,
    @IpAddress() ipAddress: string,
    @UserAgent() userAgent: string,
    @Param('id') id: string,
  ) {
    const pattern = await this.patternsService.remove(id);

    await this.auditService.log(
      userId,
      {
        action: 'PATTERN_DELETION',
        resourceId: pattern.id,
        resourceType: 'SensitiveDataPattern',
        details: {
          name: pattern.name,
        },
      },
      ipAddress,
      userAgent,
    );

    return pattern;
  }
  @Post('test')
  @Roles(UserRole.ADMIN, UserRole.ANALYST)
  @ApiOperation({ summary: 'Test a regex pattern' })
  testPattern(@Body() body: any) {
    return this.patternsService.testPattern(body.regex, body.testString, {
      caseSensitive: body.caseSensitive,
      multiline: body.multiline,
    });
  }

  @Get(':id/stats')
  @Roles(UserRole.ADMIN, UserRole.ANALYST, UserRole.VIEWER)
  @ApiOperation({ summary: 'Get statistics for a detection pattern' })
  getStats(@Param('id') id: string) {
    return this.patternsService.getStats(id);
  }
}
