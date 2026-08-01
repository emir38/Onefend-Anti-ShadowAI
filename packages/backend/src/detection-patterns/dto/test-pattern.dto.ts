import { IsString, IsBoolean, IsOptional, IsNotEmpty } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class TestPatternDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  regex: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  testString: string;

  @ApiProperty({ required: false, default: false })
  @IsBoolean()
  @IsOptional()
  caseSensitive?: boolean;

  @ApiProperty({ required: false, default: false })
  @IsBoolean()
  @IsOptional()
  multiline?: boolean;
}
