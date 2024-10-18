export interface Merchant {
  username: string;
  email?: string;
  password?: string;
  phone_number: string;
  company_name: string;
  company_url: string;
  city: string;
  payment_volume: number;
  commission: number;
  merchantId: number;
  commissionGST: number;
  commissionWithHoldingTax: number;
  disbursementRate: number;
  disbursementGST: number;
  disbursementWithHoldingTax: number;
  settlementDuration: number;
  jazzCashMerchantId: number;
  easyPaisaMerchantId: number;
}

export interface IjazzCashConfigParams {
  merchantId: string;
}
export interface IEasyPaisaPayload {
  storeId: string;
  username: string;
  credentials: string;
  metadata: any;
}
