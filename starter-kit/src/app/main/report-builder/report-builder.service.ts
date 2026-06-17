import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { environment } from 'environments/environment';

export interface ReportSource {
  key: string;
  name: string;
  columns: string[];
}

export interface SavedReport {
  id: number;
  reportName: string;
  sourceKey: string;
  columnsJson: string;
  filtersJson: string;
  scheduleFrequency?: string;
  emailTo?: string;
}

@Injectable({ providedIn: 'root' })
export class ReportBuilderService {
  private readonly baseUrl = `${environment.apiUrl}/ReportBuilder`;

  constructor(private http: HttpClient) {}

  getSources(): Observable<ReportSource[]> {
    return this.http.get<any>(`${this.baseUrl}/sources`).pipe(map(res => res?.data || res || []));
  }

  getSavedReports(): Observable<SavedReport[]> {
    return this.http.get<any>(`${this.baseUrl}/saved`).pipe(map(res => res?.data || res || []));
  }

  runReport(payload: any): Observable<any[]> {
    return this.http.post<any>(`${this.baseUrl}/run`, payload).pipe(map(res => res?.data || res || []));
  }

  saveReport(payload: any): Observable<any> {
    return this.http.post<any>(`${this.baseUrl}/saved`, payload).pipe(map(res => res?.data || res));
  }

  deleteSavedReport(id: number): Observable<any> {
    return this.http.delete<any>(`${this.baseUrl}/saved/${id}`).pipe(map(res => res?.data || res));
  }
}
