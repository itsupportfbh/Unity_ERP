import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from 'environments/environment';

export interface AuditTrailCreateRequest {
  module: string;
  documentType: string;
  documentId: number;
  documentNo?: string;
  action: string;
  oldValuesJson?: string;
  newValuesJson?: string;
  remarks?: string;
}

@Injectable({
  providedIn: 'root'
})
export class AuditTrailService {
  private readonly baseUrl = `${environment.apiUrl}/AuditTrail`;

  constructor(private http: HttpClient) {}

  getByDocument(documentType: string, documentId: number): Observable<any> {
    return this.http.get<any>(`${this.baseUrl}/${documentType}/${documentId}`);
  }

  search(filters: { module?: string; documentType?: string; documentId?: number; take?: number } = {}): Observable<any> {
    let params = new HttpParams();

    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        params = params.set(key, String(value));
      }
    });

    return this.http.get<any>(this.baseUrl, { params });
  }

  create(request: AuditTrailCreateRequest): Observable<any> {
    return this.http.post<any>(this.baseUrl, request);
  }
}
