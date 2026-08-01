import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsEnum, IsOptional, IsBoolean } from 'class-validator';
import { DataCategory, RiskLevel, PolicyAction } from '@prisma/client';

export class CreateSensitiveDataPatternDto {
  @ApiProperty({ example: 'US Social Security Number' })
  @IsString()
  name: string;

  @ApiProperty({ enum: DataCategory, example: 'PII' })
  @IsEnum(DataCategory)
  category: DataCategory;

  @ApiProperty({ example: '\\b\\d{3}-\\d{2}-\\d{4}\\b', required: false })
  @IsString()
  @IsOptional()
  pattern?: string;

  @ApiProperty({ example: 'Detects US SSN in format XXX-XX-XXXX', required: false })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiProperty({ enum: PolicyAction, example: 'BLOCK', default: 'LOG' })
  @IsEnum(PolicyAction)
  @IsOptional()
  defaultAction?: PolicyAction;

  @ApiProperty({ enum: RiskLevel, example: 'CRITICAL', default: 'MEDIUM' })
  @IsEnum(RiskLevel)
  @IsOptional()
  severity?: RiskLevel;

  @ApiProperty({ example: false, default: false })
  @IsBoolean()
  @IsOptional()
  allowOverride?: boolean;

  @ApiProperty({ example: false, default: false })
  @IsBoolean()
  @IsOptional()
  requireJustification?: boolean;

  @ApiProperty({ example: true, default: true })
  @IsBoolean()
  @IsOptional()
  enabled?: boolean;
}
