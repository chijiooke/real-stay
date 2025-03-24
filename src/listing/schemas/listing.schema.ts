import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type ListingDocument = Listing & Document<Types.ObjectId>;

@Schema({ timestamps: true }) // Auto-add createdAt & updatedAt fields
export class Listing {
  @Prop({ required: true })
  place_holder_address: string;

  @Prop({ required: true })
  google_formatted_address: string;

  @Prop({ required: true })
  state: string;

  @Prop({ required: true })
  lga: string;

  @Prop({ required: true })
  lat: number;

  @Prop({ required: true })
  lng: number;

  @Prop({ required: true })
  type: string;

  @Prop({ default: null })
  no_of_beds: number;

  @Prop({ default: null })
  are_pets_allowed: boolean;

  @Prop({ default: null })
  no_of_bedrooms: number;

  @Prop({ default: null })
  no_of_bathrooms: number;

  @Prop({ default: null })
  are_parties_allowed: boolean;

  @Prop({ default: null })
  extra_offerings: string[];

  @Prop({ default: null })
  title: string;

  @Prop({ default: null })
  description: string;

  @Prop({ default: null })
  cost: number;

  @Prop({ default: null })
  cost_cycle: string;

  @Prop({ required: true })
  photos: string[];
}

export const ListingSchema = SchemaFactory.createForClass(Listing);
