import { IsString, IsOptional, IsObject } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateAuditLogDto {
  @ApiProperty({
    description: 'Action performed',
    example: 'POLICY_UPDATE',
  })
  @IsString()
  action: string;

  @ApiPropertyOptional({
    description: 'ID of the affected resource',
    example: 'clx123abc',
  })
  @IsString()
  @IsOptional()
  resourceId?: string;

  @ApiPropertyOptional({
    description: 'Type of the affected resource',
    example: 'Policy',
  })
  @IsString()
  @IsOptional()
  resourceType?: string;

  @ApiPropertyOptional({
    description: 'Additional details (before/after snapshots, etc.)',
    example: { before: { action: 'ALLOW' }, after: { action: 'BLOCK' } },
  })
  @IsObject()
  @IsOptional()
  details?: any;
}
