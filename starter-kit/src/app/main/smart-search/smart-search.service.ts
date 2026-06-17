import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { environment } from 'environments/environment';

export interface SmartSearchResult {
  module: string;
  documentType: string;
  id: number;
  documentNo: string;
  title: string;
  subtitle: string;
  status: string;
  documentDate?: string;
  amount?: number;
  route: string;
}

export interface SmartSearchResponse {
  query: string;
  totalCount: number;
  results: SmartSearchResult[];
}

@Injectable({ providedIn: 'root' })
export class SmartSearchService {
  private readonly baseUrl = `${environment.apiUrl}/SmartSearch`;

  constructor(private http: HttpClient) {}

  search(query: string, module: string, take = 12): Observable<SmartSearchResponse> {
    const params = new HttpParams()
      .set('q', query || '')
      .set('module', module || 'All')
      .set('take', String(take));

    return this.http
      .get<any>(this.baseUrl, { params })
      .pipe(map(res => res?.data || res));
  }
}
