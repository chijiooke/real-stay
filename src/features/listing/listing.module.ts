import { forwardRef, Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { AuthModule } from '../auth/auth.module'; // Assuming AuthModule contains AuthService
import { ListingController } from './listing.controller';
import { ListingService } from './listing.service';
import { Listing, ListingSchema } from './schemas/listing.schema';
import { SavedListing, SavedListingSchema } from './schemas/savedListings';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Listing.name, schema: ListingSchema },
      { name: SavedListing.name, schema: SavedListingSchema },
    ]),

    forwardRef(() => AuthModule),
  ],
  providers: [ListingService],
  controllers: [ListingController],
  exports: [ListingService],
})
export class ListingModule {}
