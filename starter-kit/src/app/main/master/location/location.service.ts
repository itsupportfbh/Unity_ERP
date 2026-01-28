import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { environment } from 'environments/environment';
import { Observable } from 'rxjs';
import { LocationApiUrls } from 'Urls/LocationApiUrls';

@Injectable({
  providedIn: 'root'
})
export class LocationService {

  private url = environment.apiUrl;
  constructor(private http: HttpClient) { }
  getLocation(): Observable<any[]> {
    return this.http.get<any[]>(this.url + LocationApiUrls.GetAllLocation);
  }

   getLocationDetails(): Observable<any[]> {
    return this.http.get<any[]>(this.url + LocationApiUrls.GetAllLocationDetails);
  }

  getLocationById(id: any): Observable<any[]> {
    return this.http.get<any[]>(this.url + LocationApiUrls.GetLocationbyID + id);
  }

  insertLocation(data: any): Observable<any> {
    return this.http.post<any>(this.url + LocationApiUrls.CreateLocation, data);
  }

  updateLocation(data: any): Observable<any> {
    return this.http.put<any>(this.url + LocationApiUrls.UpdateLocation, data);
  }

  deleteLocation(id: any) {
    return this.http.delete<any>(this.url + LocationApiUrls.DeleteLocation + id);
  }

  getLocationByCountryId(Countryid: any): Observable<any[]> {
    return this.http.get<any[]>(this.url + LocationApiUrls.getLocationByCountryId + Countryid);
  }
}
