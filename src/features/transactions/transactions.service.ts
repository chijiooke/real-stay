/* eslint-disable @typescript-eslint/no-explicit-any */
import {
  BadRequestException,
  forwardRef,
  Inject,
  Injectable,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { ClientSession, FilterQuery, Model, Types } from 'mongoose';
import {
  buildSearchQuery,
  getPagingParameters,
  normalizeObjectIdFields,
} from 'src/utils/helpers';
import { CurrencyEnum } from '../wallets/interfaces/wallet.interfaces';
import { WalletService } from '../wallets/wallet.service';
import { PaystackWebhookDTO } from './dto/transactions.dto';
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
  private readonly logger = new Logger(TransactionsService.name);

  constructor(
    @InjectModel(Transaction.name)
    private readonly transactionModel: Model<TransactionDocument>, // Inject Listing model
    private readonly paystackservice: PaystackService,
    // private readonly walletservice: WalletService,

    @Inject(forwardRef(() => WalletService))
    private readonly walletservice: WalletService,
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

    if (!response.status) {
      throw new BadRequestException(
        'Payment verification failed or was not successful.',
      );
    }

    // 2. Normalize amount (Paystack returns amount in kobo)
    // const amountInNaira = response.data.amount / 100;

    // 3. Construct transaction data
    const transaction: Partial<Transaction> = {
      customer_id: customerId,
      booking_id: bookingId,
      amount: response.data.amount,
      currency: response.data.currency || 'NGN',
      status: response.data.status as TransactionStatusEnum,
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
        status: response.data.status,
      },
    };

    // 4. Persist transaction atomically
    return this.createTransaction(transaction, session);
  }

  async recordSplitTransaction(
    data: {
      booking_id: Types.ObjectId;
      transactionRef: string;
      property_owner_wallet_id: Types.ObjectId;
      property_owner_customer_id: Types.ObjectId;
      company_wallet_id: Types.ObjectId;
      customerShare: number;
      companyShare: number;
    },
    options: { session?: ClientSession },
  ) {

    return this.transactionModel.create(
      [
        {
          reference: data.transactionRef,
          type: TransactionTypeEnum.WALLET_INFLOW,
          wallet_id: data.property_owner_wallet_id,
          customer_id: data.property_owner_customer_id,
          amount: data.customerShare,
          description: 'Payment for booking',
          currency: CurrencyEnum.NAIRA,
          status: TransactionStatusEnum.SUCCESS,
          booking_id: data.booking_id,
          provider: PAYMENT_PROVIDER.PAYSTACK,
        },
        {
          reference: data.transactionRef,
          type: TransactionTypeEnum.WALLET_INFLOW,
          wallet_id: data.company_wallet_id,
          amount: data.companyShare,
          description: 'Company booking revenue',
          currency: CurrencyEnum.NAIRA,
          status: TransactionStatusEnum.SUCCESS,
          provider: PAYMENT_PROVIDER.PAYSTACK,
          booking_id: data.booking_id,
        },
      ],
      { session: options.session, ordered: true },
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

  async getTransaction(
    filter: FilterQuery<Transaction>,
    options?: { session?: ClientSession },
  ): Promise<TransactionDocument | null> {
    // Normalize ObjectId fields
    filter = normalizeObjectIdFields(filter, [
      'customer_id',
      'property_owner_id',
      'listing_id',
    ]);

    const pipeline: any[] = [
      { $match: filter },
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

    // Build aggregation options
    const aggregateOptions: any = {};
    if (options?.session) {
      aggregateOptions.session = options.session;
    }

    // Run aggregation with session support
    const result = await this.transactionModel
      .aggregate(pipeline)
      .session(options?.session || null)
      .exec();

    return result[0] || null;
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

  //webhook event handlers

  async handlePaystackWebhook(data: PaystackWebhookDTO): Promise<void> {
    const reference = data?.data?.reference;
    const amount = data?.data?.amount;

    // Validate transaction existence
    const transaction = await this.getTransaction({ reference });
    if (!transaction) {
      this.logger.error(`Transaction not found for reference: ${reference}`);
      throw new InternalServerErrorException('Transaction not found');
    }

    // Dispatch event to the appropriate handler
    await this.handleEvent(data.event, transaction, amount, data);
  }

  private async handleEvent(
    event: string,
    transaction: any,
    amount: number,
    data: PaystackWebhookDTO,
  ): Promise<void> {
    switch (event) {
      case 'transfer.success':
        await this.handleTransferSuccess(transaction, amount, data);
        break;

      case 'transfer.failed':
        await this.handleTransferFailure(transaction);
        break;

      case 'transfer.reversed':
        await this.handleTransferReversal(transaction);
        break;

      default:
        this.logger.warn(`Unhandled Paystack event: ${event}`);
        break;
    }
  }

  private async handleTransferSuccess(
    transaction: any,
    amount: number,
    data: PaystackWebhookDTO,
  ): Promise<void> {
    // Validate wallet existence
    const wallet = await this.walletservice.getWalletByCustomerID(
      transaction.customer_id?.toHexString(),
    );
    if (!wallet) {
      this.logger.error(
        `Wallet not found for customer ID: ${transaction.customer_id}`,
      );
      throw new InternalServerErrorException('Wallet not found');
    }

    // Deduct amount from wallet balance
    await this.walletservice.updateWalletBalance(wallet.id, -amount);

    // Update transaction status to success
    await this.updateTransactionByFilter(
      { reference: transaction.reference },
      {
        status: TransactionStatusEnum.SUCCESS,
        meta: { transfer_code: data.data.transfer_code },
        description: 'Wallet withdrawal successful',
      },
    );

    this.logger.log(`Transfer success processed for ${transaction.reference}`);
  }

  private async handleTransferFailure(transaction: any): Promise<void> {
    // Update transaction status to failed
    await this.updateTransactionByFilter(
      { reference: transaction.reference },
      {
        status: TransactionStatusEnum.FAILED,
        description: 'Wallet withdrawal failed',
      },
    );

    this.logger.warn(`Transfer failed for ${transaction.reference}`);
  }

  private async handleTransferReversal(transaction: any): Promise<void> {
    // Update transaction status to reversed
    await this.updateTransactionByFilter(
      { reference: transaction.reference },
      {
        status: TransactionStatusEnum.REVERSED,
        description: 'Wallet withdrawal reversed',
      },
    );

    this.logger.warn(`Transfer reversed for ${transaction.reference}`);
  }
}
