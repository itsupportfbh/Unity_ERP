import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { environment } from 'environments/environment';
import { BehaviorSubject, Observable } from 'rxjs';
import { PurchaseAPIUrls } from 'Urls/PurchaseAPIUrls';

@Injectable({
  providedIn: 'root'
})
export class PurchaseService {
 private url = environment.apiUrl
 private requestSource = new BehaviorSubject<any>(null);
 currentRequest = this.requestSource.asObservable();
 constructor(private http: HttpClient) { }
   getAll(): Observable<any> {
    return this.http.get<any[]>(this.url + PurchaseAPIUrls.GetAllPurchaseRequests);
  }

  // POST
  create(data: any): Observable<any> {
    return this.http.post(this.url+PurchaseAPIUrls.CreatePurchaseRequest, data);
  }

  // PUT
update(id: number, data: any): Observable<any> {
  return this.http.put(`${this.url + PurchaseAPIUrls.UpdatePurchaseRequest}${id}`, data);
}

  // DELETE
  delete(id: number): Observable<any> {
    return this.http.delete(`${this.url + PurchaseAPIUrls.DeletePurchaseRequest}${id}`);
  }
  GetPurchaseById(id: number): Observable<any> {
    return this.http.get(`${this.url + PurchaseAPIUrls.GetPurchaseRequestById}${id}`);
  }
  setRequest(request: any) {
    this.requestSource.next(request);
  }

   GetAvailablePurchaseRequests(): Observable<any> {
    return this.http.get(this.url + PurchaseAPIUrls.GetAvailablePurchaseRequests);
  }
  
}
