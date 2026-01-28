import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { environment } from 'environments/environment';
import { BehaviorSubject, Observable } from 'rxjs';
import { TaxCodeApiUrls } from 'Urls/TaxCodeApiUrls';

@Injectable({
  providedIn: 'root'
})
export class TaxCodeService {
  private url = environment.apiUrl
  private requestSource = new BehaviorSubject<any>(null);
  currentRequest = this.requestSource.asObservable();
  constructor(private http: HttpClient) { }

  getTaxCode(): Observable<any[]> {
    return this.http.get<any[]>(this.url +TaxCodeApiUrls.GetAllTaxCode);
  }

  getTaxCodeById(id:any): Observable<any[]> {
    return this.http.get<any[]>(this.url +TaxCodeApiUrls.GetTaxCodeById+ id);
  }

  insertTaxCode(data: any): Observable<any> {
  return this.http.post<any>(this.url + TaxCodeApiUrls.CreateTaxCode, data);
  }

  updateTaxCode(data: any): Observable<any> {
  return this.http.put<any>(this.url + TaxCodeApiUrls.UpdateTaxCode, data);
  }

  deleteTaxCode(id:any){
     return this.http.delete<any>(this.url + TaxCodeApiUrls.DeleteTaxCode+ id );
  }

}
