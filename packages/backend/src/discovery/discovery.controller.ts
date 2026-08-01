import { Controller, Post, Body, UseGuards, HttpCode, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { TokenTypeGuard } from '../auth/guards/token-type.guard';
import { TokenType } from '../auth/decorators/token-type.decorator';
import { UserId } from '../common/decorators/tenant.decorator';
import { DiscoveryService } from './discovery.service';
import { DomainDiscoveryDto } from './dto/domain-discovery.dto';

@ApiTags('Discovery')
@Controller('domain-discovery')
@UseGuards(JwtAuthGuard, TokenTypeGuard)
@TokenType('device')
@ApiBearerAuth()
export class DiscoveryController {
  constructor(private readonly discoveryService: DiscoveryService) {}

  @Post()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Discovery de dominio desconocido',
    description:
      'Endpoint asincrono para que la extension reporte dominios desconocidos. El backend clasifica el dominio y retorna una recomendacion de accion.',
  })
  @ApiResponse({
    status: 200,
    description: 'Dominio clasificado',
    schema: {
      example: {
        domain: 'chat.openai.com',
        action: 'WARN',
        category: 'AI_ASSISTANT',
        riskScore: 75,
        isKnown: true,
      },
    },
  })
  async discoverDomain(
    @UserId() userId: string,
    @Body() dto: DomainDiscoveryDto,
  ) {
    return this.discoveryService.processDomainDiscovery(userId, dto.domain);
  }
}
