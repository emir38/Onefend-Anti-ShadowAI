import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsEnum, IsBoolean, IsOptional, IsObject } from 'class-validator';
import { IntegrationType } from '@prisma/client';

export class CreateIntegrationDto {
  @ApiProperty({ example: 'Slack Webhook' })
  @IsString()
  name: string;

  @ApiProperty({ enum: IntegrationType, example: 'WEBHOOK' })
  @IsEnum(IntegrationType)
  type: IntegrationType;

  @ApiProperty({
    example: { retryAttempts: 3, timeout: 5000 },
    description: 'Integration-specific configuration',
  })
  @IsObject()
  config: any;

  @ApiProperty({ example: 'https://hooks.slack.com/services/xxx', required: false })
  @IsString()
  @IsOptional()
  webhookUrl?: string;

  @ApiProperty({
    example: ['sensitive_data_detected', 'policy_violation'],
    required: false,
  })
  @IsObject()
  @IsOptional()
  webhookEvents?: any;

  @ApiProperty({ example: true, default: true })
  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}

// Custom validator logic would be better in Service or distinct DTO, 
// using class-validator's Validate() or doing check in Service.
// Given time constraints, we'll enforce this in the Service layer.
