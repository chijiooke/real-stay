/* eslint-disable @typescript-eslint/no-explicit-any */
import {
  BadRequestException,
  ConflictException,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { InjectConnection, InjectModel } from '@nestjs/mongoose';
import { ClientSession, Connection, FilterQuery, Model, Types } from 'mongoose';
import {
  buildSearchQuery,
  getPagingParameters,
  normalizeObjectIdFields,
} from 'src/utils/helpers';
import { BookingDocument, Booking } from './schemas/bookings.schema';
import { BookingStatusEnum } from './interfaces/bookings.interfaces';
import { NotFoundError } from 'rxjs';
import { TransactionsService } from '../transactions/transactions.service';
import { WalletService } from '../wallets/wallet.service';

@Injectable()
export class BookingService {
  constructor(
    @InjectModel(Booking.name)
    @InjectConnection()
    private readonly connection: Connection,
    private readonly bookingModel: Model<BookingDocument>,
    private readonly transactionService: TransactionsService,
    private readonly walletService: WalletService,
  ) {}

  async requestReservation(payload: Booking): Promise<BookingDocument> {
    const filter = {
      listing_id: payload.listing_id,
      status: { $in: [BookingStatusEnum.RESERVED, BookingStatusEnum.BOOKED] },
      $and: [
        { start_date: { $lte: payload.end_date } }, // existing booking starts before requested end
        { end_date: { $gte: payload.start_date } }, // existing booking ends after requested start
      ],
    };

    const conflict = await this.bookingModel.findOne(filter);

    if (conflict) {
      throw new ConflictException(
        'This listing is already booked/reserved for the selected dates, kindly select another date',
      );
    }

    payload.status = BookingStatusEnum.PENDING;
    return await this.createBooking(payload);
  }

  async reviewReservation(
    status: BookingStatusEnum,
    bookingId: string,
  ): Promise<BookingDocument | null> {
    const booking = await this.getBookingByID(bookingId);
    if (!booking) {
      throw new NotFoundError('booking not found, kindly confirm booking id');
    }

    if (booking.status === BookingStatusEnum.BOOKED) {
      throw new BadRequestException(
        "invalid action: can't cancel a booked listing, kindly contact support",
      );
    }

    if (status === BookingStatusEnum.BOOKED) {
      throw new BadRequestException('invalid status provided');
    }

    booking.status = status;
    return this.updateByFilter({ _id: booking._id }, booking);
  }

  async completeBooking(
    transactionRef: string,
    bookingId: string,
  ): Promise<BookingDocument | null> {
    const booking = await this.getBookingByID(bookingId);
    if (!booking) {
      throw new NotFoundException('Booking not found. Kindly confirm booking ID.');
    }
  
    const session = await this.connection.startSession();
    session.startTransaction();
  
    try {
      // 1. Validate payment
      const transaction = await this.transactionService.validatePayment(
        transactionRef,
        session,
        booking.customer_id,
        booking._id,
      );
  
      if (!transaction) {
        throw new NotFoundException('Transaction not found. Kindly confirm reference.');
      }
  
      // 2. Compute split logic
      const totalAmount = transaction.amount || 0;
      const companyShare = totalAmount * 0.9;
      const customerShare = totalAmount * 0.1;
  
      // 3. Get company wallet
      const companyWallet = await this.walletService.getCompanyWallet();
      if (!companyWallet) {
        throw new InternalServerErrorException('Company wallet not found.');
      }
  
      // 4. Perform atomic wallet credits
      await Promise.all([
        this.walletService.creditWallet(booking.customer_id, customerShare, {
          reference: transactionRef,
          type: 'BOOKING_REWARD',
          description: `Reward for booking ${booking._id}`,
          session,
        }),
        this.walletService.creditCompanyWallet(companyShare, {
          reference: transactionRef,
          type: 'BOOKING_REVENUE',
          description: `Company share for booking ${booking._id}`,
          session,
        }),
      ]);
  
      // 5. Record accounting entries
      await this.transactionService.recordSplitTransaction(
        {
          booking_id: booking._id,
          transactionRef,
          customer_id: booking.customer_id,
          company_id: companyWallet.id,
          customerShare,
          companyShare,
        },
        { session },
      );
  
      // 6. Update booking
      await this.updateByFilter(
        { _id: booking._id },
        {
          ...booking.toObject(),
          status: BookingStatusEnum.BOOKED,
          paymentRef: transactionRef,
        },
        { session },
      );
  
      // 7. Commit and return
      await session.commitTransaction();
      return booking;
    } catch (error) {
      await session.abortTransaction();
      throw error;
    } finally {
      session.endSession();
    }
  }
  

  async createBooking(payload: Booking): Promise<BookingDocument> {
    try {
      //check if booking if listing is avaliable on the days
      return (await this.bookingModel.create(payload)).toObject();
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
  async getBookingByID(bookingID: string): Promise<BookingDocument | null> {
    if (!Types.ObjectId.isValid(bookingID)) {
      throw new BadRequestException('invalid id');
    }

    const id = new Types.ObjectId(bookingID);
    const result = await this.bookingModel.aggregate([
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

  async getBookings(filter: FilterQuery<Booking>): Promise<{
    bookings: BookingDocument[];
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
    const { skip, limit, currentPage } = getPagingParameters(filter);
    filter = normalizeObjectIdFields(filter, [
      'customer_id',
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
        data: [{ $skip: skip }, { $limit: limit }],
        totalCount: [{ $count: 'count' }],
      },
    });

    const result = await this.bookingModel.aggregate(pipeline);
    const bookings = result[0]?.data || [];
    const total_items = result[0]?.totalCount[0]?.count || 0;

    return {
      bookings,
      pagination: {
        total_items,
        total_pages: Math.ceil(total_items / limit),
        current_page: currentPage,
        limit,
      },
    };
  }

  async updateByFilter(
    filter: FilterQuery<Booking>,
    payload: Partial<Booking>,
    options?: { session?: ClientSession },
  ): Promise<BookingDocument | null> {
    return this.bookingModel
      .findOneAndUpdate(filter, payload, {
        new: true,
        session: options?.session,
      })
      .lean()
      .exec();
  }
}
