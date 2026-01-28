import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { environment } from 'environments/environment';
import { Observable } from 'rxjs';
import { BankAPIUrls } from 'Urls/BankApiUrls';

@Injectable({
  providedIn: 'root'
})
export class BankService {

 private url = environment.apiUrl;
   
     constructor(private http: HttpClient) {}
   
     getAllBank(): Observable<any> {
       return this.http.get<any[]>(this.url + BankAPIUrls.GetAllBank);
     }
   
     createBank(data: any): Observable<any> {
       return this.http.post(this.url + BankAPIUrls.CreateBank, data);
     }
   
     updateBank(id: number, data: any): Observable<any> {
       return this.http.put(`${this.url + BankAPIUrls.UpdateBank}${id}`, data);
     }
   
     deleteBank(id: number): Observable<any> {
       return this.http.delete(`${this.url + BankAPIUrls.DeleteBank}${id}`);
     }
   
     getByIdBank(id: number): Observable<any> {
       return this.http.get(`${this.url + BankAPIUrls.GetBankById}${id}`);
     }
}
