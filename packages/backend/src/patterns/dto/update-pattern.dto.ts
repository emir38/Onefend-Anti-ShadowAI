import { PartialType } from '@nestjs/swagger';
import { CreateSensitiveDataPatternDto } from './create-pattern.dto';

export class UpdateSensitiveDataPatternDto extends PartialType(CreateSensitiveDataPatternDto) {}
