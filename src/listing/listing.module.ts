import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ListingController } from './listing.controller';
import { ListingService } from './listing.service';
import { Listing, ListingSchema } from './schemas/listing.schema';
import { SavedListing, SavedListingSchema } from './schemas/savedListings';
import { AuthModule } from '../auth/auth.module'; // Assuming AuthModule contains AuthService

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Listing.name, schema: ListingSchema },
      { name: SavedListing.name, schema: SavedListingSchema },
    ]),
    AuthModule, // Import the AuthModule to resolve AuthService dependency
  ],
  providers: [ListingService],
  controllers: [ListingController],
  exports: [ListingService],
})
export class ListingModule {}
