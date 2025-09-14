/* eslint-disable @typescript-eslint/no-explicit-any */
import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { FilterQuery, Model, Types } from 'mongoose';
import { buildSearchQuery, normalizeObjectIdFields } from 'src/utils/helpers';
import { Review, ReviewDocument } from './schemas/reviews.schema';

@Injectable()
export class ReviewService {
  constructor(
    @InjectModel(Review.name)
    private readonly reviewModel: Model<ReviewDocument>, // Inject Listing model
  ) {}

  async createReview(payload: Review): Promise<ReviewDocument> {
    try {
      return await this.reviewModel.create(payload);
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
  async getReview(ratingId: string): Promise<ReviewDocument | null> {
    if (!Types.ObjectId.isValid(ratingId)) {
      throw new BadRequestException('invalid id');
    }

    const id = new Types.ObjectId(ratingId);
    const result = await this.reviewModel.aggregate([
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

  async getReviews(
    filter: FilterQuery<Review>,
    page: number = 1,
    limit: number = 10,
  ): Promise<{
    reviews: ReviewDocument[];
    pagination: {
      total_items: number;
      total_pages: number;
      current_page: number;
      limit: number;
    };
  }> {
    // 🔍 handle search
    let searchStr;
    if (filter['search']) {
      searchStr = filter['search'];
      delete filter['search']; // Remove search from filter to avoid conflicts
    }
  
    // normalize ObjectId fields
    filter = normalizeObjectIdFields(filter, [
      'reviewer_id',
      'property_owner_id',
      'listing_id',
    ]);
  
    const baseMatchStage: any = { ...filter };
  
    const pipeline: any[] = [
      { $match: baseMatchStage },
  
      // Lookup owner without password
      {
        $lookup: {
          from: 'users',
          let: { ownerId: '$property_owner_id' },
          pipeline: [
            { $match: { $expr: { $eq: ['$_id', '$$ownerId'] } } },
            { $project: { password: 0 } }, // exclude password
          ],
          as: 'owner',
        },
      },
      { $unwind: { path: '$owner', preserveNullAndEmptyArrays: true } },
  
      // Lookup reviewer without password
      {
        $lookup: {
          from: 'users',
          let: { reviewerId: '$reviewer_id' },
          pipeline: [
            { $match: { $expr: { $eq: ['$_id', '$$reviewerId'] } } },
            { $project: { password: 0 } }, // exclude password
          ],
          as: 'reviewer',
        },
      },
      { $unwind: { path: '$reviewer', preserveNullAndEmptyArrays: true } },
    ];
  
    // Add search filter if present
    if (searchStr && searchStr.trim() !== '') {
      const searchQuery = buildSearchQuery(searchStr, [
        'owner.first_name',
        'owner.last_name',
        'owner.email',
        'reviewer.first_name',
        'reviewer.last_name',
        'reviewer.email',
      ]);
      pipeline.push({ $match: searchQuery });
    }
  
    // Pagination + total count
    pipeline.push({
      $facet: {
        data: [{ $skip: (page - 1) * limit }, { $limit: limit }],
        totalCount: [{ $count: 'count' }],
      },
    });
  
    const result = await this.reviewModel.aggregate(pipeline);
    const reviews = result[0]?.data || [];
    const total_items = result[0]?.totalCount[0]?.count || 0;
  
    return {
      reviews,
      pagination: {
        total_items,
        total_pages: Math.ceil(total_items / limit),
        current_page: page,
        limit,
      },
    };
  }
  

  async updateByFilter(
    filter: FilterQuery<Review>, // Accepts any filter object
    payload: Partial<Review>,
  ): Promise<ReviewDocument | null> {
    return this.reviewModel
      .findOneAndUpdate(filter, payload, { new: true })
      .exec();
  }
}
