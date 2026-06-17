import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { environment } from 'environments/environment';
import { Observable } from 'rxjs';

export interface SupplierScorecardRow {
  supplierId: number;
  supplierName: string;
  supplierCode: string;
  leadTime?: number | null;
  poCount: number;
  approvedPoCount: number;
  pendingPoCount: number;
  rejectedPoCount: number;
  poValueBase: number;
  localPoCount: number;
  overseasPoCount: number;
  localPoValueBase: number;
  overseasPoValueBase: number;
  purchaseType: string;
  incotermsName: string;
  grnCount: number;
  fullGrnCount: number;
  partialGrnCount: number;
  closedGrnCount: number;
  orderedQty: number;
  receivedQty: number;
  pendingQty: number;
  fulfillmentPct: number;
  invoiceCount: number;
  invoiceValueBase: number;
  paidValueBase: number;
  outstandingValueBase: number;
  paymentPct: number;
  approvalScore: number;
  fulfillmentScore: number;
  paymentScore: number;
  overallScore: number;
  rating: string;
}

@Injectable({ providedIn: 'root' })
export class SupplierScorecardService {
  private url = environment.apiUrl;

  constructor(private http: HttpClient) {}

  getReport(filter: { fromDate?: string; toDate?: string; supplierId?: number | null }): Observable<any> {
    let params = new HttpParams();
    if (filter.fromDate) params = params.set('fromDate', filter.fromDate);
    if (filter.toDate) params = params.set('toDate', filter.toDate);
    if (filter.supplierId) params = params.set('supplierId', String(filter.supplierId));
    return this.http.get(`${this.url}/SupplierScorecard/GetReport`, { params });
  }
}
