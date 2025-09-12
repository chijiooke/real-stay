/* eslint-disable @typescript-eslint/no-explicit-any */
import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Listing, ListingDocument } from '../listing/schemas/listing.schema';
import { User, UserDocument } from '../users/schemas/user.schema';

@Injectable()
export class AnalyticsService {
  constructor(
    @InjectModel(Listing.name)
    private readonly listingModel: Model<ListingDocument>, // Inject Listing model

    @InjectModel(User.name)
    private readonly userModel: Model<UserDocument>, // Inject Listing model
  ) {}

  async getAnalytics(): Promise<any> {
    const userStats = await this.userModel.aggregate([
      {
        $group: {
          _id: null,
          total_users: { $sum: 1 },
          active_users: {
            $sum: {
              $cond: [{ $eq: ['$status', 'active'] }, 1, 0],
            },
          },
          inactive_users: {
            $sum: {
              $cond: [{ $eq: ['$status', 'inactive'] }, 1, 0],
            },
          },
        },
      },
      {
        $project: {
          _id: 0,
          total_users: 1,
          active_users: 1,
          inactive_users: 1,
        },
      },
    ]);

    const listingStats = await this.listingModel.aggregate([
      {
        $group: {
          _id: null,
          total_listings: { $sum: 1 },
          active_listings: {
            $sum: {
              $cond: [{ $eq: ['$status', 'active'] }, 1, 0],
            },
          },
          inactive_listings: {
            $sum: {
              $cond: [{ $eq: ['$status', 'inactive'] }, 1, 0],
            },
          },
        },
      },
      {
        $project: {
          _id: 0,
          total_listings: 1,
          active_listings: 1,
          inactive_listings: 1,
        },
      },
    ]);

    return {
      userStats: userStats[0] || {
        total_users: 0,
        active_users: 0,
        inactive_users: 0,
      },
      listingStats: listingStats[0] || {
        total_listings: 0,
        active_listings: 0,
        inactive_listings: 0,
      },
    };
  }
}
