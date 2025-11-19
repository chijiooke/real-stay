import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { InjectConnection } from '@nestjs/mongoose';
import { Connection } from 'mongoose';
import { RedisService } from 'src/redis/redis';
import { PaystackWebhookDTO } from '../transactions/dto/transactions.dto';
import { PaystackEventQueue } from '../transactions/interfaces/paystack.interface';
import { TransactionStatusEnum } from '../transactions/interfaces/transactions.interfaces';
import { TransactionsService } from '../transactions/transactions.service';
import { BookingService } from '../bookings/bookings.service';

@Injectable()
export class PaystackProcessor implements OnModuleInit {
  private readonly logger = new Logger(PaystackProcessor.name);

  constructor(
    private readonly redisService: RedisService,
    private readonly transactionService: TransactionsService,
    private readonly bookingservice: BookingService,

    @InjectConnection() private readonly connection: Connection,
  ) {}

  async onModuleInit() {
    this.logger.log('Paystack processor started...');
    const client = this.redisService.getClient();

    // Run both loops concurrently
    this.processQueue<PaystackWebhookDTO>(
      client,
      PaystackEventQueue.OUTFLOW,
      (payload) => this.transactionService.handlePaystackWebhook(payload),
    );

    // inside PaystackProcessor (or a similar worker)
    this.processQueue<string>(
      client,
      PaystackEventQueue.INFLOW,
      async (reference) => {
        // Find the transaction by reference
        const transaction = await this.transactionService.getTransaction({
          reference,
        });
        if (!transaction) {
          this.logger.warn(`Transaction not found for reference ${reference}`);
          return;
        }

        // If the transaction is not ongoing, skip
        if (transaction.status !== TransactionStatusEnum.ONGOING) {
          this.logger.log(
            `Transaction ${reference} is already of status [${transaction.status}]`,
          );
          return;
        }

        //verify transaction via paystack to get current status and update or queue accordingly
        await this.bookingservice.processPolledTransaction(transaction)
      },
    );
  }

  /**
   * Generic queue processor that listens indefinitely to a Redis list
   * and calls a handler for each parsed event payload.
   */
  private async processQueue<T>(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    client: any,
    queue: string,
    handler: (payload: T) => Promise<void>,
  ): Promise<void> {
    this.logger.log(`Listening on queue: ${queue}`);
    while (true) {
      try {
        const data = await client.brpop(queue, 0);
        if (!data) continue;

        const payload: T = JSON.parse(data[1]);
        this.logger.log(
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          `Processing ${queue} event: ${(payload as any)?.event}`,
        );
        await handler(payload);
      } catch (error) {
        this.logger.error(`Error processing ${queue}:`, error);
        await this.delay(1000); // Avoid tight retry loop
      }
    }
  }

  private delay(ms: number) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
