import { ApiProperty } from '@nestjs/swagger';
import {
  IsString,
  IsEnum,
  IsInt,
  IsBoolean,
  IsOptional,
  IsNumber,
  IsArray,
  IsObject,
} from 'class-validator';
import { RiskLevel, PolicyAction } from '@prisma/client';

export class LogConversationEventDto {
  @ApiProperty({ example: 'clxxx123456789' })
  @IsString()
  deviceId: string;

  @ApiProperty({ example: 'clxxx987654321', required: false })
  @IsString()
  @IsOptional()
  applicationId?: string;

  @ApiProperty({ example: 'openai.com', required: false })
  @IsString()
  @IsOptional()
  domain?: string;

  @ApiProperty({ example: 'ChatGPT' })
  @IsString()
  platform: string;

  @ApiProperty({ example: 'conv_abc123', required: false })
  @IsString()
  @IsOptional()
  conversationId?: string;

  @ApiProperty({ example: 1, default: 1 })
  @IsInt()
  @IsOptional()
  messageCount?: number;

  @ApiProperty({ example: true })
  @IsBoolean()
  sensitiveDataDetected: boolean;

  @ApiProperty({ example: ['SSN', 'CREDIT_CARD'], type: [String] })
  @IsArray()
  dataTypes: string[];

  @ApiProperty({ enum: RiskLevel, example: 'CRITICAL' })
  @IsEnum(RiskLevel)
  riskLevel: RiskLevel;

  @ApiProperty({ enum: PolicyAction, example: 'BLOCK' })
  @IsEnum(PolicyAction)
  action: PolicyAction;

  @ApiProperty({ example: false, default: false })
  @IsBoolean()
  @IsOptional()
  userOverride?: boolean;

  @ApiProperty({ example: 'Business critical information', required: false })
  @IsString()
  @IsOptional()
  justification?: string;

  @ApiProperty({ example: 256 })
  @IsInt()
  inputLength: number;

  @ApiProperty({
    example: [{ type: 'SSN', position: 10, redacted: '***-**-1234' }],
    type: 'object',
    additionalProperties: true,
  })
  @IsObject()
  patternMatches: any;

  @ApiProperty({ example: 'regex', enum: ['regex', 'backend', 'cache'] })
  @IsString()
  analysisSource: string;

  @ApiProperty({ example: 0.98, minimum: 0, maximum: 1 })
  @IsNumber()
  confidence: number;

  @ApiProperty({ example: 'Redacted content', required: false })
  @IsString()
  @IsOptional()
  evidence?: string;

  @ApiProperty({ example: 'Financial', required: false })
  @IsString()
  @IsOptional()
  aiCategory?: string;

  @ApiProperty({ enum: RiskLevel, example: 'HIGH', required: false })
  @IsEnum(RiskLevel)
  @IsOptional()
  aiRiskLevel?: RiskLevel;

  @ApiProperty({ example: 'Summary of content', required: false })
  @IsString()
  @IsOptional()
  aiSummary?: string;
}
