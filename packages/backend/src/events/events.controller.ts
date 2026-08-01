import {
  Controller,
  Post,
  Body,
  UseGuards,
  HttpCode,
  HttpStatus,
  Get,
  Query,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { TokenTypeGuard } from '../auth/guards/token-type.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { TokenType } from '../auth/decorators/token-type.decorator';
import { UserId } from '../common/decorators/tenant.decorator';
import { UserRole } from '@prisma/client';
import { EventsService } from './events.service';
import { BatchEventsDto } from './dto/batch-events.dto';

@ApiTags('Events')
@Controller('events')
@UseGuards(JwtAuthGuard, RolesGuard, TokenTypeGuard)
@ApiBearerAuth()
export class EventsController {
  constructor(private readonly eventsService: EventsService) {}

  @Post()
  @TokenType('device')
  @Roles(UserRole.ADMIN, UserRole.ANALYST, UserRole.VIEWER, UserRole.USER)
  @HttpCode(HttpStatus.ACCEPTED)
  @ApiOperation({
    summary: 'Ingesta de eventos en batch',
    description:
      'Endpoint para que la extension envie eventos acumulados en batch. El backend valida, pone en SQS y retorna 202 Accepted inmediatamente. El procesamiento real es asincrono via Workers.',
  })
  @ApiResponse({
    status: 202,
    description: 'Eventos aceptados para procesamiento',
    schema: {
      example: {
        accepted: 15,
        message: 'Events queued for processing',
      },
    },
  })
  async ingestEvents(
    @UserId() userId: string,
    @Body() dto: BatchEventsDto,
  ) {
    return this.eventsService.queueEvents(userId, dto.events);
  }

  @Get()
  @TokenType('user')
  @Roles(UserRole.ADMIN, UserRole.ANALYST, UserRole.VIEWER)
  @ApiOperation({
    summary: 'Listar eventos',
    description: 'Obtiene el historial de eventos con filtros avanzados',
  })
  @ApiQuery({ name: 'page', required: false, type: Number, example: 1 })
  @ApiQuery({ name: 'limit', required: false, type: Number, example: 50 })
  @ApiQuery({ name: 'userId', required: false, type: String })
  @ApiQuery({ name: 'applicationId', required: false, type: String })
  @ApiQuery({ name: 'action', required: false, type: String })
  @ApiQuery({ name: 'startDate', required: false, type: String, example: '2023-01-01T00:00:00Z' })
  @ApiQuery({ name: 'endDate', required: false, type: String, example: '2023-12-31T23:59:59Z' })
  @ApiQuery({ name: 'sortBy', required: false, type: String, example: 'timestamp' })
  @ApiQuery({ name: 'sortOrder', required: false, enum: ['asc', 'desc'], example: 'desc' })
  @ApiResponse({
    status: 200,
    description: 'Lista de eventos',
  })
  async findAll(
    @Query('page') page?: number,
    @Query('limit') limit?: number,
    @Query('userId') userId?: string,
    @Query('applicationId') applicationId?: string,
    @Query('action') action?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('sortBy') sortBy?: string,
    @Query('sortOrder') sortOrder?: 'asc' | 'desc',
  ) {
    return this.eventsService.findAll({
      page: page ? Number(page) : undefined,
      limit: limit ? Number(limit) : undefined,
      userId,
      applicationId,
      action,
      startDate: startDate ? new Date(startDate) : undefined,
      endDate: endDate ? new Date(endDate) : undefined,
      sortBy,
      sortOrder,
    });
  }
}
