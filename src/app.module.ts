import { Module } from '@nestjs/common';
import { AuthModule } from './auth/auth.module';
import { MongooseModule } from '@nestjs/mongoose';
import { UsersModule } from './users/users.module';
import { ListingModule } from './listing/listing.module';
import { ChatModule } from './chat/chat.module';
import { UploadModule } from './utility-modules/utility.module';
import { ReviewModule } from './reviews/reviews.module';

const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/';
const DB_NAME = process.env.DB_NAME || 'real-stay';
@Module({
  imports: [
    MongooseModule.forRoot(MONGO_URI + DB_NAME),
    AuthModule,
    UsersModule,
    ListingModule,
    ReviewModule,
    ChatModule,
    UploadModule,
    
  ],
})
export class AppModule {}
