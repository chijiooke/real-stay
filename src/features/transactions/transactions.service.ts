/* eslint-disable @typescript-eslint/no-explicit-any */
import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { FilterQuery, Model, Types } from 'mongoose';
import { buildSearchQuery, normalizeObjectIdFields } from 'src/utils/helpers';
import { Transaction, TransactionDocument } from './schemas/transaction.schema';
import { PaystackService } from './payment-providers/paystack';
import {
  PaystackVerificationData,
  PaystackVerificationResponse,
  TransactionStatusEnum,
} from './interfaces/transactions.interfaces';

@Injectable()
export class TransactionsService {
  constructor(
    @InjectModel(Transaction.name)
    private readonly transactionModel: Model<TransactionDocument>, // Inject Listing model
    private readonly paystackservice: PaystackService,
  ) {}

  async validatePayment(
    reference: string,
    customer_id?: string,
  ): Promise<TransactionDocument> {
    const res: PaystackVerificationResponse =
      await this.paystackservice.verifyTransaction(reference);

    if (!res.status) {
      throw new BadRequestException('payment not successful');
    }

    let cusObj: Types.ObjectId;
    if (customer_id) {
      if (!Types.ObjectId.isValid(customer_id)) {
        throw new BadRequestException('invalid customer id');
      }

      
      cusObj = customer_id;
    }

    const trxn = {
      amount: res.data.amount, // Paystack returns amount in kobo
      currency: res.data.currency,
      status: res.data.status as TransactionStatusEnum,
      reference,
      customer_id: cusObj,
    };

    return this.createTransaction(trxn);
  }

  async createTransaction(payload: Transaction): Promise<TransactionDocument> {
    try {
      //check if booking if listing is avaliable on the days
      return (await this.transactionModel.create(payload)).toObject();
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
        error.message || 'Failed to create booking',
      );
    }
  }

  //To Do: hide password from response
  async getTransactionByID(
    transactionID: string,
  ): Promise<TransactionDocument | null> {
    if (!Types.ObjectId.isValid(transactionID)) {
      throw new BadRequestException('invalid id');
    }

    const id = new Types.ObjectId(transactionID);
    const result = await this.transactionModel.aggregate([
      {
        $match: { _id: id },
      },
      {
        $addFields: {
          customerId: { $toObjectId: '$customer_id' },
        },
      },
      {
        $lookup: {
          from: 'users',
          localField: 'customerId',
          foreignField: '_id',
          as: 'customer',
        },
      },
      {
        $unwind: { path: '$customer', preserveNullAndEmptyArrays: true },
      },
    ]);

    return result.length > 0 ? result[0] : null;
  }

  async getTransactions(
    filter: FilterQuery<Transaction>,
    page: number = 1,
    limit: number = 10,
  ): Promise<{
    transactions: TransactionDocument[];
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
      'customer_id',
      'property_owner_id',
      'listing_id',
    ]);

    const baseMatchStage: any = { ...filter };

    const pipeline: any[] = [
      { $match: baseMatchStage },

      // Lookup customer without password
      {
        $lookup: {
          from: 'users',
          let: { customerId: '$customer_id' },
          pipeline: [
            { $match: { $expr: { $eq: ['$_id', '$$customerId'] } } },
            { $project: { password: 0 } }, // exclude password
          ],
          as: 'customer',
        },
      },
      { $unwind: { path: '$customer', preserveNullAndEmptyArrays: true } },
    ];

    // Add search filter if present
    if (searchStr && searchStr.trim() !== '') {
      const searchQuery = buildSearchQuery(searchStr, [
        'customer.first_name',
        'customer.last_name',
        'customer.email',
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

    const result = await this.transactionModel.aggregate(pipeline);
    const transactions = result[0]?.data || [];
    const total_items = result[0]?.totalCount[0]?.count || 0;

    return {
      transactions,
      pagination: {
        total_items,
        total_pages: Math.ceil(total_items / limit),
        current_page: page,
        limit,
      },
    };
  }

  async updateTransactionByFilter(
    filter: FilterQuery<Transaction>, // Accepts any filter object
    payload: Partial<Transaction>,
  ): Promise<TransactionDocument | null> {
    return this.transactionModel
      .findOneAndUpdate(filter, payload, { new: true })
      .lean()
      .exec();
  }
}
