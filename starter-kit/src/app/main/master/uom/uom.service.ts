import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { environment } from 'environments/environment';
import { Observable } from 'rxjs';
import { UomAPIUrls } from 'Urls/UomAPIUrls';

@Injectable({
  providedIn: 'root'
})
export class UomService {
  private url = environment.apiUrl;

  constructor(private http: HttpClient) {}

  getAllUom(): Observable<any> {
    return this.http.get<any[]>(this.url + UomAPIUrls.GetAlluom);
  }

  createUom(data: any): Observable<any> {
    return this.http.post(this.url + UomAPIUrls.Createuom, data);
  }

  updateUom(id: number, data: any): Observable<any> {
    return this.http.put(`${this.url + UomAPIUrls.Updateuom}${id}`, data);
  }

  deleteUom(id: number): Observable<any> {
    return this.http.delete(`${this.url + UomAPIUrls.Deleteuom}${id}`);
  }

  getByIdUom(id: number): Observable<any> {
    return this.http.get(`${this.url + UomAPIUrls.GetuomById}${id}`);
  }
}
