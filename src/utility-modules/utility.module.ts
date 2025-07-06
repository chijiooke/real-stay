// src/upload/upload.module.ts
import { Module } from '@nestjs/common';
import { UtilityController } from './utility.controller';
import { UtilityService } from './utility.service';
import { MailService } from 'src/utility-services/mail.service';

@Module({
  controllers: [UtilityController],
  providers: [UtilityService, MailService],
  exports: [UtilityService, MailService],
})
export class UtilityModule {}
