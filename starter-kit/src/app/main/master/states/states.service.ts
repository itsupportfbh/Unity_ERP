import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { environment } from 'environments/environment';
import { Observable } from 'rxjs';
import { StateApiUrls } from 'Urls/StateApiUrls';

@Injectable({
  providedIn: 'root'
})
export class StatesService {
 private url = environment.apiUrl;
  constructor(private http: HttpClient) { }


     getState(): Observable<any[]> {
      return this.http.get<any[]>(this.url +StateApiUrls.GetAllState);
    }
  
    getStateById(id:any): Observable<any[]> {
      return this.http.get<any[]>(this.url +StateApiUrls.GetStatebyID+ id);
    }
  
    insertState(data: any): Observable<any> {
    return this.http.post<any>(this.url + StateApiUrls.CreateState, data);
    }
  
    updateState(data: any): Observable<any> {
    return this.http.put<any>(this.url + StateApiUrls.UpdateState, data);
    }
  
    deleteState(id:any){
       return this.http.delete<any>(this.url + StateApiUrls.DeleteState + id );
    }
}
