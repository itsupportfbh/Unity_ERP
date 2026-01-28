import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { environment } from 'environments/environment';
import { Observable } from 'rxjs';
import { StockissueAPIUrls } from 'Urls/StockIssueAPIUrls';

@Injectable({
  providedIn: 'root'
})
export class StockIssueService {

 private url = environment.apiUrl;
 
   constructor(private http: HttpClient) {}
 
   getAllStockissue(): Observable<any> {
     return this.http.get<any[]>(this.url + StockissueAPIUrls.GetAllStockissue);
   }
 
   createStockissue(data: any): Observable<any> {
     return this.http.post(this.url + StockissueAPIUrls.CreateStockissue, data);
   }
 
   updateStockissue(id: number, data: any): Observable<any> {
     return this.http.put(`${this.url + StockissueAPIUrls.UpdateStockissue}${id}`, data);
   }
 
   deleteStockissue(id: number): Observable<any> {
     return this.http.delete(`${this.url + StockissueAPIUrls.DeleteStockissue}${id}`);
   }
 
   getByIdStockissue(id: number): Observable<any> {
     return this.http.get(`${this.url + StockissueAPIUrls.GetStockissueById}${id}`);
   }
}
