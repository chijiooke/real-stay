import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { AuthModule } from '../auth/auth.module'; // Assuming AuthModule contains AuthService
import { ListingModule } from '../listing/listing.module';
import { Transaction, TransactionSchema } from './schemas/transaction.schema';
import { TransactionsController } from './transactions.controller';
import { TransactionsService } from './transactions.service';
import { PaystackService } from './payment-providers/paystack';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Transaction.name, schema: TransactionSchema },
    ]),
    AuthModule,
    ListingModule,
  ],
  providers: [TransactionsService, PaystackService],
  controllers: [TransactionsController],
  exports: [TransactionsService],
})
export class TransactionModule {}
