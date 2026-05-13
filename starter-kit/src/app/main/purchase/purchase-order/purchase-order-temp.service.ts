import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { environment } from 'environments/environment';
import { BehaviorSubject, Observable } from 'rxjs';
import { POTempApiUrls } from 'Urls/POTempApiUrls';

@Injectable({
  providedIn: 'root'
})
export class POTempService {
  private url = environment.apiUrl;

  private requestSource = new BehaviorSubject<any>(null);
  currentRequest = this.requestSource.asObservable();

  constructor(private http: HttpClient) {}

  getPODrafts(createdBy?: number): Observable<any> {
    let params = new HttpParams();

    if (createdBy !== undefined && createdBy !== null) {
      params = params.set('createdBy', createdBy.toString());
    }

    return this.http.get<any>(this.url + POTempApiUrls.GetAll, { params });
  }

  getPODraftById(id: number): Observable<any> {
    return this.http.get<any>(this.url + POTempApiUrls.GetById + id);
  }

  createPODraft(data: any): Observable<any> {
    const payload = this.cleanPOTempPayload(data);
    return this.http.post<any>(this.url + POTempApiUrls.Create, payload);
  }

  updatePODraft(id: number, data: any): Observable<any> {
    const payload = this.cleanPOTempPayload(data);
    const url = `${this.url}${POTempApiUrls.Update}/${id}`;
    return this.http.put<any>(url, payload);
  }

  deletePODraft(id: number): Observable<any> {
    return this.http.delete<any>(this.url + POTempApiUrls.Delete + id);
  }

  promotePODraft(id: number, userId?: string): Observable<any> {
    const body = JSON.stringify(userId || 'system');

    return this.http.post<any>(
      this.url + POTempApiUrls.Promote + id,
      body,
      {
        headers: {
          'Content-Type': 'application/json'
        }
      }
    );
  }

  private cleanPOTempPayload(data: any): any {
    const payload = { ...(data || {}) };

    delete payload.approveLevelId;
    delete payload.ApproveLevelId;
    delete payload.approveLevelName;
    delete payload.ApproveLevelName;

    return payload;
  }
}