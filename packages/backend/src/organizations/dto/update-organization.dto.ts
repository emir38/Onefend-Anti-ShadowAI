import { IsString, IsBoolean, IsObject, IsOptional, IsEnum, IsInt } from 'class-validator';
import { InterventionMode } from '@prisma/client';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateOrganizationDto {
  @ApiPropertyOptional({
    description: 'Organization name',
    example: 'Acme Corporation',
  })
  @IsString()
  @IsOptional()
  name?: string;

  @ApiPropertyOptional({
    description: 'Organization domain',
    example: 'acme.com',
  })
  @IsString()
  @IsOptional()
  domain?: string;

  @ApiPropertyOptional({
    description: 'Additional organization settings',
    example: { defaultAction: 'ALLOW', syncInterval: 300 },
  })
  @IsObject()
  @IsOptional()
  settings?: Record<string, any>;

  @ApiPropertyOptional({
    description: 'Whether the organization is active',
    example: true,
  })
  @IsBoolean()
  @IsOptional()
  isActive?: boolean;

  @ApiPropertyOptional({
    description: 'Retention days for audit logs',
    example: 90,
  })
  @IsOptional()
  auditLogRetentionDays?: number;

  @ApiPropertyOptional({
    description: 'Retention days for events',
    example: 30,
  })
  @IsOptional()
  eventRetentionDays?: number;

  @ApiPropertyOptional({
    description: 'Enforce MFA enabled for all users in the organization',
    example: false,
  })
  @IsBoolean()
  @IsOptional()
  @IsBoolean()
  @IsOptional()
  enforceMfa?: boolean;

  @ApiPropertyOptional({
    description: 'Intervention mode (BLOCKING vs OBSERVATION)',
    enum: InterventionMode,
    example: 'BLOCKING',
  })
  @IsEnum(InterventionMode)
  @IsOptional()
  interventionMode?: InterventionMode;

  @ApiPropertyOptional({
    description: 'Save evidence of sensitive data (redacted)',
    example: false,
  })
  @IsBoolean()
  @IsOptional()
  saveEvidence?: boolean;

  @ApiPropertyOptional({
    description: 'Organization context to be injected into the prompt (System Prompt)',
    example: 'We are a bank. Monitor transactions and amounts.',
  })
  @IsString()
  @IsOptional()
  aiContextPrompt?: string;

  @ApiPropertyOptional({
    description: 'Name of the AI approved by the organization',
    example: 'Google Gemini',
  })
  @IsString()
  @IsOptional()
  approvedAiName?: string;

  @ApiPropertyOptional({
    description: 'URL of the AI approved by the organization',
    example: 'https://gemini.google.com',
  })
  @IsString()
  @IsOptional()
  approvedAiUrl?: string;
}
