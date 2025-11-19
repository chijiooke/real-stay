import { forwardRef, Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { AuthModule } from '../auth/auth.module'; // Assuming AuthModule contains AuthService
import { ListingModule } from '../listing/listing.module';
import { TransactionModule } from '../transactions/transactions.module';
import { WalletModule } from '../wallets/wallet.module';
import { bookingsController } from './bookings.controller';
import { BookingService } from './bookings.service';
import { Booking, BookingSchema } from './schemas/bookings.schema';
import { RedisModule } from 'src/redis/redis.module';
import { PaystackService } from '../transactions/payment-providers/paystack';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: Booking.name, schema: BookingSchema }]),
    AuthModule,
    ListingModule,
    WalletModule,
    RedisModule,
    forwardRef(() => TransactionModule),
  ],
  providers: [BookingService, PaystackService],
  controllers: [bookingsController],
  exports: [BookingService],
})
export class BookingModule {}
