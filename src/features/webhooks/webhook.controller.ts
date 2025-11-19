import {
  Body,
  Controller,
  Post,
  Headers,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { PaystackWebhookDTO } from './dto/paystack-webhook.dto';
import { RedisService } from 'src/redis/redis';
import * as crypto from 'crypto';
import { PaystackEventQueue } from '../transactions/interfaces/paystack.interface';

@Controller('webhooks')
export class WebhookController {
  constructor(private readonly redisService: RedisService) {}

  @Post('paystack')
  @HttpCode(HttpStatus.OK)
  async handlePaystackWebhook(
    @Body() payload: PaystackWebhookDTO,
    @Headers('x-paystack-signature') signature: string,
  ) {
    // validate payload authenticity
    const secretKey = process.env.PAYSTACK_SECRET_KEY || '';
    const computed = crypto
      .createHmac('sha512', secretKey)
      .update(JSON.stringify(payload))
      .digest('hex');

    console.log('Received Paystack webhook:', payload);
    console.log('is valid payload:', signature == computed);

    // Push to Redis queue
    await this.redisService.enqueue(PaystackEventQueue.OUTFLOW, payload);

    return { status: 'queued', event: payload.event };
  }
}
