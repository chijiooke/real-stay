import { forwardRef, Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { RedisService } from 'src/redis/redis';
import { MailgunService } from '../notifications/mail/mailgun/mailgun.service';
import { PaystackService } from '../transactions/payment-providers/paystack';
import { UsersModule } from '../users/users.module';
import { WalletModule } from '../wallets/wallet.module';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { JwtStrategy } from './jwt.strategy';

@Module({
  imports: [
    UsersModule,
    PassportModule,
     forwardRef(() => WalletModule),
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: async (configService: ConfigService) => ({
        secret: configService.get<string>('JWT_SECRET'),
        signOptions: { expiresIn: '1h' },
      }),
    }),
  ],
  controllers: [AuthController],
  providers: [AuthService, JwtStrategy, RedisService, MailgunService, PaystackService],
  exports: [AuthService],
})
export class AuthModule {}
