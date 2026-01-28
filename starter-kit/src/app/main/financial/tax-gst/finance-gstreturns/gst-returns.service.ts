import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from 'environments/environment';

export interface GstFinancialYearOption {
  fyStartYear: number;
  fyLabel: string;
}

export interface GstPeriodOption {
  id: number;
  label: string;
  startDate: string;
  endDate: string;
}

export interface GstSystemSummary {
  periodId: number;
  periodLabel: string;
  collectedOnSales: number;
  paidOnPurchases: number;
  amountDue: number;
}

export interface GstReturnDto {
  id: number;
  periodId: number;
  box6OutputTax: number;
  box7InputTax: number;
  box8NetPayable: number;
  status: 'OPEN' | 'LOCKED' | string;
  systemSummary: GstSystemSummary;
}

export interface GstAdjustment {
  id: number;
  periodId: number;
  lineType: number;   // 1..4
  amount: number;
  description: string;
}

export interface GstApplyLockPayload {
  periodId: number;
  box6OutputTax: number;
  box7InputTax: number;
}

export interface GstDocRow {
  docType: 'SI' | 'PIN';
  docId: number;
  docNo: string;
  docDate: string;
  partyName: string;
  taxAmount: number;
  netAmount: number;
}
export interface GstDetailRow {
  docType: 'SI' | 'PIN';
  docId: number;
  docNo: string;
  docDate: string;
  partyName: string;
  source: 'OUTPUT' | 'INPUT';
  taxableAmount: number;
  taxAmount: number;
  netAmount: number;
}

@Injectable({
  providedIn: 'root'
})
export class GstReturnsService {

  private baseUrl = environment.apiUrl + '/GstReturns';

  constructor(private http: HttpClient) {}

  getYears(): Observable<GstFinancialYearOption[]> {
    return this.http.get<GstFinancialYearOption[]>(`${this.baseUrl}/years`);
  }

  getPeriodsByYear(fyStartYear: number): Observable<GstPeriodOption[]> {
    return this.http.get<GstPeriodOption[]>(`${this.baseUrl}/periods/${fyStartYear}`);
  }

  getReturnForPeriod(periodId: number): Observable<GstReturnDto> {
    return this.http.get<GstReturnDto>(`${this.baseUrl}/return/${periodId}`);
  }

  applyAndLock(payload: GstApplyLockPayload): Observable<GstReturnDto> {
    return this.http.post<GstReturnDto>(`${this.baseUrl}/apply-lock`, payload);
  }

  getAdjustments(periodId: number): Observable<GstAdjustment[]> {
    return this.http.get<GstAdjustment[]>(`${this.baseUrl}/adjustments/${periodId}`);
  }

  saveAdjustment(adj: GstAdjustment): Observable<GstAdjustment> {
    return this.http.post<GstAdjustment>(`${this.baseUrl}/adjustments`, adj);
  }

  deleteAdjustment(id: number): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/adjustments/${id}`);
  }

  getDocsForPeriod(periodId: number): Observable<GstDocRow[]> {
    return this.http.get<GstDocRow[]>(`${this.baseUrl}/${periodId}/docs`);
  }
  getGstDetails(
  startDate: string,
  endDate: string,
  docType: 'SI' | 'PIN' | 'ALL',
  search?: string
) {
  let params = new HttpParams()
    .set('startDate', startDate)
    .set('endDate', endDate);

  // Only send docType when it's SI or PIN.
  // When it's ALL, don't set the param so backend returns both.
  if (docType && docType !== 'ALL') {
    params = params.set('docType', docType);
  }

  if (search) {
    params = params.set('search', search);
  }

  return this.http.get<GstDetailRow[]>(`${this.baseUrl}/details`, { params });
}

}
