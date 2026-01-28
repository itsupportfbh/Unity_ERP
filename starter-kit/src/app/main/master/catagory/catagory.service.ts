import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { environment } from 'environments/environment';
import { Observable } from 'rxjs';
import { CatagoryAPIUrls } from 'Urls/CatagoryAPIUrls';

@Injectable({
  providedIn: 'root'
})
export class CatagoryService {

   private url = environment.apiUrl;
 
   constructor(private http: HttpClient) {}
 
   getAllCatagory(): Observable<any> {
     return this.http.get<any[]>(this.url + CatagoryAPIUrls.GetAllCatagory);
   }
 
   createCatagory(data: any): Observable<any> {
     return this.http.post(this.url + CatagoryAPIUrls.CreateCatagory, data);
   }
 
   updateCatagory(id: number, data: any): Observable<any> {
     return this.http.put(`${this.url + CatagoryAPIUrls.UpdateCatagory}${id}`, data);
   }
 
   deleteCatagory(id: number): Observable<any> {
     return this.http.delete(`${this.url + CatagoryAPIUrls.DeleteCatagory}${id}`);
   }
 
   getByIdCatagory(id: number): Observable<any> {
     return this.http.get(`${this.url + CatagoryAPIUrls.GetCatagoryById}${id}`);
   }
}
