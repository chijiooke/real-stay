import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { AuthModule } from '../auth/auth.module'; // Assuming AuthModule contains AuthService
import { ListingModule } from '../listing/listing.module';
import { TransactionModule } from '../transactions/transactions.module';
import { bookingsController } from './bookings.controller';
import { BookingService } from './bookings.service';
import { Booking, BookingSchema } from './schemas/bookings.schema';
import { WalletService } from '../wallets/wallet.service';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: Booking.name, schema: BookingSchema }]),
    AuthModule,
    ListingModule,
    TransactionModule,
  ],
  providers: [BookingService, WalletService],
  controllers: [bookingsController],
  exports: [BookingService],
})
export class BookingModule {}
