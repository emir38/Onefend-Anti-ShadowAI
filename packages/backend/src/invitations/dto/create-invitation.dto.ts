import { IsArray, IsEmail, ArrayMaxSize, ArrayMinSize } from 'class-validator';

export class CreateInvitationDto {
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(50)
  @IsEmail({}, { each: true })
  emails: string[];
}
