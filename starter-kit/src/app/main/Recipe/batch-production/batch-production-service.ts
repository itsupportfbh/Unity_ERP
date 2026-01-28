import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class BatchProductionService {
  private url = 'https://your-api-url/api'; // change

  constructor(private http: HttpClient) {}

  // LIST
  listBatches(): Observable<any> {
    return this.http.get(`${this.url}/batch-production/list`);
  }

  getBatchById(id: number): Observable<any> {
    return this.http.get(`${this.url}/batch-production/${id}`);
  }

  deleteBatch(id: number): Observable<any> {
    return this.http.delete(`${this.url}/batch-production/${id}`);
  }

  postToInventory(id: number): Observable<any> {
    return this.http.post(`${this.url}/batch-production/${id}/post`, {});
  }

  // CREATE/EXECUTE
  listPlans(): Observable<any> {
    return this.http.get(`${this.url}/production-plan/list`); // or your plan endpoint
  }

  getPlanLines(planId: number): Observable<any> {
    return this.http.get(`${this.url}/batch-production/plan/${planId}/lines`);
  }

  saveBatchDraft(payload: any): Observable<any> {
    return this.http.post(`${this.url}/batch-production/save-draft`, payload);
  }

  postBatchToInventory(payload: any): Observable<any> {
    return this.http.post(`${this.url}/batch-production/post`, payload);
  }
}
