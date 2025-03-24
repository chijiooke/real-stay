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
import { ListingService } from './listing.service';
import { Listing } from './schemas/listing.schema';
import { JwtAuthGuard } from 'src/auth/jwtAuthGuard';

@Controller('listing')
export class ListingController {
  constructor(private readonly listingService: ListingService) {}

  @Post('create')
  create(@Body() payload: Listing) {
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

  @Get('saved_listings')
  @UseGuards(JwtAuthGuard)
  async getSaved(
    @Request() req,
    @Query('filter') filter: string,
    @Query('search') search: string,
  ) {
    const userId: string = req.user._id;

    // Parse the filter from the query string if necessary
    let parsedFilter;
    try {
      parsedFilter = filter ? JSON.parse(filter) : {};
    } catch (error) {
      console.log(error);
      throw new BadRequestException('Invalid filter format');
    }

    return this.listingService.getSavedListing(userId, parsedFilter, search);
  }
}
