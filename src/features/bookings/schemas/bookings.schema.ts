import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type BookingDocument = Booking & Document<Types.ObjectId>;

import { Schema as MongooseSchema } from 'mongoose';
import { BookingStatusEnum } from '../interfaces/bookings.interfaces';

@Schema({ timestamps: true }) // Automatically adds createdAt & updatedAt
export class Booking extends Document {
  @Prop({ type: MongooseSchema.Types.ObjectId, required: true, ref: 'User' })
  customer_id: Types.ObjectId;

  @Prop({ type: MongooseSchema.Types.ObjectId, required: true, ref: 'User' })
  property_owner_id: Types.ObjectId;

  @Prop({ type: MongooseSchema.Types.ObjectId, required: true, ref: 'Listing' })
  listing_id: Types.ObjectId;

  @Prop({ type: Date, required: true })
  start_date: Date;

  @Prop({ type: Date, required: true })
  end_date: Date;

  @Prop({ type: String, enum: BookingStatusEnum, required: true })
  status: BookingStatusEnum;

  @Prop()
  paymentRef: string;
}

export const BookingSchema = SchemaFactory.createForClass(Booking);
