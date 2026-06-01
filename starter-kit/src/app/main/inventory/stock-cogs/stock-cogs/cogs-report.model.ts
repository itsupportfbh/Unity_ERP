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
  itemCode?: string;
  itemName?: string;

  openingQty: number;
  openingBaseQty: number;
  openingPrice: number;
  openingValue: number;

  purchaseQty: number;
  purchaseBaseQty: number;
  purchasePrice: number;
  purchaseValue: number;

  closingQty: number;
  closingBaseQty: number;
  closingPrice: number;
  closingValue: number;

  cogsValue: number;

  baseUomName: string;
  purchaseUomName: string;
}

export interface CogsReport {
  summary: CogsSummary;
  items: CogsItemRow[];
}