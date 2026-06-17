import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { environment } from 'environments/environment';

export interface CommunicationTemplate {
  id: number;
  templateName: string;
  channel: 'Email' | 'WhatsApp';
  documentType?: string;
  subjectTemplate: string;
  bodyTemplate: string;
  languageCode?: string;
  isDefault: boolean;
  isActive: boolean;
  companyId?: number;
  createdDate?: string;
  updatedDate?: string;
}

export interface TemplatePreview {
  subject: string;
  body: string;
}

@Injectable({ providedIn: 'root' })
export class TemplateAdminService {
  private readonly baseUrl = `${environment.apiUrl}/TemplateAdmin`;

  constructor(private http: HttpClient) {}

  getTemplates(filters: {
    channel?: string;
    documentType?: string;
    includeInactive?: boolean;
  }): Observable<CommunicationTemplate[]> {
    let params = new HttpParams().set('includeInactive', String(!!filters.includeInactive));

    if (filters.channel) {
      params = params.set('channel', filters.channel);
    }

    if (filters.documentType) {
      params = params.set('documentType', filters.documentType);
    }

    return this.http
      .get<any>(this.baseUrl, { params })
      .pipe(map(res => res?.data || res || []));
  }

  createTemplate(template: Partial<CommunicationTemplate>): Observable<any> {
    return this.http.post<any>(this.baseUrl, template).pipe(map(res => res?.data || res));
  }

  updateTemplate(id: number, template: Partial<CommunicationTemplate>): Observable<any> {
    return this.http.put<any>(`${this.baseUrl}/${id}`, template).pipe(map(res => res?.data || res));
  }

  deactivateTemplate(id: number): Observable<any> {
    return this.http.delete<any>(`${this.baseUrl}/${id}`).pipe(map(res => res?.data || res));
  }

  preview(subjectTemplate: string, bodyTemplate: string): Observable<TemplatePreview> {
    return this.http
      .post<any>(`${this.baseUrl}/preview`, { subjectTemplate, bodyTemplate })
      .pipe(map(res => res?.data || res));
  }
}
