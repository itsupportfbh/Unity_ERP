// Summary row per customer
export interface ArCollectionForecastSummary {
  customerId: number;
  customerName: string;
  bucket0_7: number;
  bucket8_14: number;
  bucket15_30: number;
  bucket30Plus: number;
  totalOutstanding: number;
}

// Detail row per invoice (per customer)
export interface ArCollectionForecastDetail {
  invoiceId: number;
  invoiceNo: string;
  invoiceDate: string;   // ISO string from API
  dueDate: string;       // ISO string from API
  balance: number;
  bucketName: string;    // '0-7', '8-14', '15-30', '>30'
}

// Convenience interface for merged ALL-invoice view
export interface ArCollectionForecastInvoiceRow extends ArCollectionForecastDetail {
  customerId: number;
  customerName: string;
}
