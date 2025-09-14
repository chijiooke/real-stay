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
import { JwtAuthGuard } from 'src/auth/jwtAuthGuard';
import { ListingService } from 'src/listing/listing.service';
import { ReviewService } from './reviews.service';
import { Review } from './schemas/reviews.schema';

@Controller('reviews')
export class ReviewsController {
  constructor(
    private readonly ratingService: ReviewService,
    private readonly listingService: ListingService,
  ) {}

  @Post('')
  @UseGuards(JwtAuthGuard)
  async create(
    @Body() payload: Review, // eslint-disable-next-line @typescript-eslint/no-explicit-any
    @Request() authData: any,
  ) {
    const listing = await this.listingService.getListing(
      payload.listing_id.toString(),
    );

    if (!listing) {
      throw new NotFoundException('Listing not found');
    }

    payload.reviewer_id = authData.user._id;
    payload.property_owner_id = listing.owner_id;
    return this.ratingService.createReview(payload);
  }

  @Get('')
  @UseGuards(JwtAuthGuard)
  async get(@Query() filter: Record<string, string>) {
    return this.ratingService.getReviews(filter);
  }

  @Get('/:id')
  @UseGuards(JwtAuthGuard)
  async getByListingId(@Param('id') reviewId: string) {
    return this.ratingService.getReview(reviewId);
  }
}
