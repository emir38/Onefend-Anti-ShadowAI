import { Controller, Get, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { ConfigService } from './config.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { TokenTypeGuard } from '../auth/guards/token-type.guard';
import { TokenType } from '../auth/decorators/token-type.decorator';
import { UserId, DeviceId, CurrentUser } from '../common/decorators/tenant.decorator';

@ApiTags('Config')
@Controller('config')
@UseGuards(JwtAuthGuard, TokenTypeGuard)
@TokenType('device')
@ApiBearerAuth()
export class ConfigController {
  constructor(private readonly configService: ConfigService) {}

  @Get()
  @ApiOperation({
    summary: 'Get configuration for extension',
    description:
      'Endpoint for the extension to download all necessary configuration: ' +
      'known applications, policies applicable to the user, and configuration. ' +
      'The response is cached in Redis for 5 minutes for maximum performance.',
  })
  @ApiResponse({
    status: 200,
    description: 'Configuration obtained successfully',
    schema: {
      example: {
        applications: [
          {
            domain: 'chat.openai.com',
            name: 'ChatGPT',
            action: 'ALLOW',
            riskScore: 75,
            category: 'AI_ASSISTANT',
          },
          {
            domain: 'gemini.google.com',
            name: 'Google Gemini',
            action: 'WARN',
            riskScore: 60,
            category: 'AI_ASSISTANT',
          },
        ],
        policies: [
          {
            applicationId: 'clx_app123',
            domain: 'chat.openai.com',
            action: 'BLOCK',
            priority: 10,
            groupId: 'clx_group456',
          },
        ],
        defaultAction: 'ALLOW',
        syncInterval: 300000,
        settings: {
          defaultAction: 'ALLOW',
          enableNotifications: true,
        },
      },
    },
  })
  @ApiResponse({
    status: 401,
    description: 'Not authenticated or invalid token',
  })
  async getConfig(
    @UserId() userId: string,
    @DeviceId() deviceId: string,
    @CurrentUser() user: any,
  ) {
    // Heartbeat: update lastSyncAt if request comes from a device
    if (user.type === 'device' && deviceId) {
      // Fire and forget - don't block response
      this.configService.recordHeartbeat(deviceId).catch((err) => {
        console.error('Failed to record heartbeat:', err);
      });
    }
    return this.configService.getConfig(userId);
  }
}
