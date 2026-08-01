import { Module } from '@nestjs/common';
import { DiscoveryController } from './discovery.controller';
import { DiscoveryService } from './discovery.service';
import { ConfigModule } from '../config/config.module';
import { ApplicationsModule } from '../applications/applications.module';

@Module({
  imports: [ConfigModule, ApplicationsModule],
  controllers: [DiscoveryController],
  providers: [DiscoveryService],
  exports: [DiscoveryService],
})
export class DiscoveryModule { }
