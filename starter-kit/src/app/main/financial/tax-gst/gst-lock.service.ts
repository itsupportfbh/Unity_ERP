import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from 'environments/environment';
import { Observable } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class GstLockService {
  private baseUrl = `${environment.apiUrl}/GstLock`;

  constructor(private http: HttpClient) {}

  check(docDate: string): Observable<any> {
    return this.http.get(`${this.baseUrl}/check`, {
      params: { docDate }
    });
  }
}