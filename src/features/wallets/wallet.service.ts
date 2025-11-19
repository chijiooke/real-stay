/* eslint-disable @typescript-eslint/no-explicit-any */
import {
  BadRequestException,
  forwardRef,
  Inject,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
  OnModuleInit,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import {
  ClientSession,
  FilterQuery,
  Model,
  ModifyResult,
  Types,
} from 'mongoose';
import { generateTransactionReference } from 'src/utils/helpers';
import {
  PAYMENT_PROVIDER,
  TransactionStatusEnum,
  TransactionTypeEnum,
} from '../transactions/interfaces/transactions.interfaces';
import { PaystackService } from '../transactions/payment-providers/paystack';
import { TransactionsService } from '../transactions/transactions.service';
import { User, UserDocument } from '../users/schemas/user.schema';
import { CreateRecipientDto, WithdrawalDto } from './dto/wallet.dto';
import {
  WalletCreditMeta,
  WalletStatusEnum,
  WalletTransactionEntry,
} from './interfaces/wallet.interfaces';
import { Wallet, WalletDocument } from './schemas/wallet.schema';

//TO DO: re-write using strategy pattern
@Injectable()
export class WalletService implements OnModuleInit {
  constructor(
    @InjectModel(Wallet.name)
    private readonly walletModel: Model<WalletDocument>,

    @InjectModel(User.name)
    private readonly userModel: Model<UserDocument>,
    private readonly paystackservice: PaystackService,
    @Inject(forwardRef(() => TransactionsService))
    private readonly transactionService: TransactionsService,
  ) {}

  private static initialized = false;

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

  async addWithdrawalAccount(
    payload: CreateRecipientDto,
  ): Promise<WalletDocument> {
    try {
      const res = await this.paystackservice.createRecipient(payload);

      // Save recipient details to user's wallet
      let wallet = await this.getWalletByCustomerID(payload.userid);
      if (!wallet) {
        wallet = await this.ensureUserWallet(
          new Types.ObjectId(payload.userid),
        );
      }

      //check if wallet details exist
      if (
        wallet.withdrawal_details?.account_no &&
        wallet.withdrawal_details?.account_no != ''
      ) {
        throw new BadRequestException(
          'Withdrawal account already exists for this wallet, kindly contact support to update it',
        );
      }

      wallet = await this.walletModel
        .findOneAndUpdate(
          { _id: wallet._id },
          {
            is_withdrawal_account_set: true,
            withdrawal_details: {
              account_name: res.data.details.account_name,
              account_no: res.data.details.account_number,
              bank_code: res.data.details.bank_code,
              bank_name: res.data.details.bank_name,
              recipient_code: res.data.recipient_code,
            },
          },
          { new: true },
        )
        .lean();

      if (!wallet) {
        throw new InternalServerErrorException('Failed to update wallet');
      }
      return wallet;
    } catch (error) {
      throw new InternalServerErrorException(
        error.message || 'Failed to add bank account',
      );
    }
  }

  async withdraw(payload: WithdrawalDto) {
    try {
      const wallet = await this.getWalletByCustomerID(payload.user_id);
      if (!wallet) {
        throw new NotFoundException('Wallet not found for user');
      }

      if (!wallet.is_withdrawal_account_set || !wallet.withdrawal_details) {
        throw new BadRequestException(
          'No withdrawal account set for this wallet',
        );
      }

      if (wallet.balance < payload.amount) {
        throw new BadRequestException('Insufficient wallet balance');
      }

      //create a transaction record
      const reference = generateTransactionReference('outflow');

      //create a transaction record
      await this.transactionService.createTransaction({
        amount: payload.amount,
        currency: wallet.currency,
        customer_id: wallet.customer_id,
        type: TransactionTypeEnum.WALLET_OUTFLOW,
        status: TransactionStatusEnum.PENDING,
        description: 'Wallet withdrawal initiated',
        reference,
        wallet_id: wallet.id,
        provider: PAYMENT_PROVIDER.PAYSTACK,
      });

      // Proceed with withdrawal via Paystack
      await this.paystackservice.initiateTransfer({
        source: 'balance',
        amount: payload.amount,
        recipient: wallet.withdrawal_details.recipient_code,
        reason: 'Wallet Withdrawal',
        reference,
      });

      return { message: 'withdrawal initiated succesfully' };
    } catch (error) {
      throw new InternalServerErrorException(
        error.message || 'Failed to process withdrawal',
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
        balance: 0,
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
    if (WalletService.initialized) return; // already ran
    WalletService.initialized = true;

    console.log('wallet creation worker started... 🏁');
    // 1. Fetch all user IDs
    const users = await this.userModel
      .find({ user_type: { $ne: 'admin' } })
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

    if (!usersWithoutWallet.length) {
      console.info(
        'wallet creation worker completed, no wallet issues found ✅',
      );
      return;
    }

    // 4. Create wallets in bulk for missing users
    const newWallets = usersWithoutWallet.map((u) => ({
      customer_id: u._id,
      status: WalletStatusEnum.ACTIVE, // adjust as needed
      balance: 0,
      currency: 'NGN',
      can_withdraw: true,
      can_deposit: true,
    }));

    await this.walletModel.insertMany(newWallets, { ordered: false });

    console.info('wallet creation worker completed ✅');
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
        balance: 0,
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

  async updateWalletBalance(
    walletId: string,
    amount: number,
    session?: ClientSession,
  ) {
    return this.walletModel.updateOne(
      { _id: walletId },
      { $inc: { balance: amount } },
      { session },
    );
  }

  async creditWalletByWalletID(
    wallet_id: Types.ObjectId,
    amount: number,
    meta: {
      reference: string;
      type: string;
      description?: string;
      session?: ClientSession;
    },
  ) {
    return this.walletModel.updateOne(
      { _id: wallet_id },
      {
        $inc: { balance: amount },
        $push: {
          transactions: {
            reference: meta.reference,
            amount,
            type: meta.type,
            description: meta.description,
            createdAt: new Date(),
          },
        },
      },
      { session: meta.session },
    );
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

  //===============================

  /**
   * Credit a customer wallet by customer ID
   * @param customer_id - Customer's ObjectId
   * @param amount - Amount to credit (must be positive)
   * @param meta - Transaction metadata including reference, type, description, and session
   * @returns Updated wallet document
   */
  async creditWalletByCustomerID(
    customer_id: Types.ObjectId,
    amount: number,
    meta: WalletCreditMeta,
  ): Promise<ModifyResult<WalletDocument>> {
    // Validation
    if (!customer_id || !Types.ObjectId.isValid(customer_id)) {
      throw new BadRequestException('Invalid customer ID');
    }

    if (amount <= 0) {
      throw new BadRequestException('Credit amount must be greater than zero');
    }

    if (!meta.reference) {
      throw new BadRequestException('Transaction reference is required');
    }

    const transactionEntry: WalletTransactionEntry = {
      reference: meta.reference,
      amount,
      type: meta.type,
      description: meta.description || `Wallet credit - ${meta.type}`,
      createdAt: new Date(),
      status: 'SUCCESS',
    };

    const updateOptions: any = {
      new: true, // Return updated document
      runValidators: true, // Run schema validators
    };

    if (meta.session) {
      updateOptions.session = meta.session;
    }

    // Perform atomic update
    const updatedWallet = await this.walletModel.findOneAndUpdate(
      {
        customer_id,
        is_company_wallet: false, // Ensure it's a customer wallet
        can_deposit: true, // Ensure deposits are allowed
      },
      {
        $inc: { balance: amount },
        $push: {
          transactions: {
            $each: [transactionEntry],
            $position: 0, // Add to beginning of array
            $slice: 100, // Keep only last 100 transactions in embedded array
          },
        },
      },
      updateOptions,
    );

    if (!updatedWallet) {
      throw new NotFoundException(
        `Wallet not found for customer ${customer_id} or deposits are disabled`,
      );
    }

    console.log(
      `✅ Wallet credited successfully. New balance: ${updatedWallet?.value?.balance}`,
    );

    return updatedWallet;
  }

  /**
   * Credit the company wallet
   * @param amount - Amount to credit (must be positive)
   * @param meta - Transaction metadata including reference, type, description, and session
   * @returns Updated wallet document
   */
  async creditCompanyWallet(
    amount: number,
    meta: WalletCreditMeta,
  ): Promise<ModifyResult<WalletDocument>> {
    // Validation
    if (amount <= 0) {
      throw new BadRequestException('Credit amount must be greater than zero');
    }

    if (!meta.reference) {
      throw new BadRequestException('Transaction reference is required');
    }

    console.log(`Crediting company wallet, amount: ${amount}`);

    const transactionEntry: WalletTransactionEntry = {
      reference: meta.reference,
      amount,
      type: meta.type,
      description: meta.description || `Company revenue - ${meta.type}`,
      createdAt: new Date(),
      status: 'SUCCESS',
    };

    const updateOptions: any = {
      new: true,
      runValidators: true,
    };

    if (meta.session) {
      updateOptions.session = meta.session;
    }

    // Perform atomic update - FIXED: $inc balance, not amount
    const updatedWallet = await this.walletModel
      .findOneAndUpdate(
        {
          is_company_wallet: true, // Use boolean instead of string
          can_deposit: true,
        },
        {
          $inc: { balance: amount }, // FIXED: was $inc: { amount }
          $push: {
            transactions: {
              $each: [transactionEntry],
              $position: 0,
              $slice: 100,
            },
          },
        },
        updateOptions,
      )
      .exec();

    if (!updatedWallet) {
      throw new NotFoundException(
        'Company wallet not found or deposits are disabled',
      );
    }

    console.log(
      `✅ Company wallet credited successfully. New balance: ${updatedWallet.value?.balance}`,
    );

    return updatedWallet;
  }

  /**
   * Get company wallet
   * @param options - Optional session for transactions
   * @returns Company wallet document
   */
  async getCompanyWallet(options?: {
    session?: ClientSession;
  }): Promise<WalletDocument | null> {
    const query = this.walletModel.findOne({
      is_company_wallet: true,
    });

    if (options?.session) {
      query.session(options.session);
    }

    return query.exec();
  }

  /**
   * Get wallet by customer ID with user details
   * @param customerId - Customer's ID as string
   * @param options - Optional session for transactions
   * @returns Wallet document with populated customer details
   */
  async getWalletByCustomerID(
    customerId: string,
    options?: { session?: ClientSession },
  ): Promise<WalletDocument | null> {
    console.log({ customerId });
    if (!Types.ObjectId.isValid(customerId)) {
      throw new BadRequestException('Invalid customer ID');
    }

    const pipeline = [
      {
        $match: {
          customer_id: new Types.ObjectId(customerId),
        },
      },
      {
        $lookup: {
          from: 'users',
          let: { customerId: '$customer_id' },
          pipeline: [
            { $match: { $expr: { $eq: ['$_id', '$$customerId'] } } },
            { $project: { password: 0 } }, // Hide password from response
          ],
          as: 'customer',
        },
      },
      { $unwind: { path: '$customer', preserveNullAndEmptyArrays: true } },
    ];

    const aggregation = this.walletModel.aggregate(pipeline);

    if (options?.session) {
      aggregation.session(options.session);
    }

    const [wallet] = await aggregation.exec();

    return wallet || null;
  }

  /**
   * Debit a customer wallet by customer ID
   * @param customer_id - Customer's ObjectId
   * @param amount - Amount to debit (must be positive)
   * @param meta - Transaction metadata
   * @returns Updated wallet document
   */
  // async debitWalletByCustomerID(
  //   customer_id: Types.ObjectId,
  //   amount: number,
  //   meta: WalletCreditMeta,
  // ): Promise<WalletDocument> {
  //   if (!customer_id || !Types.ObjectId.isValid(customer_id)) {
  //     throw new BadRequestException('Invalid customer ID');
  //   }

  //   if (amount <= 0) {
  //     throw new BadRequestException('Debit amount must be greater than zero');
  //   }

  //   if (!meta.reference) {
  //     throw new BadRequestException('Transaction reference is required');
  //   }

  //   console.log(
  //     `Debiting wallet for customer: ${customer_id}, amount: ${amount}`,
  //   );

  //   // First check if wallet has sufficient balance
  //   const wallet = await this.walletModel.findOne(
  //     { customer_id, is_company_wallet: false },
  //     null,
  //     { session: meta.session },
  //   );

  //   if (!wallet) {
  //     throw new NotFoundException(
  //       `Wallet not found for customer ${customer_id}`,
  //     );
  //   }

  //   if (!wallet.can_withdraw) {
  //     throw new BadRequestException('Withdrawals are disabled for this wallet');
  //   }

  //   if (wallet.balance < amount) {
  //     throw new BadRequestException(
  //       `Insufficient balance. Available: ${wallet.balance}, Required: ${amount}`,
  //     );
  //   }

  //   const transactionEntry: WalletTransactionEntry = {
  //     reference: meta.reference,
  //     amount: -amount, // Negative for debit
  //     type: meta.type,
  //     description: meta.description || `Wallet debit - ${meta.type}`,
  //     createdAt: new Date(),
  //     status: 'SUCCESS',
  //   };

  //   const updateOptions: any = {
  //     new: true,
  //     runValidators: true,
  //   };

  //   if (meta.session) {
  //     updateOptions.session = meta.session;
  //   }

  //   const updatedWallet = await this.walletModel.findOneAndUpdate(
  //     {
  //       customer_id,
  //       is_company_wallet: false,
  //       balance: { $gte: amount }, // Double-check sufficient balance
  //     },
  //     {
  //       $inc: { balance: -amount },
  //       $push: {
  //         transactions: {
  //           $each: [transactionEntry],
  //           $position: 0,
  //           $slice: 100,
  //         },
  //       },
  //     },
  //     updateOptions,
  //   );

  //   if (!updatedWallet) {
  //     throw new InternalServerErrorException(
  //       'Failed to debit wallet. Possible race condition or insufficient balance.',
  //     );
  //   }

  //   console.log(
  //     `✅ Wallet debited successfully. New balance: ${updatedWallet.balance}`,
  //   );

  //   return updatedWallet;
  // }

  /**
   * Get wallet balance by customer ID
   * @param customer_id - Customer's ObjectId
   * @param session - Optional MongoDB session
   * @returns Current wallet balance
   */
  async getWalletBalance(
    customer_id: Types.ObjectId,
    session?: ClientSession,
  ): Promise<number> {
    const wallet = await this.walletModel.findOne(
      { customer_id, is_company_wallet: false },
      { balance: 1 },
      { session },
    );

    if (!wallet) {
      throw new NotFoundException(
        `Wallet not found for customer ${customer_id}`,
      );
    }

    return wallet.balance;
  }

  /**
   * Check if a transaction reference already exists
   * @param reference - Transaction reference to check
   * @param session - Optional MongoDB session
   * @returns true if reference exists
   */
  async isDuplicateTransaction(
    reference: string,
    session?: ClientSession,
  ): Promise<boolean> {
    const wallet = await this.walletModel.findOne(
      { 'transactions.reference': reference },
      { _id: 1 },
      { session },
    );

    return !!wallet;
  }
}
