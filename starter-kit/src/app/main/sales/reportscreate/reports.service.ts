import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { environment } from 'environments/environment';
import { Observable } from 'rxjs';
import { SalesReportApiUrls } from 'Urls/SalesReportApiUrls';

@Injectable({
  providedIn: 'root'
})
export class ReportsService {
 private url = environment.apiUrl;
  constructor(private http: HttpClient) { }


    GetSalesByItemAsync(): Observable<any> {
      return this.http.get<any[]>(this.url + SalesReportApiUrls.GetSalesByItemAsync);
    }

     GetSalesMarginAsync(): Observable<any> {
      return this.http.get<any[]>(this.url + SalesReportApiUrls.GetSalesMarginAsync);
    }
  
  
}
