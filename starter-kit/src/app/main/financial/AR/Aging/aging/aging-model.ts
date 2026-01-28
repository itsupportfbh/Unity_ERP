export interface ArAgingSummary {
  customerId: number;
  customerName: string;

  invoiceCount: number;
  totalOutstanding: number;

  bucket0_30: number;
  bucket31_60: number;
  bucket61_90: number;
  bucket90Plus: number;
}

export interface ArAgingInvoice {
  invoiceId: number;
  invoiceNo: string;
  invoiceDate: string;
  dueDate: string;
  ageDays: number;
  bucketName: string;
  customerId: number;
  customerName: string;
  customerEmail?: string;
  originalAmount: number;
  paidAmount: number;
  creditAmount: number;
  balance: number;
}


export interface ResponseResult<T> {
  success: boolean;
  message: string;
  data: T;
}
