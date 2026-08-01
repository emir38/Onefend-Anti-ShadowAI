import { Body, Controller, Post, UseGuards, Req, UnauthorizedException } from '@nestjs/common';
import { AiAnalysisService } from './ai-analysis.service';
import { AnalyzeTextDto } from './dto/analyze-text.dto';
import { AnalysisResultDto } from './dto/analysis-result.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('ai-analysis')
@UseGuards(JwtAuthGuard)
export class AiAnalysisController {
  constructor(private readonly aiAnalysisService: AiAnalysisService) { }

  @Post()
  async analyze(@Body() analyzeTextDto: AnalyzeTextDto, @Req() req: any): Promise<AnalysisResultDto> {
    // Inject userId from authenticated token into DTO
    // req.user is JwtPayload { userId, sub ... }
    if (!req.user || !req.user.userId) {
      throw new UnauthorizedException('User ID not found in token');
    }
    analyzeTextDto.userId = req.user.userId;
    return this.aiAnalysisService.analyze(analyzeTextDto);
  }
}
