import {
  BadRequestException,
  ConflictException,
  Injectable,
  InternalServerErrorException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { FilterQuery, Model, PipelineStage, Types } from 'mongoose';
import { User, UserDocument } from './schemas/user.schema';
import { buildSearchQuery, getPagingParameters } from 'src/utils/helpers';

@Injectable()
export class UsersService {
  constructor(
    @InjectModel(User.name) private readonly userModel: Model<UserDocument>,
  ) {}

  async createUser(payload: User): Promise<UserDocument> {
    try {
      const normalizedEmail = payload.email.toLowerCase(); // Normalize email
      const existingUser = await this.userModel
        .findOne({ email: normalizedEmail })
        .lean()
        .exec();

      if (existingUser) {
        throw new ConflictException('User with this email already exists');
      }

      const newUser = new this.userModel({
        ...payload,
        email: normalizedEmail,
      });
      return await newUser.save();
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
      throw new InternalServerErrorException('Failed to create user');
    }
  }

  async findById(id: string): Promise<UserDocument | null> {
    return await this.userModel
      .findOne({ _id: new Types.ObjectId(id) })
      .lean()
      .exec();
  }

  async findByEmail(email: string): Promise<UserDocument | null> {
    return await this.userModel
      .findOne({ email: email.toLowerCase() })
      .lean()
      .exec();
  }

  async findByFilter(
    filter: FilterQuery<UserDocument>,
  ): Promise<Partial<UserDocument> | null> {
    return this.userModel.findOne(filter).lean().exec();
  }

  async updateById(
    id: string,
    payload: Partial<User>,
  ): Promise<UserDocument | null> {
    return this.userModel
      .findByIdAndUpdate(new Types.ObjectId(id), payload, { new: true })
      .exec();
  }

  async updateByFilter(
    filter: FilterQuery<User>, // Accepts any filter object
    payload: Partial<User>,
  ): Promise<UserDocument | null> {
    return this.userModel
      .findOneAndUpdate(filter, payload, { new: true })
      .exec();
  }

  async getUsers(filter: FilterQuery<User>): Promise<{
    users: UserDocument[];
    pagination: {
      total_items: number;
      total_pages: number;
      current_page: number;
      limit: number;
    };
  }> {
    let searchStr: string | undefined;
    if (filter['search']) {
      searchStr = filter['search'];
      delete filter['search'];
    }

    const { skip, limit, currentPage } = getPagingParameters(filter);

    const matchStage: FilterQuery<User> = { ...filter };
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const pipeline: any[] = [];

    // Step 1: Match basic filters
    pipeline.push({ $match: matchStage });

    // Step 2: Search filter using $or
    if (searchStr) {
      const searchQuery = buildSearchQuery(searchStr, [
        'first_name',
        'last_name',
        'email',
        'phone_number',
      ]);
      pipeline.push({ $match: searchQuery });
    }

    pipeline.push({
      $lookup: {
        from: 'reviews',
        localField: '_id',
        foreignField: 'property_owner_id',
        as: 'reviews',
      },
    });
    pipeline.push({
      $addFields: {
        average_rating: {
          $cond: [
            { $gt: [{ $size: '$reviews' }, 0] },
            { $avg: '$reviews.rating_score' },
            null,
          ],
        },
      },
    });
    pipeline.push({
      $project: {
        reviews: 0, // exclude reviews array
      },
    });

    // Step 3: Facet for pagination and count
    pipeline.push({
      $facet: {
        data: [{ $skip: skip }, { $limit: limit }],
        totalCount: [{ $count: 'count' }],
      },
    });

    // Step 4: Run aggregation
    const result = await this.userModel.aggregate(pipeline).exec();

    const users = result[0]?.data || [];
    const total_items = result[0]?.totalCount?.[0]?.count || 0;

    return {
      users,
      pagination: {
        total_items,
        total_pages: Math.ceil(total_items / limit),
        current_page: currentPage,
        limit,
      },
    };
  }

  async getUser(id: string): Promise<{ user: UserDocument | null }> {
    const pipeline: PipelineStage[] = [
      // Match the user by ID
      {
        $match: {
          _id: new Types.ObjectId(id),
        },
      },
      // Join reviews where this user is the property owner
      {
        $lookup: {
          from: 'reviews',
          localField: '_id',
          foreignField: 'property_owner_id',
          as: 'reviews',
        },
      },
      // Calculate average rating score
      {
        $addFields: {
          average_rating: {
            $cond: [
              { $gt: [{ $size: '$reviews' }, 0] },
              { $avg: '$reviews.rating_score' },
              null,
            ],
          },
        },
      },
      // Exclude full reviews array
      {
        $project: {
          reviews: 0,
        },
      },
    ];
  
    const result = await this.userModel.aggregate(pipeline).exec();
    const user = result[0] || null;
  
    return {
      user,
    };
  }
  

  async existsByEmail(email: string): Promise<boolean> {
    return !!(await this.userModel.exists({ email }));
  }
}
