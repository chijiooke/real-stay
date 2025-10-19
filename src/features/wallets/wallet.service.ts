/* eslint-disable @typescript-eslint/no-explicit-any */
import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
  OnModuleInit,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { FilterQuery, Model, Types } from 'mongoose';
import { WalletStatusEnum } from './interfaces/wallet.interfaces';
import { Wallet, WalletDocument } from './schemas/wallet.schema';
import { User, UserDocument } from '../users/schemas/user.schema';

//TO DO: re-write using strategy pattern
@Injectable()
export class WalletService implements OnModuleInit {
  constructor(
    @InjectModel(Wallet.name)
    private readonly walletModel: Model<WalletDocument>,
    @InjectModel(User.name)
    private readonly userModel: Model<UserDocument>,
  ) {}

  async onModuleInit() {
    await this.ensureCompanyWallet();
    await this.ensureAllUserWallet();
  }

  async createWallet(payload: Partial<Wallet>): Promise<WalletDocument> {
    try {
      const doc = await this.walletModel.create(payload);
      return doc.toObject();
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
        error.message || 'Failed to create wallet',
      );
    }
  }

  async ensureCompanyWallet(): Promise<WalletDocument> {
    // Try to find existing company wallet
    const existing = await this.walletModel
      .findOne({ is_company_wallet: 'true' })
      .lean();
    if (existing) return existing;

    // Otherwise, create one (if another process doesn’t beat us to it)
    try {
      return await this.walletModel.create({
        is_company_wallet: true,
        status: WalletStatusEnum.ACTIVE, // adjust to your enum
        amount: 0,
        currency: 'NGN',
        can_withdraw: true,
        can_deposit: true,
      });
    } catch (err) {
      // Handle duplicate key error in case two processes race to create it
      if (err.code === 11000) {
        const wallet = await this.walletModel
          .findOne({ is_company_wallet: 'true' })
          .lean();
        if (!wallet)
          throw new InternalServerErrorException(
            'Failed to find company wallet',
          );
        return wallet;
      }
      throw err;
    }
  }

  async ensureAllUserWallet(): Promise<void> {
    // 1. Fetch all user IDs
    const users = await this.userModel
      .find({ user_type: { $ne: 'admin' } }, { _id: 1 })
      .lean();
    if (!users.length) return;

    // 2. Get IDs of users who already have wallets
    const existingWallets = await this.walletModel
      .find(
        { customer_id: { $in: users.map((u) => u._id) } },
        { customer_id: 1 },
      )
      .lean();

    const existingIds = new Set(
      existingWallets
        .filter((w) => w.customer_id)
        .map((w) => w?.customer_id?.toString()),
    );

    // 3. Filter out users who already have a wallet
    const usersWithoutWallet = users.filter(
      (u) => !existingIds.has(u._id.toString()),
    );

    if (!usersWithoutWallet.length) return;

    // 4. Create wallets in bulk for missing users
    const newWallets = usersWithoutWallet.map((u) => ({
      customer_id: u._id,
      status: WalletStatusEnum.ACTIVE, // adjust as needed
      amount: 0,
      currency: 'NGN',
      can_withdraw: true,
      can_deposit: true,
    }));

    await this.walletModel.insertMany(newWallets, { ordered: false });
  }

  async ensureUserWallet(userId: Types.ObjectId): Promise<WalletDocument> {
    const existingWallet = await this.walletModel
      .findOne({ customer_id: userId })
      .lean();
    if (existingWallet) return existingWallet;

    try {
      return await this.walletModel.create({
        customer_id: userId,
        currency: 'NGN',
        status: WalletStatusEnum.INACTIVE,
        can_withdraw: false,
        can_deposit: false,
        amount: 0,
      });
    } catch (err) {
      // Handle race condition (e.g., two concurrent signups)
      if (err.code === 11000) {
        const wallet = await this.walletModel
          .findOne({ customer_id: userId })
          .lean();
        if (!wallet)
          throw new InternalServerErrorException('Failed to find wallet');
        return wallet;
      }
      throw err;
    }
  }

  async activateUserWallet(
    userId: Types.ObjectId,
  ): Promise<WalletDocument | null> {
    return this.walletModel
      .findOneAndUpdate(
        { customer_id: userId },
        {
          $set: {
            status: WalletStatusEnum.ACTIVE,
            can_withdraw: true,
            can_deposit: true,
          },
        },
        { new: true },
      )
      .lean();
  }

  //To Do: write pulling logic, handle reversals

  //To Do: hide password from response
  async getWalletByCustomerID(
    customerId: string,
  ): Promise<WalletDocument | null> {
    if (!Types.ObjectId.isValid(customerId)) {
      throw new BadRequestException('Invalid wallet ID');
    }

    const [wallet] = await this.walletModel.aggregate([
      { $match: { customer_id: new Types.ObjectId(customerId) } },
      {
        $lookup: {
          from: 'users',
          let: { customerId: { $toObjectId: '$customer_id' } },
          pipeline: [{ $match: { $expr: { $eq: ['$_id', '$$customerId'] } } }],
          as: 'customer',
        },
      },
      { $unwind: { path: '$customer', preserveNullAndEmptyArrays: true } },
    ]);

    return wallet || null;
  }

  async updateWalletBalance(
    walletId: string,
    amount: number,
  ): Promise<WalletDocument | null> {
    if (!Types.ObjectId.isValid(walletId)) {
      throw new BadRequestException('Invalid wallet ID');
    }

    return this.walletModel
      .findByIdAndUpdate(
        walletId,
        { $set: { amount } },
        { new: true, lean: true },
      )
      .exec();
  }

  async updateWalletByFilter(
    filter: FilterQuery<Wallet>, // Accepts any filter object
    payload: Partial<Wallet>,
  ): Promise<WalletDocument | null> {
    return this.walletModel
      .findOneAndUpdate(filter, payload, { new: true })
      .lean()
      .exec();
  }
}
