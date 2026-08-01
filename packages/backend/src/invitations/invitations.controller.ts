import {
  Controller,
  Post,
  Get,
  Patch,
  Param,
  Body,
  Query,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserId } from '../common/decorators/tenant.decorator';
import { InvitationsService } from './invitations.service';
import { CreateInvitationDto } from './dto/create-invitation.dto';

@Controller('invitations')
@UseGuards(JwtAuthGuard, RolesGuard)
export class InvitationsController {
  constructor(private readonly invitationsService: InvitationsService) {}

  @Post()
  @Roles('ADMIN')
  async create(
    @UserId() userId: string,
    @Body() dto: CreateInvitationDto,
  ) {
    return this.invitationsService.createInvitations(dto.emails, userId);
  }

  @Get()
  @Roles('ADMIN', 'ANALYST', 'VIEWER')
  async findAll(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('status') status?: string,
    @Query('search') search?: string,
  ) {
    return this.invitationsService.findAll({
      page: page ? parseInt(page, 10) : undefined,
      limit: limit ? parseInt(limit, 10) : undefined,
      status,
      search,
    });
  }

  @Get('stats')
  @Roles('ADMIN', 'ANALYST', 'VIEWER')
  async getStats() {
    return this.invitationsService.getStats();
  }

  @Post(':id/resend')
  @Roles('ADMIN')
  async resend(
    @Param('id') id: string,
  ) {
    return this.invitationsService.resendInvitation(id);
  }

  @Patch(':id/revoke')
  @Roles('ADMIN')
  async revoke(
    @UserId() userId: string,
    @Param('id') id: string,
  ) {
    return this.invitationsService.revokeInvitation(id, userId);
  }
}
