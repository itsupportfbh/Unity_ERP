// app/main/financial/period-close-fx/period-close-fx.service.ts
import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { map, catchError } from 'rxjs/operators';
import { environment } from 'environments/environment';

export interface PeriodOption {
  id: number;
  label: string;
  startDate: string;
  endDate: string;
}

export interface PeriodStatus {
  periodId: number;
  periodLabel: string;
  periodEndDate: string;
  isLocked: boolean;
}

export interface FxRevalRequest {
  periodId: number;
  fxDate: string; // yyyy-MM-dd
}

export interface PeriodStatusDto {
  isLocked: boolean;
  periodName?: string;
  periodCode?: string;
  startDate?: string;
  endDate?: string;
}

// this matches what you showed
export interface PeriodStatusResponseRaw {
  isSuccess?: boolean;
  isLocked?: boolean;
  periodName?: string;
  startDate?: string;
  endDate?: string;
  // in case backend later wraps in data
  data?: PeriodStatusDto | null;
}

@Injectable({ providedIn: 'root' })
export class PeriodCloseService {

  private baseUrl = environment.apiUrl + '/PeriodClose';

  constructor(private http: HttpClient) {}

  // ========== Period-close page (by periodId) ==========
  getPeriods(): Observable<PeriodOption[]> {
    return this.http.get<PeriodOption[]>(`${this.baseUrl}/periods`);
  }

  getStatus(periodId: number): Observable<PeriodStatus> {
    return this.http.get<PeriodStatus>(`${this.baseUrl}/status/${periodId}`);
  }

  setLock(periodId: number, lock: boolean): Observable<PeriodStatus> {
    return this.http.post<PeriodStatus>(`${this.baseUrl}/lock`, { periodId, lock });
  }

  runFxReval(req: FxRevalRequest): Observable<any> {
    return this.http.post(`${this.baseUrl}/run-fx-reval`, req);
  }

  // ========== Date-based endpoints ==========

  // GET /PeriodClose/status?date=yyyy-MM-dd
  getStatusByDate(date: string): Observable<PeriodStatusResponseRaw> {
    const params = new HttpParams().set('date', date);
    return this.http.get<PeriodStatusResponseRaw>(`${this.baseUrl}/status`, { params });
  }

  // Only boolean flag
  isLockedForDate(date: string): Observable<boolean> {
    return this.getStatusByDate(date).pipe(
      map(res => {
        const anyRes: any = res;
        // prefer root-level isLocked (your current API)
        if (typeof anyRes.isLocked === 'boolean') {
          return anyRes.isLocked;
        }
        // fallback: nested data.isLocked (if backend ever changes)
        if (anyRes.data && typeof anyRes.data.isLocked === 'boolean') {
          return anyRes.data.isLocked;
        }
        return false;
      }),
      catchError(() => of(false))
    );
  }

  // Full info (locked + period name / dates)
  getStatusForDateWithName(date: string): Observable<PeriodStatusDto | null> {
    return this.getStatusByDate(date).pipe(
      map(res => {
        const anyRes: any = res;

        // current shape: root-level
        if (typeof anyRes.isLocked === 'boolean') {
          const dto: PeriodStatusDto = {
            isLocked: anyRes.isLocked,
            periodName: anyRes.periodName,
            startDate: anyRes.startDate,
            endDate: anyRes.endDate
          };
          return dto;
        }

        // fallback: nested under data
        if (anyRes.data) {
          return anyRes.data as PeriodStatusDto;
        }

        return null;
      }),
      catchError(() => of(null))
    );
  }
}
