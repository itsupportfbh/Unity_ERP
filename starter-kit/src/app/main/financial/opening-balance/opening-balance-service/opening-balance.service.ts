import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { environment } from 'environments/environment';
import { Observable } from 'rxjs';
import { OpeningBalanceApiUrls } from 'Urls/OpeningBalanceApiUrls';

@Injectable({
  providedIn: 'root'
})
export class OpeningBalanceService {

  private url = environment.apiUrl;
   constructor(private http: HttpClient) { }
 
 
      getOpeningBalance(): Observable<any[]> {
       return this.http.get<any[]>(this.url +OpeningBalanceApiUrls.GetAllOpeningBalance);
     }
   
     getOpeningBalanceById(id:any): Observable<any[]> {
       return this.http.get<any[]>(this.url +OpeningBalanceApiUrls.GetOpeningBalancebyID+ id);
     }
   
     insertOpeningBalance(data: any): Observable<any> {
     return this.http.post<any>(this.url + OpeningBalanceApiUrls.CreateOpeningBalance, data);
     }
   
     updateOpeningBalance(data: any): Observable<any> {
     return this.http.put<any>(this.url + OpeningBalanceApiUrls.UpdateOpeningBalance, data);
     }
   
     deleteOpeningBalance(id:any){
        return this.http.delete<any>(this.url + OpeningBalanceApiUrls.DeleteOpeningBalance + id );
     }
}
