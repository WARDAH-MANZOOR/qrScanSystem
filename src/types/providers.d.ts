export interface DisbursementPayload {
  amount: number;
  phone: string;
  order_id: string;
}

export interface IEasyLoginPayload {
  ResponseCode: string;
  ResponseMessage: string;
  User: string;
  Timestamp: string;
}
