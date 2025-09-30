import {
  Injectable,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';
import { PaystackInitPaymentResponse } from '../interfaces/paystack.interface';

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
            Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}`,
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

  async initPayment(email: string, amount: number): Promise<PaystackInitPaymentResponse> {

    console.log('Initializing Paystack payment for:', process.env.PAYSTACK_SECRET_KEY)
    try {
      const response = await fetch(
        `${process.env.PAYSTACK_BASE_URL}/transaction/initialize`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}`,
          },
          body: JSON.stringify({
            email,
            amount, // Paystack expects amount in kobo
          }),
        },
      );
  
      const data = await response.json();
  
      if (!response.ok) {
        throw new Error(
          `Paystack API error: ${data?.message || response.statusText}`,
        );
      }
  
      return data; // contains { status, message, data: { authorization_url, access_code, reference } }
    } catch (err) {
      Logger.error('Paystack init payment error:', err);
      throw new InternalServerErrorException(
        'Failed to initialize payment with Paystack',
      );
    }
  }
  
}
