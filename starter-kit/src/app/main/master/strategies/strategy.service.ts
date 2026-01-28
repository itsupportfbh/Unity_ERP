import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { environment } from 'environments/environment';
import { BehaviorSubject, Observable } from 'rxjs';
import { StrategyApiUrls } from 'Urls/StrategyApiUrls';

@Injectable({
  providedIn: 'root'
})
export class StrategyService {
private url = environment.apiUrl
 private requestSource = new BehaviorSubject<any>(null);
  currentRequest = this.requestSource.asObservable();
  constructor(private http: HttpClient) { }

   getStrategy(): Observable<any[]> {
    return this.http.get<any[]>(this.url +StrategyApiUrls.GetAllStrategy);
  }

  getStrategyById(id:any): Observable<any[]> {
    return this.http.get<any[]>(this.url +StrategyApiUrls.GetStrategyById+ id);
  }

  insertStrategy(data: any): Observable<any> {
  return this.http.post<any>(this.url + StrategyApiUrls.CreateStrategy, data);
  }

  updateStrategy(data: any): Observable<any> {
  return this.http.put<any>(this.url + StrategyApiUrls.UpdateStrategy, data);
  }

  deleteStrategy(id:any){
     return this.http.delete<any>(this.url + StrategyApiUrls.DeleteStrategy + id );
  }

}
