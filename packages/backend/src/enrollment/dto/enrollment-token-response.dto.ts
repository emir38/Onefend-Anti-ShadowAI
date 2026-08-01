import { ApiProperty } from '@nestjs/swagger';

export class EnrollmentTokenResponseDto {
  @ApiProperty({ example: 'clx123abc' })
  id: string;

  @ApiProperty({ example: 'enroll_1234567890abcdef' })
  token: string;

  @ApiProperty({ example: 'Sales Team Q4 2024', required: false })
  name?: string;

  @ApiProperty({ example: 100, required: false })
  maxUses?: number;

  @ApiProperty({ example: 5 })
  usedCount: number;

  @ApiProperty({ example: '2024-12-31T23:59:59Z', required: false })
  expiresAt?: Date;

  @ApiProperty({ example: true })
  isActive: boolean;

  @ApiProperty({ example: 'user_admin123', required: false })
  createdBy?: string;

  @ApiProperty({ example: '2024-01-01T00:00:00Z' })
  createdAt: Date;

  @ApiProperty({ example: '2024-01-01T00:00:00Z' })
  updatedAt: Date;
}
