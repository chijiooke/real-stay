import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type ListingDocument = Listing & Document<Types.ObjectId>;

import { Schema as MongooseSchema } from 'mongoose';

@Schema({ timestamps: true }) // Automatically adds createdAt & updatedAt
export class Listing extends Document {
  @Prop({ required: true })
  place_holder_address: string;

  @Prop({ required: true })
  google_formatted_address: string;

  @Prop({ type: MongooseSchema.Types.ObjectId, required: true, ref: 'User' }) // Reference to User collection
  owner_id: Types.ObjectId;

  @Prop({ required: true })
  state: string;

  @Prop({ required: true })
  lga: string;

  @Prop({ required: true })
  lat: number;

  @Prop({ required: true })
  lng: number;

  @Prop({
    type: { type: String, enum: ['Point'], default: 'Point' },
    coordinates: { type: [Number], required: true },
  })
  location: { type: string; coordinates: number[] };

  @Prop({ required: true })
  type: string;

  @Prop()
  no_of_beds?: number;

  @Prop()
  are_pets_allowed?: boolean;

  @Prop()
  no_of_bedrooms?: number;

  @Prop()
  no_of_bathrooms?: number;

  @Prop()
  are_parties_allowed?: boolean;

  @Prop({ type: [String], default: [] })
  extra_offerings: string[];

  @Prop()
  title?: string;

  @Prop()
  description?: string;

  @Prop()
  cost?: number;

  @Prop()
  cost_cycle?: string;

  @Prop({ type: [String], required: true })
  photos: string[];

  @Prop({ default: 'active', enum: ['active', 'inactive'] }) // Set default & restrict values
  status: string;
}

export const ListingSchema = SchemaFactory.createForClass(Listing);
ListingSchema.index({ location: '2dsphere' }); // Ensure geospatial index

