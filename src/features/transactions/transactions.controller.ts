import {
  Controller,
  Get,
  Param,
  Query,
  UseGuards
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwtAuthGuard';
import { TransactionsService } from './transactions.service';

@Controller('transactions')
export class TransactionsController {
  constructor(
    private readonly transactionService: TransactionsService,
  ) {}

  // @Post('verify')
  // @UseGuards(JwtAuthGuard)
  // async create(
  //   @Body() payload: Transaction, // eslint-disable-next-line @typescript-eslint/no-explicit-any
  // ) {
  //   paystackservice.verifyTransaction(payload.reference);
  //   return this.transactionService.createTransaction(payload);
  // }

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
