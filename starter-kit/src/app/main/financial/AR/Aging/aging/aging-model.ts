export interface ArAgingSummary {
  customerId:           number;
  customerName:         string;
  invoiceCount:         number;
  // Invoice currency totals
  totalOutstanding:     number;
  bucket0_30:           number;
  bucket31_60:          number;
  bucket61_90:          number;
  bucket90Plus:         number;
  // ✅ Base SGD totals
  totalOutstandingBase: number;
  bucket0_30Base:       number;
  bucket31_60Base:      number;
  bucket61_90Base:      number;
  bucket90PlusBase:     number;
}

export interface ArAgingInvoice {
  invoiceId:      number;
  invoiceNo:      string;
  invoiceDate:    string | Date;
  dueDate?:       string | Date | null;
  ageDays:        number;
  bucketName:     string;
  customerId:     number;
  customerName:   string;
  originalAmount: number;
  paidAmount:     number;
  creditAmount:   number;
  advanceAmount:  number;
  balance:        number;
  // ✅ FxRate + Base SGD
  fxRate?:        number;
  currencyId?:    number;
  currencyName?:  string;
  balanceBase:    number;
}


export interface ResponseResult<T> {
  success: boolean;
  message: string;
  data: T;
}
