import { PartialType } from '@nestjs/swagger';
import { CreateEnrollmentTokenDto } from './create-enrollment-token.dto';
import { IsBoolean, IsOptional } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateEnrollmentTokenDto extends PartialType(CreateEnrollmentTokenDto) {
  @ApiPropertyOptional({
    description: 'Estado activo del token',
    example: true,
  })
  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}
