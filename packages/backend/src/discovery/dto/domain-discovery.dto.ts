import { IsString, IsNotEmpty } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class DomainDiscoveryDto {
  @ApiProperty({
    description: 'Dominio descubierto',
    example: 'chat.openai.com',
  })
  @IsString()
  @IsNotEmpty()
  domain: string;
}
