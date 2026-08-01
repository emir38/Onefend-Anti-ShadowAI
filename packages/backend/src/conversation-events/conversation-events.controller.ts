import { Controller, Get, Post, Body, UseGuards, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { ConversationEventsService } from './conversation-events.service';
import { LogConversationEventDto } from './dto/log-conversation-event.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { TokenTypeGuard } from '../auth/guards/token-type.guard';
import { TokenType } from '../auth/decorators/token-type.decorator';
import { UserId } from '../common/decorators/tenant.decorator';

@ApiTags('conversation-events')
@ApiBearerAuth()
@Controller('conversation-events')
@UseGuards(JwtAuthGuard, TokenTypeGuard)
export class ConversationEventsController {
  constructor(private readonly conversationEventsService: ConversationEventsService) {}

  @Post()
  @TokenType('device')
  @ApiOperation({ summary: 'Log a conversation event from the extension' })
  @ApiResponse({ status: 201, description: 'Event logged successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  log(
    @UserId() userId: string,
    @Body() logEventDto: LogConversationEventDto,
  ) {
    return this.conversationEventsService.log(userId, logEventDto);
  }

  @Post('batch')
  @TokenType('device')
  @ApiOperation({ summary: 'Log multiple conversation events (batch)' })
  @ApiResponse({ status: 201, description: 'Events logged successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async logBatch(
    @UserId() userId: string,
    @Body() body: { events: LogConversationEventDto[] },
  ) {
    const result = await this.conversationEventsService.logBatch(userId, body.events);
    return {
      success: true,
      count: result.count,
      message: `Successfully logged ${result.count} events`,
    };
  }

  @Get()
  @TokenType('user')
  @ApiOperation({ summary: 'Get conversation events with filtering' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'userId', required: false, type: String })
  @ApiQuery({ name: 'applicationId', required: false, type: String })
  @ApiQuery({ name: 'platform', required: false, type: String })
  @ApiQuery({ name: 'riskLevel', required: false, type: String })
  @ApiQuery({ name: 'action', required: false, type: String })
  @ApiQuery({ name: 'dataType', required: false, type: String })
  @ApiResponse({ status: 200, description: 'Events retrieved successfully' })
  findAll(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('userId') userId?: string,
    @Query('applicationId') applicationId?: string,
    @Query('platform') platform?: string,
    @Query('riskLevel') riskLevel?: string,
    @Query('action') action?: string,
    @Query('dataType') dataType?: string,
    @Query('sensitiveData') sensitiveData?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('sortBy') sortBy?: string,
    @Query('sortOrder') sortOrder?: 'asc' | 'desc',
  ) {
    return this.conversationEventsService.findAll({
      page: page ? parseInt(page) : undefined,
      limit: limit ? parseInt(limit) : undefined,
      userId,
      applicationId,
      platform,
      riskLevel,
      action,
      dataType,
      sensitiveData: sensitiveData !== undefined ? sensitiveData === 'true' : undefined,
      startDate: startDate ? new Date(startDate) : undefined,
      endDate: endDate ? new Date(endDate) : undefined,
      sortBy,
      sortOrder,
    });
  }

  @Get('stats')
  @TokenType('user')
  @ApiOperation({ summary: 'Get conversation event statistics' })
  @ApiQuery({ name: 'startDate', required: false, type: Date })
  @ApiQuery({ name: 'endDate', required: false, type: Date })
  @ApiResponse({ status: 200, description: 'Stats retrieved successfully' })
  getStats(
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('platform') platform?: string,
    @Query('riskLevel') riskLevel?: string,
    @Query('action') action?: string,
  ) {
    return this.conversationEventsService.getStats(
      startDate ? new Date(startDate) : undefined,
      endDate ? new Date(endDate) : undefined,
      platform,
      riskLevel,
      action,
    );
  }

  @Get('trends')
  @TokenType('user')
  @ApiOperation({ summary: 'Get event trends grouped by day or hour' })
  @ApiQuery({ name: 'startDate', required: false, type: Date })
  @ApiQuery({ name: 'endDate', required: false, type: Date })
  @ApiQuery({ name: 'groupBy', required: false, enum: ['day', 'hour'] })
  @ApiResponse({ status: 200, description: 'Trends retrieved successfully' })
  getTrends(
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('groupBy') groupBy?: 'day' | 'hour',
  ) {
    return this.conversationEventsService.getTrends(
      startDate ? new Date(startDate) : undefined,
      endDate ? new Date(endDate) : undefined,
      groupBy || 'day',
    );
  }

  @Get('top-users')
  @TokenType('user')
  @ApiOperation({ summary: 'Get top users by event count' })
  @ApiQuery({ name: 'startDate', required: false, type: Date })
  @ApiQuery({ name: 'endDate', required: false, type: Date })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiResponse({ status: 200, description: 'Top users retrieved successfully' })
  getTopUsers(
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('limit') limit?: string,
    @Query('platform') platform?: string,
    @Query('riskLevel') riskLevel?: string,
    @Query('action') action?: string,
  ) {
    return this.conversationEventsService.getTopUsers(
      startDate ? new Date(startDate) : undefined,
      endDate ? new Date(endDate) : undefined,
      limit ? parseInt(limit) : 5,
      platform,
      riskLevel,
      action,
    );
  }

  @Get('top-apps')
  @TokenType('user')
  @ApiOperation({ summary: 'Get top applications by event count' })
  @ApiQuery({ name: 'startDate', required: false, type: Date })
  @ApiQuery({ name: 'endDate', required: false, type: Date })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiResponse({ status: 200, description: 'Top applications retrieved successfully' })
  getTopApps(
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('limit') limit?: string,
    @Query('platform') platform?: string,
    @Query('riskLevel') riskLevel?: string,
    @Query('action') action?: string,
  ) {
    return this.conversationEventsService.getTopApps(
      startDate ? new Date(startDate) : undefined,
      endDate ? new Date(endDate) : undefined,
      limit ? parseInt(limit) : 5,
      platform,
      riskLevel,
      action,
    );
  }

  @Get('timeline')
  @TokenType('user')
  @ApiOperation({ summary: 'Get event timeline with risk level breakdown' })
  @ApiQuery({ name: 'startDate', required: false, type: Date })
  @ApiQuery({ name: 'endDate', required: false, type: Date })
  @ApiQuery({ name: 'interval', required: false, enum: ['hour', 'day'] })
  @ApiResponse({ status: 200, description: 'Timeline retrieved successfully' })
  getTimeline(
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('interval') interval?: 'hour' | 'day',
    @Query('platform') platform?: string,
    @Query('riskLevel') riskLevel?: string,
    @Query('action') action?: string,
  ) {
    return this.conversationEventsService.getTimeline(
      startDate ? new Date(startDate) : undefined,
      endDate ? new Date(endDate) : undefined,
      interval || 'hour',
      platform,
      riskLevel,
      action,
    );
  }

  @Get('top-patterns')
  @TokenType('user')
  @ApiOperation({ summary: 'Get top detected sensitive data patterns' })
  @ApiQuery({ name: 'startDate', required: false, type: Date })
  @ApiQuery({ name: 'endDate', required: false, type: Date })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  getTopPatterns(
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('limit') limit?: string,
  ) {
    return this.conversationEventsService.getTopPatterns(
      startDate ? new Date(startDate) : undefined,
      endDate ? new Date(endDate) : undefined,
      limit ? parseInt(limit) : 5,
    );
  }

  @Get('risk-score')
  @TokenType('user')
  @ApiOperation({ summary: 'Get global risk score (0-100)' })
  @ApiQuery({ name: 'startDate', required: false, type: Date })
  @ApiQuery({ name: 'endDate', required: false, type: Date })
  getRiskScore(
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    return this.conversationEventsService.getRiskScore(
      startDate ? new Date(startDate) : undefined,
      endDate ? new Date(endDate) : undefined,
    );
  }
}
