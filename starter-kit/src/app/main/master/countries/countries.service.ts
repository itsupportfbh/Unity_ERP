import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { environment } from 'environments/environment';
import { BehaviorSubject, Observable } from 'rxjs';
import { CountriesApiUrls } from 'Urls/CountriesApiUrls';

@Injectable({
  providedIn: 'root'
})
export class CountriesService {
private url = environment.apiUrl
 private requestSource = new BehaviorSubject<any>(null);
  currentRequest = this.requestSource.asObservable();
  constructor(private http: HttpClient) { }

   getCountry(): Observable<any[]> {
    return this.http.get<any[]>(this.url +CountriesApiUrls.GetAllCountries);
  }

  getCountryById(id:any): Observable<any[]> {
    return this.http.get<any[]>(this.url +CountriesApiUrls.GetCountriesById+ id);
  }

  insertCountry(data: any): Observable<any> {
  return this.http.post<any>(this.url + CountriesApiUrls.CreateCountry, data);
  }

  updateCountry(data: any): Observable<any> {
  return this.http.put<any>(this.url + CountriesApiUrls.UpdateCountry, data);
  }

  deleteCountry(id:any){
     return this.http.delete<any>(this.url + CountriesApiUrls.DeleteCountry + id );
  }

}
