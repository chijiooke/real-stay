import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import { Schema as MongooseSchema } from 'mongoose';
import { TransactionStatusEnum } from '../interfaces/transactions.interfaces';

@Schema({ timestamps: true }) // Automatically adds createdAt & updatedAt
export class Transaction {
  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'User', required: false })
  customer_id?: Types.ObjectId;

  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'Booking', required: false })
  booking_id?: Types.ObjectId;

  @Prop({ type: String, enum: TransactionStatusEnum, required: true })
  status: TransactionStatusEnum;

  @Prop({ type: Number, required: true })
  amount: number;

  @Prop({ required: true })
  reference: string;

  @Prop({ required: true })
  provider: string;

  @Prop({ required: true })
  currency: string;
}

// The Document type = schema class + mongoose document properties
export type TransactionDocument = Transaction & Document;

// The schema object used in your module
export const TransactionSchema = SchemaFactory.createForClass(Transaction);
