import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type BookingDocument = Booking & Document<Types.ObjectId>;

import { Schema as MongooseSchema } from 'mongoose';

@Schema({ timestamps: true }) // Automatically adds createdAt & updatedAt
export class Booking extends Document {
  @Prop({ type: MongooseSchema.Types.ObjectId, required: true, ref: 'User' }) // Reference to User collection
  customer_id: Types.ObjectId;

  @Prop({ type: MongooseSchema.Types.ObjectId, required: true, ref: 'User' }) // Reference to User collection
  property_owner_id: Types.ObjectId;

  @Prop({ type: MongooseSchema.Types.ObjectId, required: true, ref: 'Listing' }) // Reference to User collection
  listing_id: Types.ObjectId;

  @Prop({ required: true })
  start_date: string;

  @Prop({ required: true })
  end_date: string;

  @Prop({ required: true })
  status: string; //pending, accepted, paid, payment

  @Prop()
  paymentRef?: string;
}

export const BookingSchema = SchemaFactory.createForClass(Booking);
