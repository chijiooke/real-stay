import {
  Injectable,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';
import {
  CreateTransferDto,
  PaystackCreateRecipientResponse,
  PaystackCreateTransferResponse,
  PaystackDisableOtpFinalizeResponse,
  PaystackDisableOtpResponse,
  PaystackInitPaymentResponse,
} from '../interfaces/paystack.interface';

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

  async initPayment(
    email: string,
    amount: number,
  ): Promise<PaystackInitPaymentResponse> {
    console.log(
      'Initializing Paystack payment for:',
      process.env.PAYSTACK_SECRET_KEY,
    );
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

  async createRecipient(payload: {
    type: string;
    name: string;
    account_number: string;
    bank_code: string;
    currency: string;
  }): Promise<PaystackCreateRecipientResponse> {

    console.log({payload})
    try {
      const response = await fetch(
        `${process.env.PAYSTACK_BASE_URL}/transferrecipient`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}`,
          },
          body: JSON.stringify(payload),
        },
      );

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(
          `Paystack API error: ${response.statusText} - ${errorText}`,
        );
      }

      return await response.json();
    } catch (err) {
      Logger.error('Paystack recipient creation error:', err);
      throw new InternalServerErrorException(
        'Failed to create Paystack transfer recipient',
      );
    }
  }

  async initiateTransfer(
    payload: CreateTransferDto,
  ): Promise<PaystackCreateTransferResponse> {
    try {
      const response = await fetch(
        `${process.env.PAYSTACK_BASE_URL}/transfer`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}`,
          },
          body: JSON.stringify(payload),
        },
      );

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(
          `Paystack API error: ${response.statusText} - ${errorText}`,
        );
      }

      const data = (await response.json()) as PaystackCreateTransferResponse;
      return data;
    } catch (err) {
      Logger.error('Paystack transfer initiation error:', err);
      throw new InternalServerErrorException(
        'Failed to initiate Paystack transfer',
      );
    }
  }

  async disableTransferOtp(): Promise<PaystackDisableOtpResponse> {
    try {
      const response = await fetch(`${process.env.PAYSTACK_BASE_URL}/transfer/disable_otp`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}`,
        },
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(
          `Paystack API error: ${response.statusText} - ${errorText}`,
        );
      }

      const data = (await response.json()) as PaystackDisableOtpResponse;
      return data;
    } catch (err) {
      Logger.error('Paystack disable transfer OTP error:', err);
      throw new InternalServerErrorException(
        'Failed to disable Paystack transfer OTP',
      );
    }
  }

  async disableTransferOtpFinalize(otp: string): Promise<PaystackDisableOtpFinalizeResponse> {
    try {
      const response = await fetch(`${process.env.PAYSTACK_BASE_URL}/transfer/disable_otp_finalize`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}`,
        },
        body: JSON.stringify({ otp }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Paystack API error: ${response.statusText} - ${errorText}`);
      }

      const data = (await response.json()) as PaystackDisableOtpFinalizeResponse;
      return data;
    } catch (err) {
      Logger.error('Paystack disable transfer OTP finalize error:', err);
      throw new InternalServerErrorException('Failed to finalize disabling of Paystack transfer OTP');
    }
  }
}
