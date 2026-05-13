import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { environment } from 'environments/environment';
import { BehaviorSubject, Observable } from 'rxjs';
import { POApiUrls } from 'Urls/POApiurls';

@Injectable({
  providedIn: 'root'
})
export class POService {
  private url = environment.apiUrl;

  private requestSource = new BehaviorSubject<any>(null);
  currentRequest = this.requestSource.asObservable();

  constructor(private http: HttpClient) {}

  getPO(): Observable<any> {
    return this.http.get<any>(this.url + POApiUrls.GetAllPO);
  }

  getPODetailswithGRN(): Observable<any> {
    return this.http.get<any>(this.url + POApiUrls.GetAllPODetailsWithGRN);
  }

  getPOById(id: any): Observable<any> {
    return this.http.get<any>(this.url + POApiUrls.GetPOById + id);
  }

  insertPO(data: any): Observable<any> {
    const payload = this.cleanPOPayload(data);
    return this.http.post<any>(this.url + POApiUrls.CreatePO, payload);
  }

  updatePO(data: any): Observable<any> {
    const payload = this.cleanPOPayload(data);
    return this.http.put<any>(this.url + POApiUrls.UpdatePO, payload);
  }

  deletePO(id: any): Observable<any> {
    return this.http.delete<any>(this.url + POApiUrls.DeletePO + id);
  }

  getPoQr(poNo: string): Observable<any> {
    return this.http.get<any>(
      this.url + `/PurchaseOrder/${encodeURIComponent(poNo)}/qr`
    );
  }

  emailSupplierPo(id: number, formData: FormData): Observable<any> {
    return this.http.post<any>(
      `${this.url}/PurchaseOrder/${id}/email-supplier`,
      formData
    );
  }

  updatePOApprovalStatus(id: number, status: number): Observable<any> {
    return this.http.put<any>(
      this.url + `/PurchaseOrder/UpdateApprovalStatus/${id}`,
      {
        approvalStatus: status
      }
    );
  }

  private cleanPOPayload(data: any): any {
    const payload = { ...(data || {}) };

    delete payload.approveLevelId;
    delete payload.ApproveLevelId;
    delete payload.approveLevelName;
    delete payload.ApproveLevelName;

    return payload;
  }
}