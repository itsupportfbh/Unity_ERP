export type CompanyStatus = 'Active' | 'Inactive';

export interface CompanyListItem {
  id: number;
  code: string;
  name: string;
  currency: string;
  status: CompanyStatus;
}

export interface CompanyAuditRow {
  date: string;  // yyyy-MM-dd
  user: string;
  change: string;
}

export interface CompanyNumberSeriesRow {
  id: number;
  docType: string;
  prefix: string;
  nextNo: number;
  resetYearly: boolean;
}

export interface CompanyIntegrations {
  whatsappEnabled: boolean;
  emailEnabled: boolean;
  ocrEnabled: boolean;
  bankFeedsEnabled: boolean;

  apiEndpoint?: string;
  apiKey?: string;
}

export interface CompanyFinanceTax {
  baseCurrency: string;
  country: string;
  taxMode: 'Exclusive' | 'Inclusive';
  gstVatNo?: string;
  filingFrequency?: 'Monthly' | 'Quarterly' | 'Yearly';
  defaultOutputTaxCode?: string;
  defaultInputTaxCode?: string;
  decimalPlaces: number;
  roundingRule: 'Round half up' | 'Round down' | 'Round up';
}

export interface CompanyDefaults {
  defaultBranch?: string;
  defaultWarehouse?: string;
  defaultBin?: string;
  defaultLanguage?: string;
  timeZone?: string;
}

export interface CompanyDetail {
  id: number;
  code: string;
  name: string;
  legalName?: string;
  registrationNo?: string;
  status: CompanyStatus;

  phone?: string;
  email?: string;
  website?: string;

  address1?: string;
  address2?: string;
  city?: string;
  state?: string;
  postal?: string;

  logoBase64?: string; // stored as base64 for now

  financeTax: CompanyFinanceTax;
  defaults: CompanyDefaults;
  numberSeries: CompanyNumberSeriesRow[];
  integrations: CompanyIntegrations;

  lastUpdatedBy?: string;
  lastUpdatedAt?: string; // yyyy-MM-dd HH:mm

  auditTrail: CompanyAuditRow[];
}