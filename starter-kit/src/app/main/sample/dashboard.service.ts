import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from 'environments/environment';


// ── DTOs (mirror C# backend) ─────────────────────────────────

export interface ArApGauge {
  aR_TotalInvoiced:  number;
  aR_TotalCollected: number;
  aR_CollectedPct:   number;
  aP_TotalInvoiced:  number;
  aP_TotalPaid:      number;
  aP_PaidPct:        number;
}

export interface ArAging {
  aR_0_30:   number;
  aR_31_60:  number;
  aR_61_90:  number;
  aR_90Plus: number;
}

export interface ApAging {
  aP_0_30:   number;
  aP_31_60:  number;
  aP_61_90:  number;
  aP_90Plus: number;
}

export interface InventorySummary {
  newItemsInRange: number;
  availableSKU:    number;
  belowMinCount:   number;
}

export interface InventoryTopItem {
  sku:          string;
  itemName:     string;
  availableQty: number;
}

export interface PlanningOrder {
  planningOrderCount: number;
  nextPlanningDate:   string | null;
}

export interface RecipeCostAlert {
  recipeCostAlertCount: number;
}

export interface ActivityTimeline {
  activityType: string;
  docNo:        string;
  partyName:    string;
  activityDate: string;
  statusLabel:  string;
}

export interface ExceptionItem {
  exceptionType: string;
  docNo:         string;
  party:         string;
  impact:        string;
}

export interface SalesKpi {
  salesQuotationsCount: number;
  salesInvoicesCount:   number;
  grnCount:             number;   // API returns lowercase
  aR_OutstandingCount:  number;
  purchaseOrderCount:   number;
  supplierInvoiceCount: number;
}

export interface SalesTrend {
  invoiceDay:      string;
  invoiceCount:    number;
  dailySalesTotal: number;
}

export interface SalesOverview {
  salesOrdersOpen:       number;
  deliveryOrdersCreated: number;
  salesInvoicesPosted:   number;
  activeCustomers:       number;
  totalSalesAmount:      number;
  totalOrdersAmount:     number;
}

export interface DashboardData {
  arApGauge:        ArApGauge        | null;
  arAging:          ArAging          | null;
  apAging:          ApAging          | null;
  inventorySummary: InventorySummary | null;
  topItems:         InventoryTopItem[];
  planningOrders:   PlanningOrder    | null;
  costAlerts:       RecipeCostAlert  | null;
  timeline:         ActivityTimeline[];
  exceptions:       ExceptionItem[];
  salesKpi:         SalesKpi         | null;
  salesTrend:       SalesTrend[];
  salesOverview:    SalesOverview    | null;
}

// ── Service ──────────────────────────────────────────────────

@Injectable({ providedIn: 'root' })
export class DashboardService {
  private base = `${environment.apiUrl}/dashboard`;

  constructor(private http: HttpClient) {}

getDashboardData(companyId: number, from: string, to: string) {
  const cid = companyId ?? 0;

  return this.http.get<DashboardData>(this.base + '/dashboard', {
    params: {
      companyId: cid.toString(),
      startDate: from,
      endDate: to
    }
  });
}
}
