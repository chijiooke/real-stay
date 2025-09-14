import { Module } from '@nestjs/common';
import { AuthService } from './auth.service';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { JwtStrategy } from './jwt.strategy';
import { RedisService } from 'src/utility-services/redis';
import { MailService } from 'src/utility-services/mail.service';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { AuthController } from 'src/features/auth/auth.controller';
import { UsersModule } from 'src/features/users/users.module';

@Module({
  imports: [
    UsersModule,
    PassportModule,
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
  providers: [AuthService, JwtStrategy, RedisService, MailService],
  exports: [AuthService],
})
export class AuthModule {}
