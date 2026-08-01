import { Controller, Get, UseGuards } from '@nestjs/common';
import { AnalyticsService } from './analytics.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '@prisma/client';

@Controller('analytics')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN, UserRole.ANALYST, UserRole.VIEWER)
export class AnalyticsController {
    constructor(private readonly analyticsService: AnalyticsService) { }

    @Get('heatmap')
    async getHeatmap() {
        return this.analyticsService.getHeatmap();
    }

    @Get('users/risk')
    async getRiskUsers() {
        return this.analyticsService.getHighRiskUsers();
    }

    @Get('users/heroes')
    async getHeroes() {
        return this.analyticsService.getSecurityHeroes();
    }
}
