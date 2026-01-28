// src/app/main/finance/ap/accounts-payable.service.ts
import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from 'environments/environment';
import { map } from 'rxjs/operators';
export interface PeriodStatus {
  isSuccess: boolean;
  isLocked: boolean;
  periodName?: string;
  message?: string;
}
export interface BankAccountBalance {
  id: number;
  headCode: string;
  headName: string;
  openingBalance: number;
  availableBalance: number;
}

@Injectable({
  providedIn: 'root'
})
export class AccountsPayableService {

  private baseUrl = environment.apiUrl + '/finance/ap';
private baseUrl1 = environment.apiUrl + '/PeriodClose';
private baseUrl2 = environment.apiUrl + '/BankAccounts';
  constructor(private http: HttpClient) { }

  // INVOICES TAB
  getApInvoices(): Observable<any> {
    return this.http.get<any>(`${this.baseUrl}/invoices`);
  }

  getApInvoicesBySupplier(supplierId: number): Observable<any> {
    return this.http.get<any>(`${this.baseUrl}/invoices/supplier/${supplierId}`);
  }

  // PAYMENTS TAB
  getPayments(): Observable<any> {
    return this.http.get<any>(`${this.baseUrl}/payments`);
  }

  createPayment(payload: any): Observable<any> {
    return this.http.post<any>(`${this.baseUrl}/payments/create`, payload);
  }

  // 3-WAY MATCH TAB
  getMatchList(): Observable<any> {
    return this.http.get<any>(`${this.baseUrl}/match`);
  }
   getPeriodStatus(date: string): Observable<PeriodStatus> {
    return this.http.get<PeriodStatus>(`${this.baseUrl1}/status`, {
      params: { date }
    });
  }
//  getBankAccounts(): Observable<any> {
//     return this.http.get<any>(`${this.baseUrl}/bankaccount`);
//   }
  updateBankBalance(payload: any): Observable<any> {
  return this.http.post(`${this.baseUrl}/update-bank-balance`, payload);
}
 getBankAccounts(): Observable<BankAccountBalance[]> {
    return this.http.get<any>(this.baseUrl2).pipe(
      map(res => res.data as BankAccountBalance[])
    );
  }
  getSupplierAdvancesById(supplierId: number) {
  return this.http.get<any>(`${this.baseUrl}/supplier-advances/${supplierId}`); // adjust URL
}
createSupplierAdvance(payload: any) {
  return this.http.post<any>(`${this.baseUrl}/createsupplier-advance`, payload);
}
getSupplierAdvances() {
  return this.http.get<any>(`${this.baseUrl}/getsupplier-advances`);
}
getSupplierAdvancesList() {
  return this.http.get<any>(`${this.baseUrl}/list`);
}
}
