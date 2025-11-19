import { Module } from '@nestjs/common';
import { RedisModule } from 'src/redis/redis.module';
import { BookingModule } from '../bookings/bookings.module';
import { TransactionModule } from '../transactions/transactions.module';
import { PaystackProcessor } from './paystack.processor';
import { PaystackService } from '../transactions/payment-providers/paystack';

@Module({
  imports: [BookingModule, TransactionModule, RedisModule],
  providers: [PaystackProcessor, PaystackService],
})
export class WorkerModule {}
