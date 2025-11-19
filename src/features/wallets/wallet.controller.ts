import {
  Body,
  Controller,
  Get,
  Patch,
  Post,
  Request,
  UnauthorizedException,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwtAuthGuard';
import { UserDocument } from '../users/schemas/user.schema';
import { WalletService } from './wallet.service';
import { CreateRecipientDto, WithdrawalDto } from './dto/wallet.dto';

@Controller('wallets')
export class WalletsController {
  constructor(private readonly walletService: WalletService) {}

  @Get('my-wallet')
  @UseGuards(JwtAuthGuard)
  async getMyWallet(@Request() { user }: { user: UserDocument }) {
    return this.walletService.getWalletByCustomerID(user._id.toHexString());
  }

  @Patch('add-withdrawal-details')
  @UseGuards(JwtAuthGuard)
  async addWithdrawalAccount(
    @Request() { user }: { user: UserDocument },
    @Body() payload: CreateRecipientDto,
  ) {
    payload = {
      ...payload,
      currency: 'NGN',
      type: 'nuban',
      userid: user._id.toHexString(),
    };
    return this.walletService.addWithdrawalAccount(payload);
  }

  @Post('withdraw')
  @UseGuards(JwtAuthGuard)
  async makeWithdrawal(
    @Request() { user }: { user: UserDocument },
    @Body() payload: WithdrawalDto,
  ) {
    payload.user_id = user._id.toHexString();
    return this.walletService.withdraw(payload);
  }

  @Get('company-wallet')
  @UseGuards(JwtAuthGuard)
  async getCompanyWallet(@Request() { user }: { user: UserDocument }) {
    if (user?.user_type != 'admin') {
      throw new UnauthorizedException('user must be admin to access');
    }

    const wal = await this.walletService.getCompanyWallet();
    return wal?.toObject();
  }
}
