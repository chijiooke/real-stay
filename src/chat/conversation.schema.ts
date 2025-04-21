import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';
import { UserMeta } from './message.schema'; // Assuming it's in the same folder

@Schema()
export class Conversation extends Document {
  @Prop({ required: true })
  senderId: string;

  @Prop({ required: true })
  receiverId: string;

  @Prop({ required: true })
  sender: UserMeta;

  @Prop({ required: true })
  receiver: UserMeta;

}

// Ensure that the combination of senderId and receiverId is unique

export const ConversationSchema = SchemaFactory.createForClass(Conversation);

ConversationSchema.index({ senderId: 1, receiverId: 1 }, { unique: true });