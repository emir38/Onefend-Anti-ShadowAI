import { IsString, IsNotEmpty } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class AddMemberDto {
  @ApiProperty({
    description: 'ID del usuario a agregar al grupo',
    example: 'clx1234567890',
  })
  @IsString()
  @IsNotEmpty()
  userId: string;
}
