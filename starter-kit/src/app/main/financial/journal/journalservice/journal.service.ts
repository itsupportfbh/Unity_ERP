import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { environment } from 'environments/environment';
import { Observable } from 'rxjs';
import { ApprovalLevelAPIUrls } from 'Urls/ApprovalLevelAPIUrls';
import { JournalsAPiUrls } from 'Urls/JournalsApiUrls';

@Injectable({
  providedIn: 'root'
})
export class JournalService {
private url = environment.apiUrl
  constructor(private http : HttpClient) { }
  GetAllJournals(): Observable<any> {
    return this.http.get<any[]>(this.url + JournalsAPiUrls.GetAllJournals);
  }

   create(data: any): Observable<any> {
     return this.http.post(this.url + JournalsAPiUrls.CreateJournal, data);
   }
 
     GetAllRecurring(): Observable<any> {
    return this.http.get<any>(this.url + JournalsAPiUrls.GetAllRecurring);
  }

  postBatch(ids: number[]) {
    return this.http.post<any>(this.url+JournalsAPiUrls.postBatch, { ids });
  }
}
