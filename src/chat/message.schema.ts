import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

@Schema()
export class Message extends Document {
  @Prop({ required: true })
  senderId: string;

  @Prop({ required: true })
  receiverId: string;

  @Prop()
  content?: string;

  @Prop()
  fileUrl?: string;

  @Prop()
  fileType?: string;

  @Prop({ default: false })
  read: boolean;

  @Prop()
  readAt?: Date;

  @Prop({ default: Date.now })
  timestamp: Date;
}

export const MessageSchema = SchemaFactory.createForClass(Message);

