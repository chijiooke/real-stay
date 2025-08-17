import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Post,
  Query,
  Request,
  UnauthorizedException,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from 'src/auth/jwtAuthGuard';
import { UserDocument } from 'src/users/schemas/user.schema';
import { KycService } from './kyc.service';
import { KYC } from './schemas/kyc.schema';
import { IDojahIdentityResponse } from './interfaces/kyc.types';

@Controller('kyc')
export class KYCController {
  constructor(private readonly kycService: KycService) {}

  @Post('verify')
  @UseGuards(JwtAuthGuard)
  async verify(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    @Request() authData: any,
    @Body() payload: KYC,
  ) {
    const authUser: UserDocument = authData.user;
    payload.user_id = authUser._id;

    //check if kyc already exixts with the same ID number (nin, bvn)
    const exists = await this.kycService.existsByIDNumber(
      payload.id_number,
      payload.id_type?.toLowerCase(),
    );

    //&& process.env.ENVIRONMENT != 'development'
    if (exists ) {
      throw new BadRequestException('user with ID number already exists');
    }

    //get identity data from Dojah
    const dojahResponse = await fetch(
      `${process.env.DOJAH_BASE_URL}/api/v1/kyc/${payload.id_type}?nin=${payload.id_number}`,
      {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          AppId: process.env.DOJAH_APP_ID || '',
          Authorization: process.env.DOJAH_PUB_KEY || '',
        },
      },
    );

    const response: IDojahIdentityResponse = await dojahResponse.json();

    //check if name matches

    // payload.identity_data = data;
    payload.provider = 'dojah';
    payload.identity_data = response.entity;

    //create KYC
    await this.kycService.createKYC(payload, authUser);

    return { message: 'kyc verification succesful' };
  }

  @Get('/admin')
  @UseGuards(JwtAuthGuard)
  async adminGet(
    @Query() filter: Record<string, string>,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    @Request() authData: any,
  ) {
    const authUser: UserDocument = authData.user;
    if (authUser.user_type != 'admin') {
      throw new UnauthorizedException('data un-authorized for non-admin users');
    }
    return this.kycService.findByFilter(filter);
  }

  @Get('')
  @UseGuards(JwtAuthGuard) // eslint-disable-next-line @typescript-eslint/no-explicit-any
  async get(@Request() authData: any) {
    const authUser: UserDocument = authData.user;

    return this.kycService.findByFilter({ user_id: authUser._id });
  }
}
