import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { environment } from 'environments/environment';
import { Observable } from 'rxjs';
import { FinanceReportApiUrls } from 'Urls/FinanceReportAPIUrls';

@Injectable({
  providedIn: 'root'
})
export class ProfitlossService {

  private url = environment.apiUrl;
  
    constructor(private http: HttpClient) {}
  
    GetProfitLossDetails(): Observable<any> {
      return this.http.get<any[]>(this.url + FinanceReportApiUrls.GetProfitLossDetails);
    }
  
}
