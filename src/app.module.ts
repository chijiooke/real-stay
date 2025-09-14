import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
// import { AuthModule } from './features/auth/auth.module';

import { AnalyticsModule } from './features/analytics/analytics.module';
import { AuthModule } from './features/auth/auth.module';
import { BookingModule } from './features/bookings/reviews.module';
import { ChatModule } from './features/chat/chat.module';
import { KycModule } from './features/kyc/kyc.module';
import { ListingModule } from './features/listing/listing.module';
import { ReviewModule } from './features/reviews/reviews.module';
import { UsersModule } from './features/users/users.module';
import { HealthModule } from './health/health.module';
import { UtilityModule } from './utility-modules/utility.module';
import { FirebaseModule } from './features/notifications/firebase.module';



@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    MongooseModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => {
        const uri =
          configService.get<string>('MONGO_URI') ||
          'mongodb://localhost:27017/';
        const dbName = configService.get<string>('DB_NAME') || 'real-stay';
        return {
          uri: uri + dbName,
        };
      },
      inject: [ConfigService],
    }),

    AuthModule,
    UsersModule,
    ListingModule,
    ReviewModule,
    ChatModule,
    UtilityModule,
    HealthModule,
    AnalyticsModule,
    KycModule,
    FirebaseModule,
    BookingModule,
  ],
})
export class AppModule {}
