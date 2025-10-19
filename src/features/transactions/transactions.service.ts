/* eslint-disable @typescript-eslint/no-explicit-any */
import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { ClientSession, FilterQuery, Model, Types } from 'mongoose';
import {
  buildSearchQuery,
  getPagingParameters,
  normalizeObjectIdFields,
} from 'src/utils/helpers';
import { PaystackInitPaymentResponse } from './interfaces/paystack.interface';
import {
  PAYMENT_PROVIDER,
  PaystackVerificationResponse,
  TransactionStatusEnum,
  TransactionTypeEnum,
} from './interfaces/transactions.interfaces';
import { PaystackService } from './payment-providers/paystack';
import { Transaction, TransactionDocument } from './schemas/transaction.schema';

//TO DO: re-write using strategy pattern
@Injectable()
export class TransactionsService {
  constructor(
    @InjectModel(Transaction.name)
    private readonly transactionModel: Model<TransactionDocument>, // Inject Listing model
    private readonly paystackservice: PaystackService,
  ) {}

  async initPayment(
    amount: number,
    email: string,
  ): Promise<PaystackInitPaymentResponse> {
    return await this.paystackservice.initPayment(email, amount);
  }

  async validatePayment(
    reference: string,
    session: ClientSession,
    customerId?: Types.ObjectId,
    bookingId?: Types.ObjectId,
  ): Promise<Partial<TransactionDocument>> {
    // 1. Verify payment with Paystack
    const response: PaystackVerificationResponse =
      await this.paystackservice.verifyTransaction(reference);
  
    if (!response.status || response.data.status !== 'success') {
      throw new BadRequestException('Payment verification failed or was not successful.');
    }
  
    // 2. Normalize amount (Paystack returns amount in kobo)
    const amountInNaira = response.data.amount / 100;
  
    // 3. Construct transaction data
    const transaction: Partial<Transaction> = {
      customer_id: customerId,
      booking_id: bookingId,
      amount: amountInNaira,
      currency: response.data.currency || 'NGN',
      status: TransactionStatusEnum.SUCCESS,
      reference,
      provider: PAYMENT_PROVIDER.PAYSTACK,
      type: TransactionTypeEnum.PAYMENT,
      description: `Payment for booking ${bookingId?.toString() ?? ''}`,
      meta: {
        gateway_response: response.data.gateway_response,
        channel: response.data.channel,
        paid_at: response.data.paid_at,
        ip_address: response.data.ip_address,
        authorization: response.data.authorization,
        customer_email: response.data.customer?.email,
      },
    };
  
    // 4. Persist transaction atomically
    return this.createTransaction(transaction, session);
  }
  

  async recordSplitTransaction(
    data: {
      booking_id: Types.ObjectId;
      transactionRef: string;
      customer_id: Types.ObjectId;
      company_id: Types.ObjectId;
      customerShare: number;
      companyShare: number;
    },
    options: { session?: ClientSession },
  ) {
    return this.transactionModel.create(
      [
        {
          reference: data.transactionRef,
          type: 'CREDIT',
          wallet_owner: data.customer_id,
          amount: data.customerShare,
          description: 'Customer booking reward',
        },
        {
          reference: data.transactionRef,
          type: 'CREDIT',
          wallet_owner: data.company_id,
          amount: data.companyShare,
          description: 'Company booking revenue',
        },
      ],
      { session: options.session },
    );
  }

  async createTransaction(
    data: Partial<Transaction>,
    session?: ClientSession,
  ): Promise<TransactionDocument> {
    const [transaction] = await this.transactionModel.create([data], {
      session,
    });
    return transaction;
  }

  //To Do: write pulling logic, handle reversals

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

  async getTransactions(filter: FilterQuery<Transaction>): Promise<{
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

    const { skip, limit, currentPage } = getPagingParameters(filter);

    // normalize ObjectId fields
    filter = normalizeObjectIdFields(filter, [
      'customer_id',
      'property_owner_id',
      'listing_id',
    ]);

    console.log({ filter });
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
        data: [{ $skip: skip }, { $limit: limit }],
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
        current_page: currentPage,
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
