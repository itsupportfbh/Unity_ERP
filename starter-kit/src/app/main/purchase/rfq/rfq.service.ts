import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { environment } from 'environments/environment';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class RfqService {
  private readonly url = environment.apiUrl;

  constructor(private http: HttpClient) { }

  getAll(): Observable<any> {
    return this.http.get(`${this.url}/Rfq/GetAll`);
  }

  create(payload: any): Observable<any> {
    return this.http.post(`${this.url}/Rfq/Create`, payload);
  }

  update(id: number, payload: any): Observable<any> {
    return this.http.put(`${this.url}/Rfq/Update/${id}`, payload);
  }

  send(payload: any): Observable<any> {
    return this.http.post(`${this.url}/Rfq/Send`, payload);
  }

  delete(id: number): Observable<any> {
    return this.http.delete(`${this.url}/Rfq/Delete/${id}`);
  }
}
