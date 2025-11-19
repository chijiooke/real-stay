import { forwardRef, Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { WalletModule } from '../wallets/wallet.module';
import { WalletService } from '../wallets/wallet.service';
import { DojahService } from './kyc-providers/dojah';
import { KYCController } from './kyc.controller';
import { KycService } from './kyc.service';
import { KYC, KYCSchema } from './schemas/kyc.schema';
import { PaystackService } from '../transactions/payment-providers/paystack';
import { TransactionModule } from '../transactions/transactions.module';

@Module({
  imports: [
    WalletModule,
    MongooseModule.forFeature([{ name: KYC.name, schema: KYCSchema }]),
    forwardRef(() => TransactionModule),
  ],
  providers: [KycService, DojahService, WalletService, PaystackService],
  controllers: [KYCController],
  exports: [KycService],
})
export class KycModule {}
