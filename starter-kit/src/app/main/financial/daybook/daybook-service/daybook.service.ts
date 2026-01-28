import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { environment } from 'environments/environment';
import { Observable } from 'rxjs';
import { FinanceReportApiUrls } from 'Urls/FinanceReportAPIUrls';

export interface DaybookRequestDto {
  fromDate: string;     // '2025-11-01'
  toDate: string;       // '2025-11-30'
  companyId?: number;   // optional, if you use
}

export interface DaybookResponseDto {
  transDate: string;        // DateTime from API
  voucherNo: string;
  voucherType: string;      // 'SI','CN','AR-RCPT','PIN','SPAY','SDN','MJ'...
  voucherName: string;
  accountHeadName: string;
  description: string;
  debit: number;
  credit: number;
  runningBalance: number;
}

export interface ResponseResult<T> {
  success: boolean;         // matches new ResponseResult(true, "Success", data)
  message: string;
  data: T;
}

@Injectable({
  providedIn: 'root'
})
export class DaybookService {

  private url = environment.apiUrl;

  constructor(private http: HttpClient) {}

  // 🔹 POST /api/FinanceReport/daybook
  getDaybook(payload: DaybookRequestDto): Observable<ResponseResult<DaybookResponseDto[]>> {
    return this.http.post<ResponseResult<DaybookResponseDto[]>>(
      this.url + FinanceReportApiUrls.GetDaybook,
      payload
    );
  }
}
