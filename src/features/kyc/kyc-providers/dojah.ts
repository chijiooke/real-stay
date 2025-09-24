import {
  Injectable,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';

interface VerifyNINPayload {
  nin: string;
  selfieImage: string;
  firstName: string;
  lastName: string;
}

@Injectable()
export class DojahService {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  async verifyNIN(payload: VerifyNINPayload): Promise<any> {
    try {
      const response = await fetch(
        `${process.env.DOJAH_BASE_URL}/api/v1/kyc/nin/verify`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            AppId: process.env.DOJAH_APP_ID || '',
            Authorization: process.env.DOJAH_PUB_KEY || '',
          },
          body: JSON.stringify({
            selfie_image: payload.selfieImage,
            nin: payload.nin,
            last_name: payload.lastName,
            first_name: payload.firstName,
          }),
        },
      );

      if (!response.ok) {
        throw new Error(`Dojah API error: ${response.statusText}`);
      }

      return await response.json();
    } catch (err) {
      Logger.error('Dojah verification error:', err);
      throw new InternalServerErrorException(
        'Failed to verify identity with Dojah',
      );
    }
  }
}
