import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { FilterQuery, Model, Types } from 'mongoose';
import { Listing, ListingDocument } from './schemas/listing.schema';
import { SavedListing, SavedListingDocument } from './schemas/savedListings';
import { SavedListingResponse } from './interfaces/listing.types';

@Injectable()
export class ListingService {
  constructor(
    @InjectModel(Listing.name)
    private readonly listingModel: Model<ListingDocument>, // Inject Listing model
    @InjectModel(SavedListing.name)
    private readonly savedListingModel: Model<SavedListingDocument>, // Inject SavedListing model
  ) {}

  async createListing(payload: Listing): Promise<ListingDocument> {
    try {
      const newListing = new this.listingModel({
        ...payload,
      });
      return await newListing.save();
    } catch (error) {
      if (error.code === 11000) {
        const duplicateField = Object.keys(error.keyPattern)[0]?.replaceAll(
          '_',
          ' ',
        ); // Get the duplicate field name
        throw new BadRequestException(
          `The ${duplicateField} is already in use.`,
        );
      }
      throw new InternalServerErrorException('Failed to create listing');
    }
  }

  async getListing(listingId: string): Promise<ListingDocument | null> {
    return this.listingModel.findOne({ _id: new Types.ObjectId(listingId) });
  }

  async getListings(
    filter: FilterQuery<Listing>,
    search?: string,
    page: number = 1,
    limit: number = 10,
  ): Promise<{
    listings: ListingDocument[];
    pagination: {
      total_items: number;
      total_pages: number;
      current_page: number;
      limit: number;
    };
  }> {
    const query: FilterQuery<Listing> = { ...filter };

    if (search) {
      query.google_formatted_address = { $regex: search, $options: 'i' };
    }

    const [total_items, listings] = await Promise.all([
      this.listingModel.countDocuments(query),
      this.listingModel
        .find(query)
        .skip((page - 1) * limit)
        .limit(limit)
        .exec(),
    ]);

    return {
      listings,
      pagination: {
        total_items,
        total_pages: Math.ceil(total_items / limit),
        current_page: page,
        limit,
      },
    };
  }

  /**
   * Saves a listing by associating it with a user.
   * @param listingId - The ID of the listing to save.
   * @param userId - The ID of the user saving the listing.
   * @returns The updated saved listing document.
   */
  async saveListing(
    listingId: string,
    userId: string,
  ): Promise<SavedListingDocument> {
    // Find if the user already has a saved listings document
    let savedListing = await this.savedListingModel.findOne({
      user_id: userId,
    });

    // If the user doesn't have a saved listings document, create a new one
    if (!savedListing) {
      savedListing = new this.savedListingModel({
        user_id: userId,
        saved_listings: [listingId],
      });
    } else {
      // If the user already has saved listings, add the new listing to the array
      if (!savedListing.saved_listings.includes(listingId)) {
        savedListing.saved_listings.push(listingId);
      }
    }

    // Save the updated saved listing
    return savedListing.save();
  }

  /**
   * Saves a listing by associating it with a user.
   * @param listingId - The ID of the listing to save.
   * @param userId - The ID of the user saving the listing.
   * @returns The updated saved listing document.
   */
  async unsaveListing(
    listingId: string,
    userId: string,
  ): Promise<SavedListingDocument> {
    // Find if the user already has a saved listings document
    const savedListing = await this.savedListingModel.findOne({
      user_id: userId,
    });

    if (!savedListing) {
      throw new BadRequestException('User does not have any saved listings');
    }

    savedListing.saved_listings = savedListing.saved_listings.filter(
      (id) => id !== listingId,
    );

    // Save the updated saved listing
    return savedListing.save();
  }

  /**
   * Get saved listings by user id with filter and pagination support.
   * @param userId - The ID of the user saving the listing.
   * @param filter - Filter to be applied to the listings.
   * @param search - Optional search term for partial text search in the 'address' field.
   * @param page - The page number for pagination (default is 1).
   * @param limit - The number of listings per page (default is 10).
   * @returns A paginated list of listings along with pagination metadata.
   */
  async getSavedListing(
    userId: string,
    filter: FilterQuery<Listing>,
    search?: string,
    page: number = 1,
    limit: number = 10,
  ): Promise<SavedListingResponse> {
    const usersSavedListingsRecord = await this.savedListingModel.findOne({
      user_id: userId,
    });

    // If no saved listings exist for the user, return an empty array and pagination metadata
    if (!usersSavedListingsRecord?.saved_listings) {
      return {
        listings: [],
        pagination: {
          total_items: 0,
          total_pages: 0,
          current_page: page,
          limit,
        },
      };
    }

    // Get all listings from the saved listings record using their IDs
    let query: FilterQuery<Listing> = {
      _id: { $in: usersSavedListingsRecord.saved_listings },
    };

    // Apply the provided filter (if any)
    if (filter) {
      query = { ...query, ...filter };
    }

    // Apply partial text search if the search string is provided
    if (search) {
      query['google_formatted_address'] = { $regex: search, $options: 'i' }; // Case-insensitive search in 'address'
    }

    // Calculate pagination
    const total_items = await this.listingModel.countDocuments(query); // Get total count of listings that match the query
    const total_pages = Math.ceil(total_items / limit); // Calculate total pages
    const skip = (page - 1) * limit; // Calculate the number of records to skip based on the page number

    // Get the paginated listings
    const listings = await this.listingModel
      .find(query)
      .skip(skip)
      .limit(limit)
      .exec();

    // Return the listings along with pagination metadata
    return {
      listings,
      pagination: {
        total_items,
        total_pages,
        current_page: page,
        limit,
      },
    };
  }

  async updateById(
    id: string,
    payload: Partial<Listing>,
  ): Promise<ListingDocument | null> {
    return this.listingModel
      .findByIdAndUpdate(new Types.ObjectId(id), payload, { new: true })
      .exec();
  }

  async updateByFilter(
    filter: FilterQuery<Listing>, // Accepts any filter object
    payload: Partial<Listing>,
  ): Promise<ListingDocument | null> {
    return this.listingModel
      .findOneAndUpdate(filter, payload, { new: true })
      .exec();
  }
}
