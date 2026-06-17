import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from 'environments/environment';

export interface BankStatementLine {
  id: number;
  bankId: number;
  transactionDate: string;
  description?: string;
  referenceNo?: string;
  debit: number;
  credit: number;
  amount: number;
  isMatched: boolean;
  matchedDocumentType?: string;
  matchedDocumentId?: number;
  matchedDocumentNo?: string;
  remarks?: string;
}

@Injectable({ providedIn: 'root' })
export class BankReconciliationService {
  private readonly baseUrl = `${environment.apiUrl}/BankReconciliation`;

  constructor(private http: HttpClient) {}

  importStatement(payload: any): Observable<any> {
    return this.http.post<any>(`${this.baseUrl}/import`, payload);
  }

  lines(bankId: number, matched?: boolean): Observable<any> {
    let params = new HttpParams().set('bankId', String(bankId));
    if (matched !== undefined) params = params.set('matched', String(matched));
    return this.http.get<any>(`${this.baseUrl}/lines`, { params });
  }

  summary(bankId: number): Observable<any> {
    return this.http.get<any>(`${this.baseUrl}/summary`, {
      params: new HttpParams().set('bankId', String(bankId))
    });
  }

  reconcile(payload: any): Observable<any> {
    return this.http.post<any>(`${this.baseUrl}/reconcile`, payload);
  }

  unreconcile(statementLineId: number): Observable<any> {
    return this.http.post<any>(`${this.baseUrl}/unreconcile/${statementLineId}`, {});
  }
}
