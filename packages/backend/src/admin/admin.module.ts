import { Module } from '@nestjs/common';
import { AdminController } from './admin.controller';
import { RedisModule } from '../redis/redis.module';

@Module({
    imports: [RedisModule],
    controllers: [AdminController],
})
export class AdminModule { }
