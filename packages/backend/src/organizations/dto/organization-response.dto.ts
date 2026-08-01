import { ApiProperty } from '@nestjs/swagger';

export class OrganizationResponseDto {
  @ApiProperty({
    description: 'Settings ID',
    example: 'default',
  })
  id: string;

  @ApiProperty({
    description: 'Organization name',
    example: 'Onefend',
  })
  name: string;

  @ApiProperty({
    description: 'Whether MFA is enforced',
    example: false,
  })
  enforceMfa: boolean;

  @ApiProperty({
    description: 'Retention days for audit logs',
    example: 90,
  })
  auditLogRetentionDays: number;

  @ApiProperty({
    description: 'Retention days for events',
    example: 30,
  })
  eventRetentionDays: number;

  @ApiProperty({
    description: 'Whether regex blocking is enabled',
    example: true,
  })
  enableRegexBlocking: boolean;

  @ApiProperty({
    description: 'Intervention mode (BLOCKING, WARNING, SILENT)',
    example: 'BLOCKING',
  })
  interventionMode: string;

  @ApiProperty({
    description: 'Whether to save evidence',
    example: false,
  })
  saveEvidence: boolean;

  @ApiProperty({
    description: 'AI rate limit',
    example: 1000,
  })
  aiRateLimit: number;

  @ApiProperty({
    description: 'AI context prompt',
    nullable: true,
  })
  aiContextPrompt: string | null;

  @ApiProperty({
    description: 'Approved AI platform name',
    nullable: true,
  })
  approvedAiName: string | null;

  @ApiProperty({
    description: 'Approved AI platform URL',
    nullable: true,
  })
  approvedAiUrl: string | null;

  @ApiProperty({
    description: 'Creation date',
    example: '2024-01-01T00:00:00.000Z',
  })
  createdAt: Date;

  @ApiProperty({
    description: 'Last update date',
    example: '2024-01-01T00:00:00.000Z',
  })
  updatedAt: Date;
}
