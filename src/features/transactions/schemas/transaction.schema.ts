import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Schema as MongooseSchema, Types } from 'mongoose';
import {
  PAYMENT_PROVIDER,
  TransactionStatusEnum,
  TransactionTypeEnum,
} from '../interfaces/transactions.interfaces';

@Schema({ timestamps: true })
export class Transaction {
  // Links (optional depending on transaction type)
  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'User', required: false })
  customer_id?: Types.ObjectId;

  @Prop({
    type: MongooseSchema.Types.ObjectId,
    ref: 'Booking',
    required: false,
  })
  booking_id?: Types.ObjectId;

  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'Wallet', required: false })
  wallet_id?: Types.ObjectId;

  // Accounting Relationships
  @Prop({
    type: MongooseSchema.Types.ObjectId,
    ref: 'Transaction',
    required: false,
  })
  parent_transaction?: Types.ObjectId; // Links split transactions back to the main one

  // Transaction details
  @Prop({ type: String, enum: TransactionTypeEnum, required: true })
  type: TransactionTypeEnum; // e.g. 'PAYMENT', 'CREDIT', 'DEBIT', 'REFUND'

  @Prop({ type: String, enum: TransactionStatusEnum, required: true })
  status: TransactionStatusEnum; // e.g. 'PENDING', 'SUCCESS', 'FAILED'

  @Prop({ type: Number, required: true })
  amount: number;

  @Prop({ type: String, required: true })
  currency: string;

  @Prop({ type: String, required: true })
  reference: string; // Paystack or internal reference

  @Prop({ type: String, enum: PAYMENT_PROVIDER, required: true })
  provider: PAYMENT_PROVIDER; // e.g. PAYSTACK, WALLET, INTERNAL

  @Prop({ type: String, required: false })
  description?: string; // e.g. "Company share for booking XYZ"

  // Audit Metadata
  @Prop({ type: Object, required: false })
  meta?: Record<string, unknown>; // gateway response, channel, IP, etc.
}

// The Document type = schema class + mongoose document properties
export type TransactionDocument = Transaction & Document;

// The schema object used in your module
export const TransactionSchema = SchemaFactory.createForClass(Transaction);
