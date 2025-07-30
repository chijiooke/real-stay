import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';

import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { ListingModule } from './listing/listing.module';
import { ChatModule } from './chat/chat.module';
import { UtilityModule } from './utility-modules/utility.module';
import { ReviewModule } from './reviews/reviews.module';
import { HealthModule } from './health/health.module';
import { AnalyticsModule } from './analytics/analytics.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    MongooseModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => {
        const uri = configService.get<string>('MONGO_URI') || 'mongodb://localhost:27017/';
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
  ],
})
export class AppModule {}
