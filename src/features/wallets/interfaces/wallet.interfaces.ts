import { ClientSession } from 'mongoose';

/* eslint-disable @typescript-eslint/no-explicit-any */
export enum WalletStatusEnum {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
  BLOCKED = 'blocked',
}

export enum CurrencyEnum {
  NAIRA = 'NGN',
}

export interface WalletCreditMeta {
  reference: string;
  type: string;
  description?: string;
  session?: ClientSession;
}

export interface WalletTransactionEntry {
  reference: string;
  amount: number;
  type: string;
  description: string;
  createdAt: Date;
  status: string;
}
