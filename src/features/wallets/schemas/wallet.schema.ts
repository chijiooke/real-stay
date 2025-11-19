import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import mongoose, { Document, Types } from 'mongoose';
import {
  WalletStatusEnum,
  WithdrawalDetails,
} from '../interfaces/wallet.interfaces';

@Schema({ _id: false }) // No separate _id for subdocument
export class WithdrawalDetailsProps {
  @Prop() account_name: string;
  @Prop() account_no: string;
  @Prop() bank_code: string;
  @Prop() bank_name: string;
  @Prop() recipient_code: string;
}

@Schema({ timestamps: true }) // Automatically adds createdAt & updatedAt
export class Wallet {
  @Prop({ type: mongoose.Schema.Types.ObjectId, ref: 'User', unique: true })
  customer_id?: Types.ObjectId;

  @Prop({ type: String, enum: WalletStatusEnum, required: true })
  status: WalletStatusEnum;

  @Prop({ type: Number, required: true })
  balance: number;

  @Prop({ required: true, default: 'NGN' })
  currency: string;

  @Prop({ default: 'false' })
  is_company_wallet: string; //'true' --- internal wallet for our commissions

  @Prop({ required: true, default: true })
  can_withdraw: boolean;

  @Prop({ required: true, default: false })
  is_withdrawal_account_set: boolean;

  @Prop({ required: true, default: true })
  can_deposit: boolean;

  @Prop()
  virtual_account_no: string;

  @Prop({
    type: WithdrawalDetailsProps,
    default: {},
  })
  withdrawal_details?: WithdrawalDetails;
}

// The Document type = schema class + mongoose document properties
export type WalletDocument = Wallet & Document;

// The schema object used in your module
export const WalletSchema = SchemaFactory.createForClass(Wallet);
