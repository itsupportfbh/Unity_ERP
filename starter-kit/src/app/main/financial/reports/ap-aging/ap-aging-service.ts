// app/main/financial/ap-aging/ap-aging-service.ts

import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { environment } from 'environments/environment';
import { Observable } from 'rxjs';


@Injectable({
  providedIn: 'root'
})
export class ApAgingService {

  private url = environment.apiUrl
  private baseUrl = '/ApAging';   // match controller route

  constructor(private http: HttpClient) {}

  getSummary(fromDate: string, toDate: string): Observable<any> {
    const params = new HttpParams()
      .set('fromDate', fromDate)
      .set('toDate', toDate);

    return this.http.get<any>(`${this.url+ this.baseUrl}/summary`, { params });
  }

  getSupplierInvoices(
    supplierId: number,
    fromDate: string,
    toDate: string
  ): Observable<any> {
    const params = new HttpParams()
      .set('supplierId', supplierId.toString())
      .set('fromDate', fromDate)
      .set('toDate', toDate);

    return this.http.get<any>(`${this.url+this.baseUrl}/supplierInvoices`, { params });
  }
}
