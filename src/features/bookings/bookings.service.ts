/* eslint-disable @typescript-eslint/no-explicit-any */
import {
  BadRequestException,
  ConflictException,
  Injectable,
  InternalServerErrorException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { FilterQuery, Model, Types } from 'mongoose';
import { buildSearchQuery, normalizeObjectIdFields } from 'src/utils/helpers';
import { BookingDocument, Booking } from './schemas/bookings.schema';
import { BookingStatusEnum } from './interfaces/bookings.interfaces';
import { NotFoundError } from 'rxjs';
import { TransactionsService } from '../transactions/transactions.service';

@Injectable()
export class BookingService {
  constructor(
    @InjectModel(Booking.name)
    private readonly bookingModel: Model<BookingDocument>,
    private readonly transactionService: TransactionsService,
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
    const booking = await this.getgetBookingByID(bookingId);
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
    const booking = await this.getgetBookingByID(bookingId);

    if (!booking) {
      throw new NotFoundError('booking not found, kindly confirm booking id');
    }

    //verify payment status with paymentRef
    const transaction = await this.transactionService.validatePayment(transactionRef, booking?.customer_id, booking?._id);

    if (!transaction) {
      throw new NotFoundError('transaction not found, kindly confirm transaction reference');
    }

    booking.paymentRef = transactionRef;
    booking.status = BookingStatusEnum.BOOKED;

    return this.updateByFilter({ _id: booking._id }, booking);
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
  async getgetBookingByID(bookingID: string): Promise<BookingDocument | null> {
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

  async getBookings(
    filter: FilterQuery<Booking>,
    page: number = 1,
    limit: number = 10,
  ): Promise<{
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
        data: [{ $skip: (page - 1) * limit }, { $limit: limit }],
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
        current_page: page,
        limit,
      },
    };
  }

  async updateByFilter(
    filter: FilterQuery<Booking>, // Accepts any filter object
    payload: Partial<Booking>,
  ): Promise<BookingDocument | null> {
    return this.bookingModel
      .findOneAndUpdate(filter, payload, { new: true })
      .lean()
      .exec();
  }
}
