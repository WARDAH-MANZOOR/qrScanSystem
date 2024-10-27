export interface DisbursementPayload {
  amount: number;
  phone: string;
}

export interface IEasyLoginPayload {
  ResponseCode: string;
  ResponseMessage: string;
  User: string;
  Timestamp: string;
}
