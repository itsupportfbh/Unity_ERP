import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { environment } from 'environments/environment';
import { Observable } from 'rxjs';
import { DriverAPIUrls } from 'Urls/DriverApiUrls';


@Injectable({
  providedIn: 'root'
})
export class DriverService {

  private url = environment.apiUrl;
  
  constructor(private http: HttpClient) {}

  getAllDriver(): Observable<any> {
    return this.http.get<any[]>(this.url + DriverAPIUrls.GetAllDriver);
  }

  createDriver(data: any): Observable<any> {
    return this.http.post(this.url + DriverAPIUrls.CreateDriver, data);
  }

  updateDriver(id: number, data: any): Observable<any> {
    return this.http.put(`${this.url + DriverAPIUrls.UpdateDriver}${id}`, data);
  }

  deleteDriver(id: number): Observable<any> {
    return this.http.delete(`${this.url + DriverAPIUrls.DeleteDriver}${id}`);
  }

  getDriverById(id: number): Observable<any> {
    return this.http.get(`${this.url + DriverAPIUrls.GetDriverById}${id}`);
  }

}
