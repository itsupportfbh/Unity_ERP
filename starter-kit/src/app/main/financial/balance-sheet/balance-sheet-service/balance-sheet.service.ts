import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { environment } from 'environments/environment';
import { Observable } from 'rxjs';
import { FinanceReportApiUrls } from 'Urls/FinanceReportAPIUrls';

@Injectable({
  providedIn: 'root'
})
export class BalanceSheetService {

 private url = environment.apiUrl;
   
     constructor(private http: HttpClient) {}
   
     GetBalanceSheetDetails(): Observable<any> {
       return this.http.get<any[]>(this.url + FinanceReportApiUrls.GetBalanceSheetDetails);
     }
}
