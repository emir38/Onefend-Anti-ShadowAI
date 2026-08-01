import { IsNotEmpty, IsString, MinLength, Matches } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class ChangePasswordDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  oldPassword: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  @MinLength(12)
  @Matches(/(?=.*[a-z])/)
  @Matches(/(?=.*[A-Z])/)
  @Matches(/(?=.*[0-9])/)
  newPassword: string;
}
