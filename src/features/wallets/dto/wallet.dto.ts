export interface CreateRecipientDto {
  type: string;
  name: string;
  account_number: string;
  bank_code: string;
  currency: string;
  userid: string;
}
export interface WithdrawalDto {
  amount: number;
  user_id: string;
}
