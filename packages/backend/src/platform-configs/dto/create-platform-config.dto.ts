import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsEnum, IsArray, IsBoolean, IsOptional, IsObject, IsUrl } from 'class-validator';
import { PlatformCategory } from '@prisma/client';

export class CreatePlatformConfigDto {
  @ApiProperty({ example: 'ChatGPT' })
  @IsString()
  name: string;

  @ApiProperty({ example: ['chat.openai.com', 'chatgpt.com'], type: [String] })
  @IsArray()
  @IsString({ each: true })
  domains: string[];

  @ApiProperty({ enum: PlatformCategory, example: 'AI_CHAT' })
  @IsEnum(PlatformCategory)
  category: PlatformCategory;

  @ApiProperty({
    example: {
      input: ['#prompt-textarea', 'textarea[placeholder*="message"]'],
      submit: ['[data-testid="send-button"]'],
      container: ['main'],
    },
    description: 'CSS selectors for platform elements',
  })
  @IsObject()
  selectors: {
    input: string[];
    submit?: string[];
    container?: string[];
    messageElements?: string[];
  };

  @ApiProperty({
    example: {
      supportsStreaming: true,
      hasMultimodal: true,
      hasFileUpload: true,
      hasCodeHighlighting: false,
    },
    required: false,
  })
  @IsObject()
  @IsOptional()
  features?: {
    supportsStreaming?: boolean;
    hasMultimodal?: boolean;
    hasFileUpload?: boolean;
    hasCodeHighlighting?: boolean;
    hasVoiceInput?: boolean;
    hasImageGeneration?: boolean;
  };

  @ApiProperty({ example: 'OpenAI ChatGPT - AI conversational assistant', required: false })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiProperty({ example: 'https://cdn.example.com/chatgpt-icon.png', required: false })
  @IsUrl()
  @IsOptional()
  iconUrl?: string;

  @ApiProperty({ example: true, default: true })
  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}
