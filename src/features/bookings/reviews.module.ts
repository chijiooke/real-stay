import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { AuthModule } from '../auth/auth.module'; // Assuming AuthModule contains AuthService
import { ListingModule } from '../listing/listing.module';
import { bookingsController } from './bookings.controller';
import { BookingService } from './bookings.service';
import { Booking, BookingSchema } from './schemas/bookings.schema';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: Booking.name, schema: BookingSchema }]),
    AuthModule, // Import the AuthModule to resolve AuthService dependency
    ListingModule,
  ],
  providers: [BookingService],
  controllers: [bookingsController],
  exports: [BookingService],
})
export class BookingModule {}
