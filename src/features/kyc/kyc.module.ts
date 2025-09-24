import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { KYCController } from './kyc.controller';
import { KycService } from './kyc.service';
import { KYC, KYCSchema } from './schemas/kyc.schema';
import { DojahService } from './kyc-providers/dojah';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: KYC.name, schema: KYCSchema }]), // ✅ Register User schema
  ],
  providers: [KycService, DojahService],
  controllers: [KYCController],
  exports: [KycService],
})
export class KycModule {}
