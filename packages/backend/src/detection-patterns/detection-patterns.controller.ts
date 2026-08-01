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
import { DetectionPatternsService } from './detection-patterns.service';
import { CreateDetectionPatternDto } from './dto/create-detection-pattern.dto';
import { UpdateDetectionPatternDto } from './dto/update-detection-pattern.dto';
import { TestPatternDto } from './dto/test-pattern.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '@prisma/client';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';

@ApiTags('detection-patterns')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('detection-patterns')
export class DetectionPatternsController {
  constructor(private readonly detectionPatternsService: DetectionPatternsService) {}

  @Post()
  @Roles(UserRole.ADMIN, UserRole.ANALYST)
  @ApiOperation({ summary: 'Create a new detection pattern' })
  create(@Body() createDto: CreateDetectionPatternDto) {
    return this.detectionPatternsService.create(createDto);
  }

  @Get()
  @Roles(UserRole.ADMIN, UserRole.ANALYST, UserRole.VIEWER)
  @ApiOperation({ summary: 'Get all detection patterns' })
  findAll() {
    return this.detectionPatternsService.findAll();
  }

  @Get(':id')
  @Roles(UserRole.ADMIN, UserRole.ANALYST, UserRole.VIEWER)
  @ApiOperation({ summary: 'Get a specific detection pattern' })
  findOne(@Param('id') id: string) {
    return this.detectionPatternsService.findOne(id);
  }

  @Patch(':id')
  @Roles(UserRole.ADMIN, UserRole.ANALYST)
  @ApiOperation({ summary: 'Update a detection pattern' })
  update(
    @Param('id') id: string,
    @Body() updateDto: UpdateDetectionPatternDto,
  ) {
    return this.detectionPatternsService.update(id, updateDto);
  }

  @Delete(':id')
  @Roles(UserRole.ADMIN, UserRole.ANALYST)
  @ApiOperation({ summary: 'Delete a detection pattern' })
  remove(@Param('id') id: string) {
    return this.detectionPatternsService.remove(id);
  }

  @Post('test')
  @Roles(UserRole.ADMIN, UserRole.ANALYST)
  @ApiOperation({ summary: 'Test a regex pattern' })
  testPattern(@Body() body: TestPatternDto) {
    return this.detectionPatternsService.testPattern(body.regex, body.testString, {
      caseSensitive: body.caseSensitive,
      multiline: body.multiline,
    });
  }

  @Get(':id/stats')
  @Roles(UserRole.ADMIN, UserRole.ANALYST, UserRole.VIEWER)
  @ApiOperation({ summary: 'Get statistics for a detection pattern' })
  getStats(@Param('id') id: string) {
    return this.detectionPatternsService.getStats(id);
  }
}
