import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { environment } from 'environments/environment';
import { Observable } from 'rxjs';
import { ServiceApiUrls } from 'Urls/ServiceApiUrls';

@Injectable({
  providedIn: 'root'
})
export class ServiceService {
 private url = environment.apiUrl;
  constructor(private http: HttpClient) { }



       getService(): Observable<any[]> {
        return this.http.get<any[]>(this.url +ServiceApiUrls.GetAllService);
      }
    
      getServiceById(id:any): Observable<any[]> {
        return this.http.get<any[]>(this.url +ServiceApiUrls.GetServicebyID+ id);
      }
    
      insertService(data: any): Observable<any> {
      return this.http.post<any>(this.url + ServiceApiUrls.CreateService, data);
      }
    
      updateService(data: any): Observable<any> {
      return this.http.put<any>(this.url + ServiceApiUrls.UpdateService, data);
      }
    
      deleteService(id:any){
         return this.http.delete<any>(this.url + ServiceApiUrls.DeleteService + id );
      }
}
