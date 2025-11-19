import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Post,
  Query,
  Request,
  UnauthorizedException,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { JwtAuthGuard } from '../auth/jwtAuthGuard';
import { UserDocument } from '../users/schemas/user.schema';
import { VerifyKycDto } from './dto/kyc.dto';
import { DojahService } from './kyc-providers/dojah';
import { KycService } from './kyc.service';
import { KYC } from './schemas/kyc.schema';
import { DojahKYCResponse } from './interfaces/kyc.types';

@Controller('kyc')
export class KYCController {
  constructor(
    private readonly kycService: KycService,
    private readonly dojahService: DojahService,
  ) {}

  @Post('verify')
  @UseGuards(JwtAuthGuard)
  @UseInterceptors(FileInterceptor('selfie_image'))
  async verify(
    @Request() req: { user: UserDocument },
    @Body() payload: VerifyKycDto,
    @UploadedFile() file: Express.Multer.File,
  ) {
    const authUser = req.user;

    // Convert image buffer to base64
    const isDevEnv = process.env.ENVIRONMENT !== 'production';
    if (!file) {
      throw new BadRequestException('Selfie image is required');
    }
    const selfieBase64 = file.buffer.toString('base64');

    // Ensure user doesn’t duplicate KYC
    const exists = await this.kycService.existsByIDNumber(
      payload.id_number,
      payload.id_type?.toLowerCase(),
    );

    if (exists && !isDevEnv) {
      throw new BadRequestException('User with ID number already exists');
    }

    // Call Dojah API
    const response: DojahKYCResponse = await this.dojahService.verifyNIN({
      nin: payload.id_number,
      selfieImage: selfieBase64,
    });

    if (response?.entity?.selfie_verification?.confidence_value < 0.7) { // threshold of 70%
      throw new BadRequestException(
        'Selfie verification failed. Please ensure the selfie image is clear and matches the ID provided.',
      );
    }

    // Save KYC record
    const data = await this.kycService.createKYC(
      {
        ...payload,
        user_id: authUser._id,
        provider: 'dojah',
        identity_data: response.entity,
        selfie_image: 'data:image/jpeg;base64,' + selfieBase64,
      } as KYC,
      authUser,
    );

    return { message: 'KYC verification successful', data };
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
