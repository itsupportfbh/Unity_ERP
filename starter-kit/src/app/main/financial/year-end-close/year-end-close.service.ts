// year-end-close.service.ts
import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from 'environments/environment';

export interface YearEndCloseRequest {
  fyStartYear: number;
  fyEndYear: number;
  closeDate: string;
}

export interface YearEndCloseResult {
  fyStartYear: number;
  fyEndYear: number;
  totalIncome: number;
  totalExpense: number;
  netProfitLoss: number;
  journalId: number;
  journalNo: string;
}

export interface YearEndClosePreviewRow {
  headName: string;
  headCode: number;
  headType: string;
  totalCredit: number;
  totalDebit: number;
  netBalance: number;
}

export interface YearEndCloseStatus {
  isClosed: boolean;
  fyStartYear?: number;
  fyEndYear?: number;
  closeDate?: string;
  netProfitLoss?: number;
  journalNo?: string;
}

@Injectable({ providedIn: 'root' })
export class YearEndCloseService {
  private baseUrl = environment.apiUrl + '/YearEndClose';

  constructor(private http: HttpClient) {}

  getStatus(fyStartYear: number): Observable<YearEndCloseStatus> {
    return this.http.get<YearEndCloseStatus>(`${this.baseUrl}/status/${fyStartYear}`);
  }

  getPreview(fyStartYear: number, closeDate: string): Observable<YearEndClosePreviewRow[]> {
    const params = new HttpParams()
      .set('fyStartYear', fyStartYear)
      .set('closeDate', closeDate);
    return this.http.get<YearEndClosePreviewRow[]>(`${this.baseUrl}/preview`, { params });
  }

  run(req: YearEndCloseRequest): Observable<YearEndCloseResult> {
    return this.http.post<YearEndCloseResult>(`${this.baseUrl}/run`, req);
  }
}