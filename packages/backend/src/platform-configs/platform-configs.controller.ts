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
import { PlatformConfigsService } from './platform-configs.service';
import { CreatePlatformConfigDto } from './dto/create-platform-config.dto';
import { UpdatePlatformConfigDto } from './dto/update-platform-config.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '@prisma/client';

@ApiTags('platform-configs')
@ApiBearerAuth()
@Controller('platform-configs')
@UseGuards(JwtAuthGuard, RolesGuard)
export class PlatformConfigsController {
  constructor(private readonly platformConfigsService: PlatformConfigsService) {}

  @Post()
  @Roles(UserRole.ADMIN, UserRole.ANALYST)
  @ApiOperation({ summary: 'Create a new platform configuration' })
  @ApiResponse({ status: 201, description: 'Platform config created successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 409, description: 'Platform config with same name already exists' })
  create(@Body() createPlatformConfigDto: CreatePlatformConfigDto) {
    return this.platformConfigsService.create(createPlatformConfigDto, false);
  }

  @Get()
  @Roles(UserRole.ADMIN, UserRole.ANALYST, UserRole.VIEWER)
  @ApiOperation({ summary: 'Get all platform configurations' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'category', required: false, type: String })
  @ApiQuery({ name: 'isActive', required: false, type: Boolean })
  @ApiResponse({ status: 200, description: 'Platform configs retrieved successfully' })
  findAll(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('category') category?: string,
    @Query('isActive') isActive?: string,
  ) {
    return this.platformConfigsService.findAll({
      page: page ? parseInt(page) : undefined,
      limit: limit ? parseInt(limit) : undefined,
      category,
      isActive: isActive ? isActive === 'true' : undefined,
    });
  }

  @Get('active')
  @Roles(UserRole.ADMIN, UserRole.ANALYST, UserRole.VIEWER, UserRole.USER)
  @ApiOperation({ summary: 'Get active platform configs for extension sync' })
  @ApiResponse({ status: 200, description: 'Active configs retrieved successfully' })
  getActiveConfigs() {
    return this.platformConfigsService.getActiveConfigs();
  }

  @Get('by-domain/:domain')
  @Roles(UserRole.ADMIN, UserRole.ANALYST, UserRole.VIEWER)
  @ApiOperation({ summary: 'Find platform configs by domain' })
  @ApiResponse({ status: 200, description: 'Matching configs retrieved successfully' })
  findByDomain(@Param('domain') domain: string) {
    return this.platformConfigsService.findByDomain(domain);
  }

  @Get(':id')
  @Roles(UserRole.ADMIN, UserRole.ANALYST, UserRole.VIEWER)
  @ApiOperation({ summary: 'Get a specific platform config by ID' })
  @ApiResponse({ status: 200, description: 'Platform config retrieved successfully' })
  @ApiResponse({ status: 404, description: 'Platform config not found' })
  findOne(@Param('id') id: string) {
    return this.platformConfigsService.findOne(id);
  }

  @Patch(':id')
  @Roles(UserRole.ADMIN, UserRole.ANALYST)
  @ApiOperation({ summary: 'Update a platform config' })
  @ApiResponse({ status: 200, description: 'Platform config updated successfully' })
  @ApiResponse({ status: 404, description: 'Platform config not found' })
  @ApiResponse({ status: 409, description: 'Cannot update official configs' })
  update(
    @Param('id') id: string,
    @Body() updatePlatformConfigDto: UpdatePlatformConfigDto,
  ) {
    return this.platformConfigsService.update(id, updatePlatformConfigDto);
  }

  @Delete(':id')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Delete a platform config' })
  @ApiResponse({ status: 200, description: 'Platform config deleted successfully' })
  @ApiResponse({ status: 404, description: 'Platform config not found' })
  @ApiResponse({ status: 409, description: 'Cannot delete official configs' })
  remove(@Param('id') id: string) {
    return this.platformConfigsService.remove(id);
  }
}
