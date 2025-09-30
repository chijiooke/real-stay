import {
  Injectable,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';

@Injectable()
export class PaystackService {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  async verifyTransaction(reference: string): Promise<any> {
    try {
      const response = await fetch(
        `${process.env.PAYSTACK_BASE_URL}/transaction/verify/${reference}`,
        {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            Authorization: process.env.PAYSTACK_SECRET_KEY || '',
          },
        },
      );

      if (!response.ok) {
        throw new Error(`Paystack API error: ${response.statusText}`);
      }

      return await response.json();
    } catch (err) {
      Logger.error('Paystack transaction verification error:', err);
      throw new InternalServerErrorException(
        'Failed to verify transaction with Paystack',
      );
    }
  }
}
