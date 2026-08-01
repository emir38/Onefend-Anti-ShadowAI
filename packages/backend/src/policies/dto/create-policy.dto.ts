import { IsString, IsNotEmpty, IsEnum, IsInt, IsOptional, Min, IsArray } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { PolicyAction } from '@prisma/client';

export class CreatePolicyDto {
  @ApiProperty({
    description: 'ID of the application to which the policy applies',
    example: 'clx1234567890',
  })
  @IsString()
  @IsNotEmpty()
  applicationId: string;

  @ApiPropertyOptional({
    description: 'IDs of the groups to which the policy applies (empty = global policy)',
    example: ['clx0987654321', 'clx1122334455'],
    type: [String],
    nullable: true,
  })
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  groupIds?: string[];

  @ApiProperty({
    description: 'Policy action',
    enum: PolicyAction,
    example: PolicyAction.WARN,
    default: PolicyAction.ALLOW,
  })
  @IsEnum(PolicyAction)
  action: PolicyAction;

  @ApiPropertyOptional({
    description: 'Policy priority (higher number = higher priority)',
    example: 10,
    minimum: 0,
    default: 0,
  })
  @IsInt()
  @Min(0)
  @IsOptional()
  priority?: number;
}
