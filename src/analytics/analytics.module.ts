import { Module, forwardRef } from '@nestjs/common';
import { ListingModule } from 'src/listing/listing.module';
import { AuthModule } from '../auth/auth.module';
import { AnalyticsController } from './analytics.controller';
import { AnalyticsService } from './analytics.service';
import { User, UserSchema } from 'src/users/schemas/user.schema';
import { Listing, ListingSchema } from 'src/listing/schemas/listing.schema';
import { MongooseModule } from '@nestjs/mongoose';
import { UsersModule } from 'src/features/users/users.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: User.name, schema: UserSchema },
      { name: Listing.name, schema: ListingSchema },
    ]),
    forwardRef(() => AuthModule),
    forwardRef(() => ListingModule),
    forwardRef(() => UsersModule),
  ],
  providers: [AnalyticsService],
  controllers: [AnalyticsController],
  exports: [AnalyticsService],
})
export class AnalyticsModule {}

