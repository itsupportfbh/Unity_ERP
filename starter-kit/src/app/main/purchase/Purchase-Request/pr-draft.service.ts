import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { environment } from 'environments/environment';
import { Observable } from 'rxjs';
import { PurchaseDraftAPIUrls } from 'Urls/PurchaseAPIUrls';


export interface PrDraft {
  prHeader: any;
  prLines: any[];
  departmentName?: string;
  step?: number;
}

@Injectable({ providedIn: 'root' })
export class PrDraftService {
  private KEY = 'pr_draft_v1';
constructor(private http: HttpClient) {}
private url = environment.apiUrl
  save(draft: PrDraft) {
    try {
      sessionStorage.setItem(this.KEY, JSON.stringify(draft));
    } catch { /* ignore */ }
  }

  load(): PrDraft | null {
    try {
      const s = sessionStorage.getItem(this.KEY);
      return s ? (JSON.parse(s) as PrDraft) : null;
    } catch {
      return null;
    }
  }

  clear() {
    try {
      sessionStorage.removeItem(this.KEY);
    } catch { /* ignore */ }
  }
  getAll(): Observable<any> {
    return this.http.get<any>(this.url + PurchaseDraftAPIUrls.GetAllPurchaseRequestsDraft);
  }

  // ✅ GET BY ID - Get single draft by ID
  getById(id: number): Observable<any> {
    return this.http.get<any>(`${this.url + PurchaseDraftAPIUrls.GetPurchaseRequestDraftById}${id}`);
  }

  // ✅ POST - Create new draft
  create(data: any): Observable<any> {
    return this.http.post<any>(this.url + PurchaseDraftAPIUrls.CreatePurchaseRequestDraft, data);
  }

  // ✅ PUT - Update existing draft
  update(id: number, data: any): Observable<any> {
    return this.http.put<any>(`${this.url + PurchaseDraftAPIUrls.UpdatePurchaseRequestDraft}${id}`, data);
  }

  // ✅ DELETE - Delete a draft
  delete(id: number, userId: string): Observable<any> {
    return this.http.delete<any>(`${this.url + PurchaseDraftAPIUrls.DeletePurchaseRequestDraft}${id}`, {
      params: { userId }
    });
  }

  // ✅ PROMOTE - Convert a draft into a real Purchase Request
 promote(id: number, userId: string): Observable<any> {
  return this.http.post<any>(
    `${this.url}${PurchaseDraftAPIUrls.PromotePurchaseRequestTempById}${id}`,
    null,
    { params: { userId } }
  );
}

}
