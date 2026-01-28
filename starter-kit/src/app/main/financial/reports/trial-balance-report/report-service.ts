import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from 'environments/environment';

@Injectable({ providedIn: 'root' })

export class ReportsService {

    private url = environment.apiUrl
    private baseUrl = '/financereport';

    constructor(private http: HttpClient) { }

    getTrialBalance(filter: any): Observable<any> {
        return this.http.post(`${this.url + this.baseUrl}/trial-balance`, filter);
    }
    getTrialBalanceDetail(filter: any): Observable<any> {
        return this.http.post(`${this.url + this.baseUrl}/trial-balance-detail`, filter);
    }
    saveOpeningBalance(body: any) {
        return this.http.post<any>(`${this.url + this.baseUrl}/trial-balance/opening-balance`, body);
    }
}
