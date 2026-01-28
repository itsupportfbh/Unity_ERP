import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { environment } from 'environments/environment';
import { BehaviorSubject, Observable } from 'rxjs';
import { POTempApiUrls } from 'Urls/POTempApiUrls';




@Injectable({
    providedIn: 'root'
})
export class POTempService {
    private url = environment.apiUrl
    private requestSource = new BehaviorSubject<any>(null);
    currentRequest = this.requestSource.asObservable();
    constructor(private http: HttpClient) { }

    getPODrafts(createdBy?: string): Observable<any> {
        let params = new HttpParams();
        if (createdBy) params = params.set('createdBy', createdBy);
        return this.http.get<any>(this.url + POTempApiUrls.GetAll, { params });
    }
    getPODraftById(id: number): Observable<any> {
        return this.http.get<any>(this.url + POTempApiUrls.GetById + id);
    }
    createPODraft(data: any): Observable<any> {
        return this.http.post<any>(this.url + POTempApiUrls.Create, data);
    }
    updatePODraft(id: number, data: any): Observable<any> {
          const url = `${this.url}${POTempApiUrls.Update}/${id}`;
       return this.http.put<any>(url, data);
    }
    deletePODraft(id: number): Observable<any> {
        return this.http.delete<any>(this.url + POTempApiUrls.Delete + id);
    }
    promotePODraft(id: number, userId?: string): Observable<any> {
        const body = JSON.stringify(userId);
        return this.http.post<any>(
            this.url + POTempApiUrls.Promote + id,
            body,
            { headers: { 'Content-Type': 'application/json' } }
        );
    }

}