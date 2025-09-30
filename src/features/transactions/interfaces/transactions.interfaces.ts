import { Types } from "mongoose";

/* eslint-disable @typescript-eslint/no-explicit-any */
export enum TransactionStatusEnum {
  ABANDONED = 'abandoned',
  FAILED = 'failed',
  ONGOING = 'ongoing',
  PENDING = 'pending',
  PROCESSING = 'processing',
  QUEUED = 'queued',
  REVERSED = 'reversed',
  SUCCESS = 'success',
}

export interface PaystackVerificationResponse {
  status: boolean;
  message: string;
  data: PaystackVerificationData;
}

export interface PaystackVerificationData {
  id: number;
  domain: string;
  status: string;
  reference: string;
  receipt_number: string | null;
  amount: number;
  message: string | null;
  gateway_response: string;
  paid_at: string;
  created_at: string;
  channel: string;
  currency: string;
  ip_address: string;
  metadata: string | null;
  log: {
    start_time: number;
    time_spent: number;
    attempts: number;
    errors: number;
    success: boolean;
    mobile: boolean;
    input: any[];
    history: {
      type: string;
      message: string;
      time: number;
    }[];
  };
  fees: number;
  fees_split: string | null;
  authorization: {
    authorization_code: string;
    bin: string;
    last4: string;
    exp_month: string;
    exp_year: string;
    channel: string;
    card_type: string;
    bank: string;
    country_code: string;
    brand: string;
    reusable: boolean;
    signature: string;
    account_name: string | null;
  };
  customer: {
    id: number;
    first_name: string | null;
    last_name: string | null;
    email: string;
    customer_code: string;
    phone: string | null;
    metadata: string | null;
    risk_action: string;
    international_format_phone: string | null;
  };
  plan: string | null;
  split: Record<string, any>;
  order_id: string | null;
  paidAt: string;
  createdAt: string;
  requested_amount: number;
  pos_transaction_data: any | null;
  source: any | null;
  fees_breakdown: any | null;
  connect: any | null;
  transaction_date: string;
  plan_object: Record<string, any>;
  subaccount: Record<string, any>;
}

export interface TransactionAttrs {
  customer_id?: Types.ObjectId;
  booking_id?: Types.ObjectId;
  status: TransactionStatusEnum;
  amount: number;
  reference: string;
  provider: string;
  currency: string;
}
