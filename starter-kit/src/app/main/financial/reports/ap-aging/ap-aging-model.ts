// src/app/main/financial/reports/ap-aging/ap-aging-model.ts

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
  invoiceDate: string;   // or Date
  dueDate: string;       // or Date

  ageDays: number;
  bucketName: string;

  supplierId: number;
  supplierName: string;

  originalAmount: number;
  paidAmount: number;
  creditAmount: number;
  balance: number;

  // 🔹 for auto-email
  supplierEmail?: string;
}
