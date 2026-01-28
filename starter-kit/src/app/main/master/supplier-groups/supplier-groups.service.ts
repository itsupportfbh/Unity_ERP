import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { environment } from 'environments/environment';
import { Observable } from 'rxjs';
import { SupplierGroupsApiUrls } from 'Urls/SupplierGroupsApiUrls';

@Injectable({
  providedIn: 'root'
})
export class SupplierGroupsService {

  private url = environment.apiUrl;
   constructor(private http: HttpClient) { }
 
 
 
        getSupplier(): Observable<any[]> {
         return this.http.get<any[]>(this.url +SupplierGroupsApiUrls.getAllSupplierGroups);
       }
     
       getSupplierById(id:any): Observable<any[]> {
         return this.http.get<any[]>(this.url +SupplierGroupsApiUrls.getbyIdSupplierGroups+ id);
       }
     
       insertSupplier(data: any): Observable<any> {
       return this.http.post<any>(this.url + SupplierGroupsApiUrls.CreateSupplierGroups, data);
       }
     
       updateSupplier(data: any): Observable<any> {
       return this.http.put<any>(this.url + SupplierGroupsApiUrls.updateSupplierGroups, data);
       }
     
       deleteSupplier(id:any){
          return this.http.delete<any>(this.url + SupplierGroupsApiUrls.DeleteSupplierGroups + id );
       }
}
