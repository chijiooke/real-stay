import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { AuthModule } from '../auth/auth.module'; // Assuming AuthModule contains AuthService
import { ReviewsController } from './bookings.controller';
import { ReviewService } from './bookings.service';
import { Review, BookingSchema } from './schemas/bookings.schema';
import { ListingModule } from '../listing/listing.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Review.name, schema: BookingSchema },
    ]),
    AuthModule, // Import the AuthModule to resolve AuthService dependency
    ListingModule
  ],
  providers: [ReviewService],
  controllers: [ReviewsController],
  exports: [ReviewService],
})
export class ReviewModule {}
