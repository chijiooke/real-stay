import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { FilterQuery, Model, Types } from 'mongoose';
import { getAge } from 'src/utils/helpers';
import { UserDocument } from '../users/schemas/user.schema';
import { WalletService } from '../wallets/wallet.service';
import { KYC, KYCDocument } from './schemas/kyc.schema';

@Injectable()
export class KycService {
  constructor(
    @InjectModel(KYC.name) private readonly kycmodel: Model<KYCDocument>,
    private readonly walletService: WalletService,
  ) {}

  async createKYC(payload: KYC, user: UserDocument): Promise<KYCDocument> {
    const isDevEnv = process.env.ENVIRONMENT !== 'production';

    // 1. Validate name (in production only)
    if (!isDevEnv) {
      const firstNameMatch =
        payload.identity_data.first_name?.toLowerCase() ===
        user.first_name?.toLowerCase();
      const lastNameMatch =
        payload.identity_data.last_name?.toLowerCase() ===
        user.last_name?.toLowerCase();

      if (!firstNameMatch || !lastNameMatch) {
        throw new BadRequestException(
          `Names do not match with your ${payload.id_type.replaceAll('_', ' ')} record.`,
        );
      }
    }

    // 2. Validate age
    if (getAge(payload.identity_data.date_of_birth) < 18) {
      throw new BadRequestException(
        'KYC verified, however users under 18 are not permitted to proceed. Kindly contact support for further assistance.',
      );
    }

    // 3. Create KYC record
    const kycRecord = await this.kycmodel.create(payload);

    // 4. Activate user's wallet (idempotent + safe)
    await this.walletService.activateUserWallet(user._id);

    return kycRecord;
  }

  async findById(id: string): Promise<KYCDocument | null> {
    return await this.kycmodel
      .findOne({ _id: new Types.ObjectId(id) })
      .lean()
      .exec();
  }

  async findByFilter(
    filter: FilterQuery<KYCDocument>,
  ): Promise<Partial<KYCDocument> | null> {
    return this.kycmodel.findOne(filter).lean().exec();
  }

  async updateById(
    id: string,
    payload: Partial<KYC>,
  ): Promise<KYCDocument | null> {
    return this.kycmodel
      .findByIdAndUpdate(new Types.ObjectId(id), payload, { new: true })
      .exec();
  }

  async updateByFilter(
    filter: FilterQuery<KYC>, // Accepts any filter object
    payload: Partial<KYC>,
  ): Promise<KYCDocument | null> {
    return this.kycmodel
      .findOneAndUpdate(filter, payload, { new: true })
      .exec();
  }

  async existsByIDNumber(id_number: string, id_type: string): Promise<boolean> {
    return !!(await this.kycmodel.exists({ id_number, id_type }));
  }
}
