import { forwardRef, Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { WalletModule } from '../wallets/wallet.module';
import { PaystackService } from './payment-providers/paystack';
import { Transaction, TransactionSchema } from './schemas/transaction.schema';
import { TransactionsController } from './transactions.controller';
import { TransactionsService } from './transactions.service';
import { AuthModule } from '../auth/auth.module';
import { ListingModule } from '../listing/listing.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Transaction.name, schema: TransactionSchema },
    ]),

    forwardRef(() => AuthModule),
    forwardRef(() => ListingModule),
    forwardRef(() => WalletModule),
  ],
  providers: [TransactionsService, PaystackService],
  controllers: [TransactionsController],
  exports: [TransactionsService],
})
export class TransactionModule {}
