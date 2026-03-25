import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { environment } from 'environments/environment';
import { Observable } from 'rxjs';
import { UomConversionAPIUrls } from 'Urls/UomConversionAPIUrls';


@Injectable({
  providedIn: 'root'
})
export class UomConversionService {
  private url = environment.apiUrl;

  constructor(private http: HttpClient) {}

  getAll(): Observable<any> {
    return this.http.get<any>(this.url + UomConversionAPIUrls.GetAll);
  }

  getById(id: number): Observable<any> {
    return this.http.get<any>(`${this.url + UomConversionAPIUrls.GetById}${id}`);
  }

  create(data: any): Observable<any> {
    return this.http.post<any>(this.url + UomConversionAPIUrls.Create, data);
  }

  update(id: number, data: any): Observable<any> {
    return this.http.put<any>(`${this.url + UomConversionAPIUrls.Update}${id}`, data);
  }

  delete(id: number): Observable<any> {
    return this.http.delete<any>(`${this.url + UomConversionAPIUrls.Delete}${id}`);
  }
}