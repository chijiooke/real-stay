
import { IsObject, IsString } from 'class-validator';

export class PaystackWebhookDTO {
  @IsString()
  event: string;

  @IsObject()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  data: Record<string, any>;
}
