import { ApiProperty } from '@nestjs/swagger';
import { PolicyAction } from '@prisma/client';

export class PolicyResponseDto {
  @ApiProperty({
    description: 'Unique policy ID',
    example: 'clx1234567890',
  })
  id: string;

  @ApiProperty({
    description: 'Application ID',
    example: 'clx1111111111',
  })
  applicationId: string;

  @ApiProperty({
    description: 'Policy action',
    enum: PolicyAction,
    example: PolicyAction.WARN,
  })
  action: PolicyAction;

  @ApiProperty({
    description: 'Policy priority',
    example: 10,
  })
  priority: number;

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
