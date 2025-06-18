import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import * as bcrypt from 'bcryptjs';

export type UserDocument = User & Document<Types.ObjectId>;

@Schema({ timestamps: true }) // Auto-add createdAt & updatedAt fields
export class User {
  @Prop({ required: true, unique: true, trim: true })
  email: string;

  @Prop({ required: true, minlength: 6 })
  password: string;

  @Prop({ required: true, trim: true })
  first_name: string;

  @Prop({ required: true, trim: true })
  last_name: string;

  @Prop({ required: true, unique: true, trim: true })
  phone_number: string;

  @Prop({ default: null }) // Allow null but don't enforce requirement
  image_url?: string;

  @Prop({ default: null }) // Allow null but don't enforce requirement
  gender?: string;

  @Prop({ default: null }) // Allow null but don't enforce requirement
  apple_id?: string;

  @Prop({ default: 'guest', enum: ['host', 'guest', 'admin'] }) // Set default & restrict values
  user_type?: string;

  @Prop({ default: 'active', enum: ['active', 'inactive'] }) // Set default & restrict values
  status?: string;
}

export const UserSchema = SchemaFactory.createForClass(User);

// 🔐 Pre-save hook to hash password before saving
UserSchema.pre<UserDocument>('save', async function (next) {
  if (!this.isModified('password')) return next();

  try {
    this.password = await bcrypt.hash(this.password, 10);
    next();
  } catch (error) {
    next(error);
  }
});
