import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { environment } from 'environments/environment';
import { Observable } from 'rxjs';
import { CustomerGroupsApiUrls } from 'Urls/CustomerGroupsApiUrls';

@Injectable({
  providedIn: 'root'
})
export class CustomerGroupsService {

  private url = environment.apiUrl;
   constructor(private http: HttpClient) { }
 
 
 
        getCustomer(): Observable<any[]> {
         return this.http.get<any[]>(this.url +CustomerGroupsApiUrls.getAllCustomerGroups);
       }
     
       getCustomerById(id:any): Observable<any[]> {
         return this.http.get<any[]>(this.url +CustomerGroupsApiUrls.getbyIdCustomerGroups+ id);
       }
     
       insertCustomer(data: any): Observable<any> {
       return this.http.post<any>(this.url + CustomerGroupsApiUrls.CreateCustomerGroups, data);
       }
     
       updateCustomer(data: any): Observable<any> {
       return this.http.put<any>(this.url + CustomerGroupsApiUrls.updateCustomerGroups, data);
       }
     
       deleteCustomer(id:any){
          return this.http.delete<any>(this.url + CustomerGroupsApiUrls.DeleteCustomerGroups + id );
       }
}
