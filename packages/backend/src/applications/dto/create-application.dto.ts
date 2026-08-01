import {
  IsString,
  IsNotEmpty,
  IsEnum,
  IsInt,
  IsOptional,
  IsBoolean,
  Min,
  Max,
  IsObject,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ApplicationCategory } from '@prisma/client';

export class CreateApplicationDto {
  @ApiProperty({
    description: 'Application domain (e.g., chat.openai.com)',
    example: 'chat.openai.com',
  })
  @IsString()
  @IsNotEmpty()
  domain: string;

  @ApiPropertyOptional({
    description: 'Application name',
    example: 'ChatGPT',
  })
  @IsString()
  @IsOptional()
  name?: string;

  @ApiPropertyOptional({
    description: 'Application category',
    enum: ApplicationCategory,
    example: ApplicationCategory.AI_ASSISTANT,
    default: ApplicationCategory.UNKNOWN,
  })
  @IsEnum(ApplicationCategory)
  @IsOptional()
  category?: ApplicationCategory;

  @ApiPropertyOptional({
    description: 'Risk score (0-100)',
    example: 75,
    minimum: 0,
    maximum: 100,
    default: 50,
  })
  @IsInt()
  @Min(0)
  @Max(100)
  @IsOptional()
  riskScore?: number;

  @ApiPropertyOptional({
    description: 'Additional application metadata',
    example: { vendor: 'OpenAI', region: 'US' },
  })
  @IsObject()
  @IsOptional()
  metadata?: Record<string, any>;

  @ApiPropertyOptional({
    description: 'Whether the application is known/approved',
    example: true,
    default: false,
  })
  @IsBoolean()
  @IsOptional()
  isKnown?: boolean;
}
