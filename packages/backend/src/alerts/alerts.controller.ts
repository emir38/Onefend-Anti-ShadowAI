import { Controller, Get, Post, Delete, Body, Param, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { AlertsService } from './alerts.service';
import { UserId } from '../common/decorators/tenant.decorator';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '@prisma/client';

@ApiTags('alerts')
@ApiBearerAuth()
@Controller('alerts')
@UseGuards(JwtAuthGuard, RolesGuard)
export class AlertsController {
  constructor(private readonly alertsService: AlertsService) {}

  @Post()
  @Roles(UserRole.ADMIN, UserRole.ANALYST)
  @ApiOperation({ summary: 'Create a new alert configuration' })
  @ApiResponse({ status: 201, description: 'Alert created successfully' })
  create(
    @UserId() userId: string,
    @Body()
    body: {
      name: string;
      triggerType: string;
      threshold: number;
      channel: string;
      destination: string;
    },
  ) {
    return this.alertsService.create(userId, body);
  }

  @Get()
  @Roles(UserRole.ADMIN, UserRole.ANALYST, UserRole.VIEWER)
  @ApiOperation({ summary: 'Get all alert configurations' })
  findAll() {
    return this.alertsService.findAll();
  }

  @Delete(':id')
  @Roles(UserRole.ADMIN, UserRole.ANALYST)
  @ApiOperation({ summary: 'Delete an alert configuration' })
  remove(@Param('id') id: string) {
    return this.alertsService.remove(id);
  }
}
