import {
  IsString,
  IsNotEmpty,
  IsArray,
  ValidateNested,
  IsOptional,
  IsObject,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';

export class EventDto {
  @ApiProperty({
    description: 'ID of the visited application (optional if domain is provided)',
    example: 'app_123',
    required: false,
  })
  @IsString()
  @IsOptional()
  applicationId?: string;

  @ApiProperty({
    description: 'Visited domain',
    example: 'chat.openai.com',
    required: false,
  })
  @IsString()
  @IsOptional()
  domain?: string;

  @ApiProperty({
    description: 'User ID (optional, obtained from JWT)',
    example: 'user_123',
    required: false,
  })
  @IsString()
  @IsOptional()
  userId?: string;

  @ApiProperty({
    description: 'Action performed',
    example: 'VISIT',
  })
  @IsString()
  @IsNotEmpty()
  action: string;

  @ApiProperty({
    description: 'Event timestamp (optional)',
    example: '2024-12-02T10:00:00Z',
    required: false,
  })
  @IsString()
  @IsOptional()
  timestamp?: string;

  @ApiProperty({
    description: 'Visited URL (optional)',
    example: 'https://chat.openai.com',
    required: false,
  })
  @IsString()
  @IsOptional()
  url?: string;

  @ApiProperty({
    description: 'Additional metadata',
    example: { duration: 120, blocked: false },
    required: false,
  })
  @IsObject()
  @IsOptional()
  metadata?: Record<string, any>;
}

export class BatchEventsDto {
  @ApiProperty({
    description: 'Array of events',
    type: [EventDto],
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => EventDto)
  events: EventDto[];
}
