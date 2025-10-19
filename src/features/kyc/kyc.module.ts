import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { WalletModule } from '../wallets/wallet.module';
import { WalletService } from '../wallets/wallet.service';
import { DojahService } from './kyc-providers/dojah';
import { KYCController } from './kyc.controller';
import { KycService } from './kyc.service';
import { KYC, KYCSchema } from './schemas/kyc.schema';

@Module({
  imports: [
    WalletModule,
    MongooseModule.forFeature([{ name: KYC.name, schema: KYCSchema }]),
  ],
  providers: [KycService, DojahService, WalletService],
  controllers: [KYCController],
  exports: [KycService],
})
export class KycModule {}
