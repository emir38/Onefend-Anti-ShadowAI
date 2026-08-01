import { ApiProperty } from '@nestjs/swagger';

export class GroupResponseDto {
  @ApiProperty({
    description: 'Unique group ID',
    example: 'clx1234567890',
  })
  id: string;

  @ApiProperty({
    description: 'Group name',
    example: 'Development Team',
  })
  name: string;

  @ApiProperty({
    description: 'Group description',
    example: 'Software developers',
    nullable: true,
  })
  description: string | null;

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
