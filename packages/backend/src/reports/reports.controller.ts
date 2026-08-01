import { Controller, Get, Query, Res, UseGuards } from '@nestjs/common';
import { Response } from 'express';
import { ApiBearerAuth, ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import { ReportsService } from './reports.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '@prisma/client';

@ApiTags('reports')
@ApiBearerAuth()
@Controller('reports')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN, UserRole.ANALYST, UserRole.VIEWER)
export class ReportsController {
  constructor(
    private readonly reportsService: ReportsService,
  ) {}

  @Get('export')
  @ApiOperation({ summary: 'Export analytics report' })
  @ApiQuery({ name: 'format', enum: ['csv', 'pdf'] })
  @ApiQuery({ name: 'startDate', required: false })
  @ApiQuery({ name: 'endDate', required: false })
  @ApiQuery({ name: 'platform', required: false })
  @ApiQuery({ name: 'riskLevel', required: false })
  @ApiQuery({ name: 'action', required: false })
  @ApiQuery({ name: 'userId', required: false })
  @ApiQuery({ name: 'applicationId', required: false })
  @ApiQuery({ name: 'dataType', required: false })
  @ApiQuery({ name: 'sensitiveData', required: false })
  async exportReport(
    @Query('format') format: 'csv' | 'pdf',
    @Query('startDate') startDate: string,
    @Query('endDate') endDate: string,
    @Query('platform') platform: string,
    @Query('riskLevel') riskLevel: string,
    @Query('action') action: string,
    @Query('userId') userId: string,
    @Query('applicationId') applicationId: string,
    @Query('dataType') dataType: string,
    @Query('sensitiveData') sensitiveData: string,
    @Res() res: Response,
  ) {
    const buffer = await this.reportsService.generateReport(
      format,
      startDate ? new Date(startDate) : undefined,
      endDate ? new Date(endDate) : undefined,
      platform,
      riskLevel,
      action,
      userId,
      applicationId,
      dataType,
      sensitiveData !== undefined ? sensitiveData === 'true' : undefined,
    );

    const timestamp = new Date().toISOString().split('T')[0];
    const filename = `onefend-report-${timestamp}.${format}`;

    if (format === 'csv') {
      res.header('Content-Type', 'text/csv');
      res.header('Content-Disposition', `attachment; filename=${filename}`);
    } else {
      res.header('Content-Type', 'application/pdf');
      res.header('Content-Disposition', `attachment; filename=${filename}`);
    }

    res.send(buffer);
  }
}
