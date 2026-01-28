import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { environment } from 'environments/environment';
import { Observable } from 'rxjs';
import { IncotermsAPIUrls } from 'Urls/IncotermsAPIUrls';

@Injectable({
  providedIn: 'root'
})
export class IncotermsService {
  private url = environment.apiUrl;

  constructor(private http: HttpClient) {}

  getAllIncoterms(): Observable<any> {
    return this.http.get<any[]>(this.url + IncotermsAPIUrls.GetAllIncoterms);
  }

  createIncoterms(data: any): Observable<any> {
    return this.http.post(this.url + IncotermsAPIUrls.CreateIncoterms, data);
  }

  updateIncoterms(id: number, data: any): Observable<any> {
    return this.http.put(`${this.url + IncotermsAPIUrls.UpdateIncoterms}${id}`, data);
  }

  deleteIncoterms(id: number): Observable<any> {
    return this.http.delete(`${this.url + IncotermsAPIUrls.DeleteIncoterms}${id}`);
  }

  getByIdIncoterms(id: number): Observable<any> {
    return this.http.get(`${this.url + IncotermsAPIUrls.GetIncotermsById}${id}`);
  }
}
