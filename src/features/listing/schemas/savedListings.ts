import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type SavedListingDocument = SavedListing & Document<Types.ObjectId>;

@Schema({ timestamps: true }) // Auto-add createdAt & updatedAt fields
export class SavedListing {
  @Prop({ required: true })
  user_id: string; // user_id refers to the user saving the listings

  @Prop({ required: true, type: [String] })
  saved_listings: string[]; // Array of listing IDs saved by the user
}

export const SavedListingSchema = SchemaFactory.createForClass(SavedListing);
