import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export class UserMeta {
  @Prop({ required: true })
  first_name: string;

  @Prop({ required: true })
  last_name: string;

  @Prop({ type: String, default: null })
  image_url: string | undefined;
}

export type MessageDocument = Message & Document;

@Schema({ _id: false })
class RecipientMetadata {
  @Prop()
  recipient_name?: string;

  @Prop()
  recipient_email?: string;

  @Prop()
  recipient_phone?: string;

  @Prop()
  image_url?: string;
}

export const RecipientMetadataSchema =
  SchemaFactory.createForClass(RecipientMetadata);

@Schema()
export class Message extends Document {
  @Prop({ required: true })
  senderId: string;

  @Prop({ required: true })
  receiverId: string;

  @Prop({ required: true })
  conversationId: string;

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

  @Prop({ type: RecipientMetadataSchema })
  recipientMetadata?: RecipientMetadata;
}

export const MessageSchema = SchemaFactory.createForClass(Message);
