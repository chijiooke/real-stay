import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ListingModule } from 'src/listing/listing.module';
import { AuthModule } from '../auth/auth.module'; // Assuming AuthModule contains AuthService
import { ReviewsController } from './reviews.controller';
import { ReviewService } from './reviews.service';
import { Review, ReviewSchema } from './schemas/reviews.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Review.name, schema: ReviewSchema },
    ]),
    AuthModule, // Import the AuthModule to resolve AuthService dependency
    ListingModule
  ],
  providers: [ReviewService],
  controllers: [ReviewsController],
  exports: [ReviewService],
})
export class ReviewModule {}
