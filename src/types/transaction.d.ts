export interface TransactionRequest {
  id: string;
  date_time: string;
  original_amount: string;
  type: string;
}

export interface CompleteRequest {
  transaction_id: string;
  status: string;
  provider: Provider;
}
