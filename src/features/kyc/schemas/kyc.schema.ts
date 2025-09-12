import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import { Identity } from '../interfaces/kyc.types';

export type KYCDocument = KYC & Document<Types.ObjectId>;
import { Schema as MongooseSchema } from 'mongoose';

@Schema({ timestamps: true }) // Auto-add createdAt & updatedAt fields
export class KYC extends Document {
  @Prop({ type: MongooseSchema.Types.ObjectId, required: true })
  user_id: Types.ObjectId;

  @Prop({ required: true })
  id_type: string; //nin,bvn

  @Prop({ required: true })
  id_number: string;

  @Prop({ required: true })
  provider: string;

  @Prop({ required: true })
  selfie_image: string;

  @Prop({ type: Object, required: true })
  identity_data: Identity;
}

export const KYCSchema = SchemaFactory.createForClass(KYC);
