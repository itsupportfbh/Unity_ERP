import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from 'environments/environment';

export interface ApprovalActionRequest {
  documentType: 'PR' | 'PO' | 'PIN' | 'JOURNAL' | 'SO';
  documentId: number;
  amount?: number;
  remarks?: string;
}

@Injectable({
  providedIn: 'root'
})
export class ApprovalWorkflowService {
  private readonly baseUrl = `${environment.apiUrl}/ApprovalWorkflow`;

  constructor(private http: HttpClient) {}

  submit(request: ApprovalActionRequest): Observable<any> {
    return this.http.post<any>(`${this.baseUrl}/submit`, request);
  }

  approve(request: ApprovalActionRequest): Observable<any> {
    return this.http.post<any>(`${this.baseUrl}/approve`, request);
  }

  reject(request: ApprovalActionRequest): Observable<any> {
    return this.http.post<any>(`${this.baseUrl}/reject`, request);
  }

  status(documentType: ApprovalActionRequest['documentType'], documentId: number): Observable<any> {
    return this.http.get<any>(`${this.baseUrl}/status/${documentType}/${documentId}`);
  }

  pending(documentType?: ApprovalActionRequest['documentType']): Observable<any> {
    let params = new HttpParams();
    if (documentType) {
      params = params.set('documentType', documentType);
    }

    return this.http.get<any>(`${this.baseUrl}/pending`, { params });
  }
}
