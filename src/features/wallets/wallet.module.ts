import { forwardRef, Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { User, UserSchema } from '../users/schemas/user.schema';
import { UsersModule } from '../users/users.module';
import { Wallet, WalletSchema } from './schemas/wallet.schema';
import { WalletsController } from './wallet.controller';
import { WalletService } from './wallet.service';
import { PaystackService } from '../transactions/payment-providers/paystack';
import { TransactionModule } from '../transactions/transactions.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Wallet.name, schema: WalletSchema },
      { name: User.name, schema: UserSchema },
    ]),
    forwardRef(() => UsersModule),
    forwardRef(() => TransactionModule)
  ],
  providers: [WalletService, PaystackService],
  controllers: [WalletsController],
  exports: [WalletService, MongooseModule],
})
export class WalletModule {}
