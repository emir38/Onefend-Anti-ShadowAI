import { PartialType } from '@nestjs/swagger';
import { CreateDetectionPatternDto } from './create-detection-pattern.dto';

export class UpdateDetectionPatternDto extends PartialType(CreateDetectionPatternDto) {}
