import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { environment } from 'environments/environment';

export interface ErpDashboardKpis {
  salesAmount: number;
  purchaseAmount: number;
  localPurchaseAmount: number;
  overseasPurchaseAmount: number;
  arOutstanding: number;
  apOutstanding: number;
  pendingApprovals: number;
  openPr: number;
  openPo: number;
  localPoCount: number;
  overseasPoCount: number;
  openOverseasPo: number;
  openGrnForInvoice: number;
  unmatchedBankLines: number;
  ocrReview: number;
}

export interface ErpDashboardTrend {
  period: string;
  sales: number;
  purchases: number;
}

export interface ErpDashboardAction {
  module: string;
  title: string;
  countLabel: string;
  route: string;
  severity: string;
}

export interface ErpDashboardModuleStatus {
  module: string;
  openCount: number;
  completedCount: number;
  amount: number;
}

export interface ErpDashboard {
  fromDate: string;
  toDate: string;
  kpis: ErpDashboardKpis;
  salesTrend: ErpDashboardTrend[];
  actions: ErpDashboardAction[];
  moduleStatus: ErpDashboardModuleStatus[];
}

@Injectable({ providedIn: 'root' })
export class ErpDashboardService {
  private readonly baseUrl = `${environment.apiUrl}/Dashboard`;

  constructor(private http: HttpClient) {}

  getErpDashboard(fromDate: string, toDate: string): Observable<ErpDashboard> {
    const params = new HttpParams()
      .set('fromDate', fromDate)
      .set('toDate', toDate);

    return this.http
      .get<any>(`${this.baseUrl}/erp`, { params })
      .pipe(map(res => res?.data || res));
  }
}
