import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { environment } from 'environments/environment';
import { Observable } from 'rxjs';
import { CurrencyAPIUrls } from 'Urls/CurrencyAPIUrls';

@Injectable({
  providedIn: 'root'
})
export class CurrencyService {
 private url = environment.apiUrl;

  constructor(private http: HttpClient) {}

  getAllCurrency(): Observable<any> {
    return this.http.get<any[]>(this.url + CurrencyAPIUrls.GetAllCurrency);
  }

  createCurrency(data: any): Observable<any> {
    return this.http.post(this.url + CurrencyAPIUrls.CreateCurrency, data);
  }

  updateCurrency(id: number, data: any): Observable<any> {
    return this.http.put(`${this.url + CurrencyAPIUrls.UpdateCurrency}${id}`, data);
  }

  deleteCurrency(id: number): Observable<any> {
    return this.http.delete(`${this.url + CurrencyAPIUrls.DeleteCurrency}${id}`);
  }

  getByIdCurrency(id: number): Observable<any> {
    return this.http.get(`${this.url + CurrencyAPIUrls.GetCurrencyById}${id}`);
  }
}
