// src/utility-services/redis/redis.module.ts
import { Module } from '@nestjs/common';
import { RedisService } from './redis';

@Module({
  providers: [RedisService],
  exports: [RedisService],
})
export class RedisModule {}
