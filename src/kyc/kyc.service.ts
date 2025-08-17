import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { FilterQuery, Model, Types } from 'mongoose';
import { UserDocument } from 'src/users/schemas/user.schema';
import { KYC, KYCDocument } from './schemas/kyc.schema';
import { getAge } from 'src/utils/helpers';

@Injectable()
export class KycService {
  constructor(
    @InjectModel(KYC.name) private readonly kycmodel: Model<KYCDocument>,
  ) {}

  async createKYC(payload: KYC, user: UserDocument): Promise<KYCDocument> {

    //validate name
    if (
      payload?.identity_data.first_name?.toLowerCase() !== user?.first_name?.toLowerCase() ||
      payload?.identity_data?.last_name?.toLowerCase() !== user?.last_name?.toLowerCase()
    ) {
      throw new BadRequestException(
        `names do not match with names on your ${payload.id_type.replaceAll('_', ' ')} record`,
      );
    }

    //validate age
    if (getAge(payload.identity_data.date_of_birth) < 18) {
      throw new BadRequestException(
        'kyc verified, however users under 18 are not permitted to proceed, kindly contact support for further assistance',
      );
    }

    return await this.kycmodel.create(payload);
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
