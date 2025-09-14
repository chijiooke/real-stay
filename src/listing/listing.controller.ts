import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Request,
  UseGuards,
} from '@nestjs/common';
import { UserStatusEnum } from 'src/users/interfaces/user.types';
import { ListingService } from './listing.service';
import { Listing } from './schemas/listing.schema';
import { JwtAuthGuard } from 'src/features/auth/jwtAuthGuard';

@Controller('listing')
export class ListingController {
  constructor(private readonly listingService: ListingService) {}

  @Post('create')
  @UseGuards(JwtAuthGuard)
  create(
    @Body() payload: Listing,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    @Request() authData: any,
  ) {
    console.log({ payload });
    payload.owner_id = authData.user._id;
    payload.location = {
      type: 'Point',
      coordinates: [payload.lng, payload.lat],
    };
    return this.listingService.createListing(payload);
  }

  @Post('save/:listingId')
  @UseGuards(JwtAuthGuard)
  async save(@Param('listingId') listingId: string, @Request() req) {
    const userId = req.user._id;
    return this.listingService.saveListing(listingId, userId);
  }

  @Patch('unsave/:listingId')
  @UseGuards(JwtAuthGuard)
  async unsave(@Param('listingId') listingId: string, @Request() req) {
    const userId: string = req.user._id;
    return this.listingService.unsaveListing(listingId, userId);
  }

  @Patch('review/:listingId/:action')
  @UseGuards(JwtAuthGuard)
  async review(
    @Param('listingId') listingId: string,
    @Param('action') action: string,
  ) {
    if (!listingId || listingId == '' || listingId == ':listingId') {
      throw new BadRequestException('listing id is required');
    }

    const listing = await this.listingService.getListing(listingId);

    if (!listing) {
      throw new BadRequestException('invalid id');
    }

    switch (action?.toLowerCase()) {
      case 'activate':
        listing.status = UserStatusEnum.ACTIVE;
        break;

      case 'deactivate':
        listing.status = UserStatusEnum.INACTIVE;
        break;

      default:
        throw new BadRequestException('invalid action');
    }

    return this.listingService.updateById(listingId, listing);
  }

  @Get('saved_listings')
  @UseGuards(JwtAuthGuard)
  async getSaved(@Request() req, @Query() filter: Record<string, string>) {
    const userId: string = req.user._id;

    return this.listingService.getSavedListing(userId, filter);
  }

  @Get('')
  @UseGuards(JwtAuthGuard)
  async get(@Query() filter: Record<string, string>) {
    return this.listingService.getListings(filter);
  }

  @Get('/:listingId')
  @UseGuards(JwtAuthGuard)
  async getByListingId(@Request() req, @Param('listingId') listingId: string) {
    return this.listingService.getListing(listingId);
  }
}
