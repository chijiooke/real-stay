import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import mongoose, { Document, Types } from 'mongoose';
import { WalletStatusEnum } from '../interfaces/wallet.interfaces';

@Schema({ timestamps: true }) // Automatically adds createdAt & updatedAt
export class Wallet {
  @Prop({ type: mongoose.Schema.Types.ObjectId, ref: 'User', unique: true })
  customer_id?: Types.ObjectId;

  @Prop({ type: String, enum: WalletStatusEnum, required: true })
  status: WalletStatusEnum;

  @Prop({ type: Number, required: true })
  amount: number;

  @Prop({ required: true, default: 'NGN' })
  currency: string;

  @Prop({ default: 'false' })
  is_company_wallet: string; //'true' --- internal wallet for our commissions

  @Prop({ required: true, default: true })
  can_withdraw: boolean;

  @Prop({ required: true, default: true })
  can_deposit: boolean;
}

// The Document type = schema class + mongoose document properties
export type WalletDocument = Wallet & Document;

// The schema object used in your module
export const WalletSchema = SchemaFactory.createForClass(Wallet);
