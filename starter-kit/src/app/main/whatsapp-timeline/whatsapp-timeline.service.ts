import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { environment } from 'environments/environment';

export interface WhatsAppMessageLog {
  id: number;
  direction: string;
  documentType: string;
  documentId?: number;
  documentNo?: string;
  partyName?: string;
  phone?: string;
  templateName?: string;
  languageCode?: string;
  message?: string;
  status: string;
  providerMessageId?: string;
  sandboxMode: boolean;
  providerResponse?: string;
  createdAt: string;
  companyId: number;
}

@Injectable({ providedIn: 'root' })
export class WhatsAppTimelineService {
  private readonly baseUrl = `${environment.apiUrl}/whatsapp`;

  constructor(private http: HttpClient) {}

  getLogs(filters: {
    documentType?: string;
    documentId?: string;
    phone?: string;
    fromDate?: string;
    toDate?: string;
    take?: number;
  }): Observable<WhatsAppMessageLog[]> {
    let params = new HttpParams().set('take', String(filters.take || 100));
    Object.keys(filters).forEach(key => {
      const value = (filters as any)[key];
      if (value !== undefined && value !== null && value !== '' && key !== 'take') {
        params = params.set(key, String(value));
      }
    });

    return this.http
      .get<any>(`${this.baseUrl}/logs`, { params })
      .pipe(map(res => res?.data || res || []));
  }
}
