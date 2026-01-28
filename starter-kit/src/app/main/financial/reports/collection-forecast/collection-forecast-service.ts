import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from 'environments/environment';

@Injectable({ providedIn: 'root' })

export class ArCollectionForecastService {

    private url = environment.apiUrl
    private baseUrl = '/ArCollectionForecast';

    constructor(private http: HttpClient) { }

    getSummary(fromDate?: string | null, toDate?: string | null) {
    const params: any = {};
    if (fromDate) { params.fromDate = fromDate; }
    if (toDate)   { params.toDate   = toDate; }

    return this.http.get<any>(`${this.url + this.baseUrl}/summary`, { params });
  }

  getDetail(customerId: number, fromDate?: string | null, toDate?: string | null) {
    const params: any = {};
    if (fromDate) { params.fromDate = fromDate; }
    if (toDate)   { params.toDate   = toDate; }

    return this.http.get<any>(
      `${this.url + this.baseUrl}/detail/${customerId}`,
      { params }
    );
  }
}
