import {
  Body,
  Controller,
  Get,
  NotFoundException,
  Param,
  Post,
  Query,
  Request,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwtAuthGuard';
import { ListingService } from '../listing/listing.service';
import { BookingService } from './bookings.service';
import { Booking } from './schemas/bookings.schema';

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
    return this.bookingService.createBooking(payload);
  }

  @Get('')
  @UseGuards(JwtAuthGuard)
  async get(@Query() filter: Record<string, string>) {
    return this.bookingService.getBookings(filter);
  }

  @Get('/:id')
  @UseGuards(JwtAuthGuard)
  async getByListingId(@Param('id') reviewId: string) {
    return this.bookingService.getgetBookingByID(reviewId);
  }
}
