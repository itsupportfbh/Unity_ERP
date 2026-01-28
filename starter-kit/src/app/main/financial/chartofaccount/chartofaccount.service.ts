import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { environment } from 'environments/environment';
import { Observable } from 'rxjs';
import { ChartOfAccountAPIUrls } from 'Urls/ChartOfAccountAPIUrls';

@Injectable({
  providedIn: 'root'
})
export class ChartofaccountService {
 private url = environment.apiUrl;

  constructor(private http: HttpClient) {}

  getAllChartOfAccount(): Observable<any> {
    return this.http.get<any[]>(this.url + ChartOfAccountAPIUrls.GetAllChartOfAccount);
  }

  createChartOfAccount(data: any): Observable<any> {
    return this.http.post(this.url + ChartOfAccountAPIUrls.CreateChartOfAccount, data);
  }

  updateChartOfAccount(id: number, data: any): Observable<any> {
    return this.http.put(`${this.url + ChartOfAccountAPIUrls.UpdateChartOfAccount}${id}`, data);
  }

  deleteChartOfAccount(id: number): Observable<any> {
    return this.http.delete(`${this.url + ChartOfAccountAPIUrls.DeleteChartOfAccount}${id}`);
  }

  getByIdChartOfAccount(id: number): Observable<any> {
    return this.http.get(`${this.url + ChartOfAccountAPIUrls.GetChartOfAccountById}${id}`);
  }
}
