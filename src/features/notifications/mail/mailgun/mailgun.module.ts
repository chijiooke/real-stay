import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { MailgunService } from './mailgun.service';

@Module({
  imports: [ConfigModule],
  providers: [MailgunService],
  exports: [MailgunService], 
})
export class MailgunModule {}
