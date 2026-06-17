export interface ApAgingSummary {
  supplierId: number;
  supplierName: string;

  invoiceCount: number;
  totalOutstanding: number;

  bucket0_30: number;
  bucket31_60: number;
  bucket61_90: number;
  bucket90Plus: number;
}

export interface ApAgingInvoice {
  invoiceId: number;
  invoiceNo: string;
  invoiceDate: string;
  dueDate: string;

  ageDays: number;
  bucketName: string;

  supplierId: number;
  supplierName: string;

  originalAmount: number;
  paidAmount: number;
  creditAmount: number;
  balance: number;

  isOverseas?: boolean;
  incotermsName?: string;
  supplierEmail?: string;
}
