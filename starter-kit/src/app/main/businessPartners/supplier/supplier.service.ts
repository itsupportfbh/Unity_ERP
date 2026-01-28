import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { environment } from 'environments/environment';
import { Observable } from 'rxjs';
import { SupplierApiUrls } from 'Urls/SuppliersApiUrls';

@Injectable({
  providedIn: 'root'
})
export class SupplierService {

   private url = environment.apiUrl;
    constructor(private http: HttpClient) { }
    GetAllSupplier(): Observable<any[]> {
      return this.http.get<any[]>(this.url + SupplierApiUrls.GetAllSupplier);
    }
  
     getSupplierDetails(): Observable<any[]> {
      return this.http.get<any[]>(this.url + SupplierApiUrls.GetAllSupplierDetails);
    }
  
    getSupplierById(id: any): Observable<any[]> {
      return this.http.get<any[]>(this.url + SupplierApiUrls.GetSupplierbyID + id);
    }
  
    insertSupplier(data: any): Observable<any> {
      return this.http.post<any>(this.url + SupplierApiUrls.CreateSupplier, data);
    }
  
    updateSupplier(data: any): Observable<any> {
      return this.http.put<any>(this.url + SupplierApiUrls.UpdateSupplier, data);
    }
  
    deleteSupplier(id: any) {
      return this.http.delete<any>(this.url + SupplierApiUrls.DeleteSupplier + id);
    }

    
}
