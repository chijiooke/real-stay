import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type ReviewDocument = Review & Document<Types.ObjectId>;

import { Schema as MongooseSchema } from 'mongoose';

@Schema({ timestamps: true }) // Automatically adds createdAt & updatedAt
export class Review extends Document {
  @Prop({ type: MongooseSchema.Types.ObjectId, required: true, ref: 'User' }) // Reference to User collection
  reviewer_id: Types.ObjectId;

  @Prop({ type: MongooseSchema.Types.ObjectId, required: true, ref: 'User' }) // Reference to User collection
  property_owner_id: Types.ObjectId;

  @Prop({ type: MongooseSchema.Types.ObjectId, required: true, ref: 'Listing' }) // Reference to User collection
  listing_id: Types.ObjectId;

  @Prop()
  comment: string;

  @Prop()
  rating_score: number;

  @Prop()
  used_property: boolean;

  @Prop()
  start_date?: string;

  @Prop()
  end_date?: string;
}

export const ReviewSchema = SchemaFactory.createForClass(Review);
