import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type TransactionDocument = Transaction & Document<Types.ObjectId>;

import { Schema as MongooseSchema } from 'mongoose';
import { TransactionStatusEnum } from '../interfaces/transactions.interfaces';

@Schema({ timestamps: true }) // Automatically adds createdAt & updatedAt
export class Transaction extends Document {
  @Prop({ type: MongooseSchema.Types.ObjectId, required: false, ref: 'User' })
  customer_id: Types.ObjectId;

  @Prop({ type: String, enum: TransactionStatusEnum, required: true })
  status: TransactionStatusEnum;

  @Prop()
  reference: string;

  @Prop()
  provider: string;
}

export const TransactionSchema = SchemaFactory.createForClass(Transaction);
