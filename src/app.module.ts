import { Module } from '@nestjs/common';
import { AuthModule } from './auth/auth.module';
import { MongooseModule } from '@nestjs/mongoose';
import { UsersModule } from './users/users.module';
import { ListingModule } from './listing/listing.module';

@Module({
  imports: [
    MongooseModule.forRoot('mongodb://localhost:27017/real-stay'),
    AuthModule,
    UsersModule,
    ListingModule,
  ],
})
export class AppModule {}
