import { Controller, Get, Request, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwtAuthGuard';
import { UserDocument } from '../users/schemas/user.schema';
import { WalletService } from './wallet.service';

@Controller('wallets')
export class WalletsController {
  constructor(private readonly walletService: WalletService) {}

  @Get('my-wallet')
  @UseGuards(JwtAuthGuard)
  async get(@Request() { user }: { user: UserDocument }) {
    return this.walletService.getWalletByCustomerID(user.id);
  }
}
