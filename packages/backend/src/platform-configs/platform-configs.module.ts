import { Module } from '@nestjs/common';
import { PlatformConfigsService } from './platform-configs.service';
import { PlatformConfigsController } from './platform-configs.controller';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [PlatformConfigsController],
  providers: [PlatformConfigsService],
  exports: [PlatformConfigsService],
})
export class PlatformConfigsModule {}
