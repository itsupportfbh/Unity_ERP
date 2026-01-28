// trial-balance-model.ts
export interface TrialBalance {
    headId: number;
  headCode: string;
  headName: string;
    parentHead: number | null;

  openingDebit: number;
  openingCredit: number;

  closingDebit: number;
  closingCredit: number;
    level?: number;
  isGroup?: boolean;
  expanded?: boolean;
  children?: TrialBalance[];
}
export interface TrialBalanceDetail {
  transDate: string;   // or Date, depending on your API
  sourceType: string;
  sourceNo: string;
  description: string;
  debit: number;
  credit: number;
}