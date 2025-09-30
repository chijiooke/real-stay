import {
  Body,
  Controller,
  Get,
  NotFoundException,
  Param,
  Patch,
  Post,
  Query,
  Request,
  UnauthorizedException,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwtAuthGuard';
import { ListingService } from '../listing/listing.service';
import { BookingService } from './bookings.service';
import { Booking } from './schemas/bookings.schema';
import { BookingStatusEnum } from './interfaces/bookings.interfaces';
import { ParseBookingStatusPipe } from 'src/utils/helpers';
import { CompleteBookingDto } from './dto/booking.dto';

@Controller('bookings')
export class bookingsController {
  constructor(
    private readonly bookingService: BookingService,
    private readonly listingService: ListingService,
  ) {}

  @Post('')
  @UseGuards(JwtAuthGuard)
  async create(
    @Body() payload: Booking, // eslint-disable-next-line @typescript-eslint/no-explicit-any
    @Request() authData: any,
  ) {
    const listing = await this.listingService.getListing(
      payload.listing_id.toString(),
    );

    if (!listing) {
      throw new NotFoundException('Listing not found');
    }

    payload.customer_id = authData.user._id;
    payload.property_owner_id = listing.owner_id;
    return this.bookingService.requestReservation(payload);
  }

  @Get('')
  @UseGuards(JwtAuthGuard)
  async get(@Query() filter: Record<string, string>) {
    return this.bookingService.getBookings(filter);
  }

  @Get('/:id')
  @UseGuards(JwtAuthGuard)
  async getByListingId(@Param('id') id: string) {
    return this.bookingService.getgetBookingByID(id);
  }

  @Patch('/:id/:status')
  @UseGuards(JwtAuthGuard)
  async reviewReservation(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    @Request() authData: any,
    @Param('id') bookingId: string,
    @Param('status', ParseBookingStatusPipe) status: BookingStatusEnum,
  ) {
    //if user is not an admin or host prevent this action
    const booking = await this.bookingService.getgetBookingByID(bookingId);

    if (!booking) {
      throw new NotFoundException('booking not found');
    }

    console.log(authData.user._id.toHexString());
    if (
      booking.property_owner_id.toHexString() !==
        authData.user._id.toHexString() &&
      authData.user.user_type != 'admin' &&
      status != BookingStatusEnum.CANCELLED
    ) {
      throw new UnauthorizedException(
        'Only the booking owner or an admin can make this action to a booking.',
      );
    }

    return this.bookingService.reviewReservation(
      status.toUpperCase() as BookingStatusEnum,
      bookingId,
    );
  }

  @Post('/complete')
  @UseGuards(JwtAuthGuard)
  async completeBooking(@Body() body: CompleteBookingDto) {
    return this.bookingService.completeBooking(
      body.transactionRef, //paystack transaction ref
      body.bookingId,
    );
  }
}
