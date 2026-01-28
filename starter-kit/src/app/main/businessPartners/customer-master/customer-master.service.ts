import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { environment } from 'environments/environment';
import { Observable } from 'rxjs';
import { CustomerMasterApiUrls } from 'Urls/CustomerMasterApiUrls';

@Injectable({
  providedIn: 'root'
})
export class CustomerMasterService {

  private url = environment.apiUrl;
  constructor(private http: HttpClient) { }

  GetAllCustomerDetails(): Observable<any[]> {
    return this.http.get<any[]>(this.url + CustomerMasterApiUrls.GetAllCustomerDetails);
  }

  insertCustomer(data: any): Observable<any> {
    return this.http.post<any>(this.url + CustomerMasterApiUrls.CreateCustomerMaster, data);
  }

  EditLoadforCustomerbyId(id: any): Observable<any[]> {
    return this.http.get<any[]>(this.url + CustomerMasterApiUrls.EditLoadforCustomerbyId + id);
  }

updateCustomer(data: FormData): Observable<any> {
  return this.http.put(`${this.url + CustomerMasterApiUrls.UpdateCustomerMasterById}`, data);
}

  deleteCustomer(customerId: number, kycId?: number | null): Observable<any> {
    const base = this.url + CustomerMasterApiUrls.DeactivateCustomer + '/' + customerId;
    const finalUrl = (kycId ? `${base}/${kycId}` : base);
    return this.http.delete<any>(finalUrl);
  }
 getAllCustomerMaster(): Observable<any[]> {
      return this.http.get<any>(this.url + CustomerMasterApiUrls.GetAllCustomerMaster)
    }
}
