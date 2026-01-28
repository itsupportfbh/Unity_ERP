import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { environment } from 'environments/environment';
import { BehaviorSubject, Observable } from 'rxjs';
import { RecurringApiUrls } from 'Urls/RecurringApiUrls';

@Injectable({
  providedIn: 'root'
})
export class RecurringService {
  private url = environment.apiUrl
  private requestSource = new BehaviorSubject<any>(null);
  currentRequest = this.requestSource.asObservable();
  constructor(private http: HttpClient) { }

  getRecurring(): Observable<any[]> {
    return this.http.get<any[]>(this.url +RecurringApiUrls.GetAllRecurring);
  }

  getRecurringById(id:any): Observable<any[]> {
    return this.http.get<any[]>(this.url +RecurringApiUrls.GetRecurringById+ id);
  }

  insertRecurring(data: any): Observable<any> {
  return this.http.post<any>(this.url + RecurringApiUrls.CreateRecurring, data);
  }

  updateRecurring(data: any): Observable<any> {
  return this.http.put<any>(this.url + RecurringApiUrls.UpdateRecurring, data);
  }

  deleteRecurring(id:any){
     return this.http.delete<any>(this.url + RecurringApiUrls.DeleteRecurring+ id );
  }

}
