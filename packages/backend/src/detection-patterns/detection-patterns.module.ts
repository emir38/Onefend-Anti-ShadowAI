import { Module } from '@nestjs/common';
import { DetectionPatternsService } from './detection-patterns.service';
import { DetectionPatternsController } from './detection-patterns.controller';
import { PrismaModule } from 'src/prisma/prisma.module';
import { ConfigModule } from 'src/config/config.module';

@Module({
  imports: [PrismaModule, ConfigModule],
  controllers: [DetectionPatternsController],
  providers: [DetectionPatternsService],
  exports: [DetectionPatternsService],
})
export class DetectionPatternsModule { }
