import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { environment } from 'environments/environment';

export interface LanguageOption {
  code: string;
  name: string;
  isActive: boolean;
}

export interface TranslationEntry {
  id: number;
  languageCode: string;
  translationKey: string;
  translationValue: string;
  module?: string;
  isActive: boolean;
  updatedDate?: string;
}

@Injectable({ providedIn: 'root' })
export class LanguageAdminService {
  private readonly baseUrl = `${environment.apiUrl}/LanguageAdmin`;

  constructor(private http: HttpClient) {}

  getLanguages(): Observable<LanguageOption[]> {
    return this.http.get<any>(`${this.baseUrl}/languages`).pipe(map(res => res?.data || res || []));
  }

  getTranslations(filters: {
    languageCode: string;
    module?: string;
    includeInactive?: boolean;
  }): Observable<TranslationEntry[]> {
    let params = new HttpParams()
      .set('languageCode', filters.languageCode || 'en')
      .set('includeInactive', String(!!filters.includeInactive));

    if (filters.module) {
      params = params.set('module', filters.module);
    }

    return this.http.get<any>(this.baseUrl, { params }).pipe(map(res => res?.data || res || []));
  }

  getDictionary(languageCode: string): Observable<Record<string, string>> {
    return this.http
      .get<any>(`${this.baseUrl}/dictionary/${languageCode || 'en'}`)
      .pipe(map(res => res?.data || res || {}));
  }

  saveTranslation(entry: Partial<TranslationEntry>): Observable<any> {
    return this.http.post<any>(this.baseUrl, entry).pipe(map(res => res?.data || res));
  }

  deactivateTranslation(id: number): Observable<any> {
    return this.http.delete<any>(`${this.baseUrl}/${id}`).pipe(map(res => res?.data || res));
  }
}
