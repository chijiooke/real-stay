export interface PaystackInitPaymentResponse {
  status: boolean;
  message: string;
  data: {
    authorization_url: string;
    access_code: string;
    reference: string;
  };
}

interface PaystackRecipientDetails {
  authorization_code: string | null;
  account_number: string;
  account_name: string;
  bank_code: string;
  bank_name: string;
}

interface PaystackRecipientData {
  active: boolean;
  createdAt: string;
  currency: string;
  domain: string;
  id: number;
  integration: number;
  name: string;
  recipient_code: string;
  type: string;
  updatedAt: string;
  is_deleted: boolean;
  details: PaystackRecipientDetails;
}

export interface PaystackCreateRecipientResponse {
  status: boolean;
  message: string;
  data: PaystackRecipientData;
}

export interface CreateTransferDto {
  source: 'balance'; // Paystack requires this to be 'balance'
  amount: number; // amount in kobo (so ₦1000 => 100000)
  recipient: string; // e.g. 'RCP_gd9vgag7n5lr5ix'
  reference: string; // unique reference from your system
  reason?: string; // optional transfer note
}

// ---- Response Types ----
interface PaystackTransferData {
  integration: number;
  domain: string;
  amount: number;
  currency: string;
  source: string;
  reason: string;
  recipient: number;
  status: string;
  transfer_code: string;
  id: number;
  createdAt: string;
  updatedAt: string;
}

export interface PaystackCreateTransferResponse {
  status: boolean;
  message: string;
  data: PaystackTransferData;
}
// ---- Payload Interface ----

export interface PaystackDisableOtpResponse {
  status: boolean;
  message: string;
  data?: Record<string, unknown>;
}

export interface PaystackDisableOtpFinalizeResponse {
  status: boolean;
  message: string;
  data?: Record<string, unknown>;
}

export enum PaystackEventQueue {
  OUTFLOW = 'paystack-outflow:events',
  INFLOW = 'paystack-inflow:events',
}
