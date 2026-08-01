import { IsNotEmpty, IsString, MinLength, Matches } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class ResetPasswordDto {
  @ApiProperty({ example: 'abcdef1234567890' })
  @IsString()
  @IsNotEmpty()
  token: string;

  @ApiProperty({ example: 'NewPassword123!' })
  @IsString()
  @IsNotEmpty()
  @MinLength(12)
  @Matches(/(?=.*[a-z])/)
  @Matches(/(?=.*[A-Z])/)
  @Matches(/(?=.*[0-9])/)
  newPassword: string;
}
