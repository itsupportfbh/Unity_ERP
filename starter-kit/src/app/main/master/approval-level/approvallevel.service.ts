import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { environment } from 'environments/environment';
import { Observable } from 'rxjs';
import { ApprovalLevelAPIUrls } from 'Urls/ApprovalLevelAPIUrls';

@Injectable({
  providedIn: 'root'
})
export class ApprovallevelService {
private url = environment.apiUrl;

  constructor(private http: HttpClient) {}

  getAllApprovalLevel(): Observable<any> {
    return this.http.get<any[]>(this.url + ApprovalLevelAPIUrls.GetAllApprovalLevel);
  }

  createApprovalLevel(data: any): Observable<any> {
    return this.http.post(this.url + ApprovalLevelAPIUrls.CreateApprovalLevel, data);
  }

  updateApprovalLevel(id: number, data: any): Observable<any> {
    return this.http.put(`${this.url + ApprovalLevelAPIUrls.UpdateApprovalLevel}${id}`, data);
  }

  deleteApprovalLevel(id: number): Observable<any> {
    return this.http.delete(`${this.url + ApprovalLevelAPIUrls.DeleteApprovalLevel}${id}`);
  }

  getByIdApprovalLevel(id: number): Observable<any> {
    return this.http.get(`${this.url + ApprovalLevelAPIUrls.GetApprovalLevelById}${id}`);
  }
}
