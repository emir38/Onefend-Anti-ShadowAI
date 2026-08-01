import { Controller, Get, Post, Delete, Body, Param, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { ReportScheduleService } from './report-schedule.service';
import { UserId } from '../common/decorators/user-id.decorator';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole, ReportFrequency } from '@prisma/client';

@ApiTags('reports')
@ApiBearerAuth()
@Controller('reports/schedules')
@UseGuards(JwtAuthGuard, RolesGuard)
export class ReportScheduleController {
  constructor(
    private readonly scheduleService: ReportScheduleService,
  ) {}

  @Post()
  @Roles(UserRole.ADMIN, UserRole.ANALYST)
  @ApiOperation({ summary: 'Schedule a report' })
  async create(
    @UserId() userId: string,
    @Body() body: { frequency: ReportFrequency; recipients: string[]; runTime?: string },
  ) {
    return this.scheduleService.create(userId, body);
  }

  @Get()
  @Roles(UserRole.ADMIN, UserRole.ANALYST, UserRole.VIEWER)
  @ApiOperation({ summary: 'List scheduled reports' })
  async findAll() {
    return this.scheduleService.findAll();
  }

  @Delete(':id')
  @Roles(UserRole.ADMIN, UserRole.ANALYST)
  @ApiOperation({ summary: 'Delete a scheduled report' })
  async delete(@Param('id') id: string) {
    return this.scheduleService.delete(id);
  }
}
