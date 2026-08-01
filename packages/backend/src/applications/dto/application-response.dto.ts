import { ApiProperty } from '@nestjs/swagger';
import { ApplicationCategory } from '@prisma/client';

export class ApplicationResponseDto {
  @ApiProperty({
    description: 'Unique application ID',
    example: 'clx1234567890',
  })
  id: string;

  @ApiProperty({
    description: 'Application domain',
    example: 'chat.openai.com',
  })
  domain: string;

  @ApiProperty({
    description: 'Application name',
    example: 'ChatGPT',
    nullable: true,
  })
  name: string | null;

  @ApiProperty({
    description: 'Application category',
    enum: ApplicationCategory,
    example: ApplicationCategory.AI_ASSISTANT,
  })
  category: ApplicationCategory;

  @ApiProperty({
    description: 'Risk score (0-100)',
    example: 75,
  })
  riskScore: number;

  @ApiProperty({
    description: 'Whether the application is globally known',
    example: true,
  })
  isKnown: boolean;

  @ApiProperty({
    description: 'Whether the application is blocked',
    example: false,
  })
  isBlocked: boolean;

  @ApiProperty({
    description: 'Additional metadata',
    example: { vendor: 'OpenAI' },
    nullable: true,
  })
  metadata: Record<string, any> | null;

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
