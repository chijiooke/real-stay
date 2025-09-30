import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Query,
  Request,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwtAuthGuard';
import { TransactionsService } from './transactions.service';

@Controller('transactions')
export class TransactionsController {
  constructor(private readonly transactionService: TransactionsService) {}

  @Post('init')
  @UseGuards(JwtAuthGuard)
  async init(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    @Request() authData: any,
    @Body() payload: { amount: number }, // eslint-disable-next-line @typescript-eslint/no-explicit-any
  ) {
    return this.transactionService.initPayment(
      payload.amount,
      authData.user?.email,
    );
  }

  @Get('')
  @UseGuards(JwtAuthGuard)
  async get(@Query() filter: Record<string, string>) {
    return this.transactionService.getTransactions(filter);
  }

  @Get('/:id')
  @UseGuards(JwtAuthGuard)
  async getByListingId(@Param('id') id: string) {
    return this.transactionService.getTransactionByID(id);
  }
}
