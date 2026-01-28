import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from 'environments/environment';
import { PurchaseAlertAPIUrls } from 'Urls/PurchaseAlertAPIUrls ';


@Injectable({
  providedIn: 'root'
})
export class PurchaseAlertService {

  private url = environment.apiUrl; // Example: https://localhost:7280/api

  constructor(private http: HttpClient) { }

  // GET unread alerts
  getUnread(): Observable<any> {
    return this.http.get(`${this.url}${PurchaseAlertAPIUrls.GetUnread}`);
  }

  // POST mark one as read
  markRead(id: number): Observable<any> {
    return this.http.post(`${this.url}${PurchaseAlertAPIUrls.MarkRead}${id}/read`, {});
  }

  // POST mark all read
  markAll(): Observable<any> {
    return this.http.post(`${this.url}${PurchaseAlertAPIUrls.MarkAll}`, {});
  }
}
