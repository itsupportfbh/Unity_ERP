import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { environment } from 'environments/environment';
import { Observable } from 'rxjs';
import { ItemSetAPIUrls } from 'Urls/ItemSetApiUrls';

@Injectable({
  providedIn: 'root'
})
export class ItemsetService {

 private url = environment.apiUrl;
   
     constructor(private http: HttpClient) {}
   
     getAllItemSet(): Observable<any> {
       return this.http.get<any[]>(this.url + ItemSetAPIUrls.GetAllItemSet);
     }
   
     createItemSet(data: any): Observable<any> {
       return this.http.post(this.url + ItemSetAPIUrls.CreateItemSet, data);
     }
   
     updateItemSet(id: number, data: any): Observable<any> {
       return this.http.put(`${this.url + ItemSetAPIUrls.UpdateItemSet}${id}`, data);
     }
   
     deleteItemSet(id: number): Observable<any> {
       return this.http.delete(`${this.url + ItemSetAPIUrls.DeleteItemSet}${id}`);
     }
   
     getByIdItemSet(id: number): Observable<any> {
       return this.http.get(`${this.url + ItemSetAPIUrls.GetItemSetById}${id}`);
     }
 
}
