import {
  BadRequestException,
  ConflictException,
  Injectable,
  InternalServerErrorException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { FilterQuery, Model, Types } from 'mongoose';
import { User, UserDocument } from './schemas/user.schema';

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

  async findByEmail(email: string): Promise<UserDocument | null> {
    return await this.userModel
      .findOne({ email: email.toLowerCase() })
      .lean()
      .exec();
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
}
