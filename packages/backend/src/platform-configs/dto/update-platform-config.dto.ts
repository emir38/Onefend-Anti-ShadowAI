import { PartialType } from '@nestjs/swagger';
import { CreatePlatformConfigDto } from './create-platform-config.dto';

export class UpdatePlatformConfigDto extends PartialType(CreatePlatformConfigDto) {}
