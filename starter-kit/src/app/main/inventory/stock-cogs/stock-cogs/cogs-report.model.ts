export interface CogsSummary {
  periodFrom: string;
  periodTo: string;
  openingStock: number;
  purchases: number;
  closingStock: number;
  goodsAvailable: number;
  cogs: number;
}

export interface CogsItemRow {
  itemId: number;
  itemName: string;
  openingQty: number;
  openingValue: number;
  purchaseQty: number;
  purchaseValue: number;
  closingQty: number;
  closingValue: number;
  cogsValue: number;
}

export interface CogsReport {
  summary: CogsSummary;
  items: CogsItemRow[];
}