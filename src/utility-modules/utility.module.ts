// src/upload/utility.module.ts
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { MailgunModule } from '../features/notifications/mail/mailgun/mailgun.module';
import { UtilityService } from './utility.service';
import { UtilityController } from './utility.controller';

@Module({
  imports: [ConfigModule, MailgunModule],
  providers: [UtilityService],
  exports: [UtilityService],
  controllers:[UtilityController]
})
export class UtilityModule {}
