import {
  Controller,
  Get,
  Request,
  UnauthorizedException,
  UseGuards
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwtAuthGuard';
import { UserDocument } from '../users/schemas/user.schema';
import { WalletService } from './wallet.service';

@Controller('wallets')
export class WalletsController {
  constructor(private readonly walletService: WalletService) {}

  @Get('my-wallet')
  @UseGuards(JwtAuthGuard)
  async getMyWallet(@Request() { user }: { user: UserDocument }) {
    return this.walletService.getWalletByCustomerID(user._id.toHexString());
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
