/* eslint-disable @typescript-eslint/no-explicit-any */
import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { FilterQuery, Model, Types } from 'mongoose';
import { SavedListingResponse } from './interfaces/listing.types';
import { Listing, ListingDocument } from './schemas/listing.schema';
import { SavedListing, SavedListingDocument } from './schemas/savedListings';
import { buildSearchQuery, getPagingParameters } from 'src/utils/helpers';

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
      return await this.listingModel.create(payload);
    } catch (error) {
      if (error.code === 11000) {
        const duplicateField = Object.keys(
          error.keyPattern || {},
        )[0]?.replaceAll('_', ' ');
        throw new BadRequestException(
          `The ${duplicateField} is already in use.`,
        );
      }
      throw new InternalServerErrorException(
        error.message || 'Failed to create listing',
      );
    }
  }

  //To Do: hide password from response
  async getListing(listingId: string): Promise<ListingDocument | null> {
    if (!Types.ObjectId.isValid(listingId)) {
      throw new BadRequestException('invalid id');
    }

    const id = new Types.ObjectId(listingId);
    const result = await this.listingModel.aggregate([
      {
        $match: { _id: id },
      },
      {
        $addFields: {
          ownerObjectId: { $toObjectId: '$owner_id' },
        },
      },
      {
        $lookup: {
          from: 'users',
          localField: 'ownerObjectId',
          foreignField: '_id',
          as: 'owner',
        },
      },
      {
        $unwind: { path: '$owner', preserveNullAndEmptyArrays: true },
      },
    ]);

    return result.length > 0 ? result[0] : null;
  }

  async getListings(filter: FilterQuery<Listing>): Promise<{
    listings: ListingDocument[];
    pagination: {
      total_items: number;
      total_pages: number;
      current_page: number;
      limit: number;
    };
  }> {
    let searchStr;
    if (filter['search']) {
      searchStr = filter['search'];
      delete filter['search']; // Remove search from filter to avoid conflicts
    }

    const { skip, limit, currentPage } = getPagingParameters(filter);
    const baseMatchStage: any = { ...filter };

    const pipeline: any[] = [
      { $match: baseMatchStage },
      {
        $addFields: {
          ownerObjectId: { $toObjectId: '$owner_id' },
        },
      },
      {
        $lookup: {
          from: 'users',
          localField: 'ownerObjectId',
          foreignField: '_id',
          as: 'owner',
        },
      },
      {
        $unwind: {
          path: '$owner',
          preserveNullAndEmptyArrays: true,
        },
      },
    ];

    // 🔍 Use utility function to build search query
    if (searchStr) {
      const searchQuery = buildSearchQuery(searchStr, [
        'google_formatted_address',
        'owner.first_name',
        'owner.last_name',
        'owner.email',
      ]);

      pipeline.push({ $match: searchQuery });
    }

    pipeline.push({
      $facet: {
        data: [{ $skip: skip }, { $limit: limit }],
        totalCount: [{ $count: 'count' }],
      },
    });

    const result = await this.listingModel.aggregate(pipeline);
    const listings = result[0]?.data || [];
    const total_items = result[0]?.totalCount[0]?.count || 0;

    return {
      listings,
      pagination: {
        total_items,
        total_pages: Math.ceil(total_items / limit),
        current_page: currentPage,
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
    const listing = await this.getListing(listingId);

    if (!listing) {
      throw new NotFoundException("listing doesn't exist");
    }

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
  ): Promise<SavedListingResponse> {
    const { skip, limit, currentPage } = getPagingParameters(filter);
  
    const savedRecord = await this.savedListingModel.findOne({ user_id: userId }, { saved_listings: 1 });
  
    // No saved listings for the user
    const savedIds = savedRecord?.saved_listings ?? [];
    if (!savedIds.length) {
      return emptyListingResponse(currentPage, limit);
    }
  
    const { search, ...restFilter } = filter;
    const query: FilterQuery<Listing> = {
      _id: { $in: savedIds },
      ...restFilter,
      ...(search && {
        user_id: userId,
        google_formatted_address: { $regex: search, $options: 'i' },
      }),
    };
  
    const [total_items, listings] = await Promise.all([
      this.listingModel.countDocuments(query),
      this.listingModel.find(query).skip(skip).limit(limit).exec(),
    ]);
  
    return {
      listings,
      pagination: {
        total_items,
        total_pages: Math.ceil(total_items / limit),
        current_page: currentPage,
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

function emptyListingResponse(currentPage: number, limit: number): SavedListingResponse {
  return {
    listings: [],
    pagination: {
      total_items: 0,
      total_pages: 0,
      current_page: currentPage,
      limit,
    },
  };
}
