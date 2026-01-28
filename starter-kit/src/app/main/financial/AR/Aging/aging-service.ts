import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { ArAgingInvoice, ArAgingSummary, ResponseResult } from './aging/aging-model';
import { environment } from 'environments/environment';


@Injectable({ providedIn: 'root' })
export class ArAgingService {
    private url = environment.apiUrl
    private baseUrl = '/ArAging';

    constructor(private http: HttpClient) { }

    getSummary(fromDate: string, toDate: string): Observable<ResponseResult<ArAgingSummary[]>> {
        const params = new HttpParams()
            .set('fromDate', fromDate)
            .set('toDate', toDate);

        return this.http.get<ResponseResult<ArAgingSummary[]>>(
            `${this.url +this.baseUrl}/summary`,
            { params }
        );
    }

    getCustomerInvoices(
        customerId: number,
        fromDate: string,
        toDate: string
    ): Observable<ResponseResult<ArAgingInvoice[]>> {
        const params = new HttpParams()
            .set('fromDate', fromDate)
            .set('toDate', toDate);

        return this.http.get<ResponseResult<ArAgingInvoice[]>>(
            `${this.url +this.baseUrl}/detail/${customerId}`,
            { params }
        );
    }
}
