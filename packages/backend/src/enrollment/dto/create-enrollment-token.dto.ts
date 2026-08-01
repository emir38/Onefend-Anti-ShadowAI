import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsOptional, IsInt, IsBoolean, IsDateString, Min } from 'class-validator';

export class CreateEnrollmentTokenDto {
  @ApiPropertyOptional({
    description: 'Descriptive name for the token',
    example: 'Sales Team Q4 2024',
  })
  @IsString()
  @IsOptional()
  name?: string;

  @ApiPropertyOptional({
    description: 'Maximum number of allowed uses (null = unlimited)',
    example: 100,
  })
  @IsInt()
  @Min(1)
  @IsOptional()
  maxUses?: number;

  @ApiPropertyOptional({
    description: 'Token expiration date (ISO 8601)',
    example: '2024-12-31T23:59:59Z',
  })
  @IsDateString()
  @IsOptional()
  expiresAt?: string;
}
