import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { environment } from 'environments/environment';
import { Observable } from 'rxjs';
import { CostingMethodAPIUrls } from 'Urls/CoastingMethodApiUrls';

@Injectable({
  providedIn: 'root'
})
export class CoastingMethodService {
  private url = environment.apiUrl;
 
   constructor(private http: HttpClient) {}
 
   getAllCoastingMethod(): Observable<any> {
     return this.http.get<any[]>(this.url + CostingMethodAPIUrls.GetAllcostingMethod);
   }
 
   createCoastingMethod(data: any): Observable<any> {
     return this.http.post(this.url + CostingMethodAPIUrls.CreatecostingMethod, data);
   }
 
   updateCoastingMethod(id: number, data: any): Observable<any> {
     return this.http.put(`${this.url + CostingMethodAPIUrls.UpdatecostingMethod}${id}`, data);
   }
 
   deleteCoastingMethod(id: number): Observable<any> {
     return this.http.delete(`${this.url + CostingMethodAPIUrls.DeletecostingMethod}${id}`);
   }
 
   getByIdCoastingMethod(id: number): Observable<any> {
     return this.http.get(`${this.url + CostingMethodAPIUrls.GetAllcostingMethod}${id}`);
   }
}
