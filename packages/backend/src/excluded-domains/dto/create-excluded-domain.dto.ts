import { IsString, IsOptional, IsNotEmpty } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateExcludedDomainDto {
    @ApiProperty({ description: 'Domain to exclude (e.g. localhost, internal.corp)', example: 'localhost' })
    @IsString()
    @IsNotEmpty()
    domain: string;

    @ApiProperty({ description: 'Reason for exclusion', required: false, example: 'Internal development tool' })
    @IsString()
    @IsOptional()
    reason?: string;
}
