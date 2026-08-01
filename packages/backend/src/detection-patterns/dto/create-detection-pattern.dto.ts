import { IsString, IsEnum, IsBoolean, IsOptional, IsNotEmpty } from 'class-validator';
import { RiskLevel, PolicyAction } from '@prisma/client';
import { ApiProperty } from '@nestjs/swagger';

export class CreateDetectionPatternDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  category: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  regex: string;

  @ApiProperty({ enum: RiskLevel })
  @IsEnum(RiskLevel)
  severity: RiskLevel;

  @ApiProperty({ enum: PolicyAction })
  @IsEnum(PolicyAction)
  defaultAction: PolicyAction;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiProperty({ required: false, default: false })
  @IsBoolean()
  @IsOptional()
  caseSensitive?: boolean;

  @ApiProperty({ required: false, default: false })
  @IsBoolean()
  @IsOptional()
  multiline?: boolean;
}
