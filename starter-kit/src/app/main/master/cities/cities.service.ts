import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { environment } from 'environments/environment';
import { Observable } from 'rxjs';
import { CitiesApiUrls } from 'Urls/CitiesApiUrls';

@Injectable({
  providedIn: 'root'
})
export class CitiesService {
 private url = environment.apiUrl;
  constructor(private http: HttpClient) { }

    getCities(): Observable<any[]> {
        return this.http.get<any[]>(this.url +CitiesApiUrls.getAllCities);
      }
    
      getCitiesById(id:any): Observable<any[]> {
        return this.http.get<any[]>(this.url +CitiesApiUrls.getbyIdCities+ id);
      }
    
      insertCities(data: any): Observable<any> {
      return this.http.post<any>(this.url + CitiesApiUrls.CreateCities, data);
      }
    
      updateCities(data: any): Observable<any> {
      return this.http.put<any>(this.url + CitiesApiUrls.updateCities, data);
      }
    
      deleteCities(id:any){
         return this.http.delete<any>(this.url + CitiesApiUrls.DeleteCities + id );
      }

      GetStateWithCountryId(id:any): Observable<any[]> {
        return this.http.get<any[]>(this.url +CitiesApiUrls.GetStateWithCountryId+ id);
      }

       GetCityWithStateId(id:any): Observable<any[]> {
        return this.http.get<any[]>(this.url +CitiesApiUrls.GetCityWithStateId+ id);
      }
}
