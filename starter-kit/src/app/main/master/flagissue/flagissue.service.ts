import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { environment } from 'environments/environment';
import { Observable } from 'rxjs';
import { FlagIssueAPIUrls } from 'Urls/FlagIssueAPIUrls';

@Injectable({
  providedIn: 'root'
})
export class FlagissueService {
 private url = environment.apiUrl;

  constructor(private http: HttpClient) {}

  getAllFlagIssue(): Observable<any> {
    return this.http.get<any[]>(this.url + FlagIssueAPIUrls.GetAllFlagIssue);
  }

  createFlagIssue(data: any): Observable<any> {
    return this.http.post(this.url + FlagIssueAPIUrls.CreateFlagIssue, data);
  }

  updateFlagIssue(id: number, data: any): Observable<any> {
    return this.http.put(`${this.url + FlagIssueAPIUrls.UpdateFlagIssue}${id}`, data);
  }

  deleteFlagIssue(id: number): Observable<any> {
    return this.http.delete(`${this.url + FlagIssueAPIUrls.DeleteFlagIssue}${id}`);
  }

  getByIdFlagIssue(id: number): Observable<any> {
    return this.http.get(`${this.url + FlagIssueAPIUrls.GetFlagIssueById}${id}`);
  }
}
