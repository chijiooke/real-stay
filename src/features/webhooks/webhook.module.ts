import { Module } from '@nestjs/common';
import { WebhookController } from './webhook.controller';
import { RedisService } from 'src/redis/redis';

@Module({
  controllers: [WebhookController],
  providers: [RedisService],
})
export class WebhookModule {}
