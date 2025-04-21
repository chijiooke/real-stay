import {
  BadRequestException,
  ConflictException,
  Injectable,
  InternalServerErrorException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { FilterQuery, Model, Types } from 'mongoose';
import { User, UserDocument } from './schemas/user.schema';
import { buildSearchQuery } from 'src/utils/helpers';

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

  async getUsers(
    filter: FilterQuery<User>,
    search?: string,
    page: number = 1,
    limit: number = 10,
  ): Promise<{
    users: UserDocument[];
    pagination: {
      total_items: number;
      total_pages: number;
      current_page: number;
      limit: number;
    };
  }> {
    const query: FilterQuery<User> = { ...filter };

    if (search) {
      const searchQuery = buildSearchQuery(search, [
        'first_name',
        'last_name',
        'email',
        'phone_number',
      ]);
      query.$and = [searchQuery];
    }

    const [total_items, users] = await Promise.all([
      this.userModel.countDocuments(query),
      this.userModel
        .find(query)
        .skip((page - 1) * limit)
        .limit(limit)
        .exec(),
    ]);

    return {
      users,
      pagination: {
        total_items,
        total_pages: Math.ceil(total_items / limit),
        current_page: page,
        limit,
      },
    };
  }

  async existsByEmail(email: string): Promise<boolean> {
    return !!(await this.userModel.exists({ email }));
  }
}
