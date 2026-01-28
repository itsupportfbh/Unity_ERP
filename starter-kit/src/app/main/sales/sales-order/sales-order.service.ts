// sales-order.service.ts
import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable } from 'rxjs';
import { SalesOrderApiUrls } from 'Urls/SalesOrderAPIUrls';
import { environment } from 'environments/environment';

export interface ResponseResult<T = any> {
  isSuccess: boolean;
  message: string;
  data: T;
}

export interface AllocationPreviewResponse {
  lines: Array<{
    itemId: number;
    requestedQty: number;
    allocatedQty: number;
    fullyAllocated: boolean;
    allocations: Array<{ warehouseId: number; supplierId: number; qty: number }>;
  }>;
}

@Injectable({ providedIn: 'root' })
export class SalesOrderService {
  private url = environment.apiUrl; // e.g. '/api'
  private requestSource = new BehaviorSubject<any>(null);
  currentRequest = this.requestSource.asObservable();

  constructor(private http: HttpClient) {}

  // LIST
  getSO(): Observable<ResponseResult<any>> {
    return this.http.get<ResponseResult<any>>(this.url + SalesOrderApiUrls.GetAllSO);
  }

  // GET BY ID
  getSOById(id: number): Observable<ResponseResult<any>> {
    return this.http.get<ResponseResult<any>>(this.url + SalesOrderApiUrls.GetSOById + id);
  }

  // CREATE
  insertSO(data: any): Observable<ResponseResult<number>> {
    return this.http.post<ResponseResult<number>>(this.url + SalesOrderApiUrls.CreateSO, data);
  }

  // UPDATE (default: reallocate = true)
  updateSO(data: any, reallocate = true): Observable<ResponseResult<any>> {
    const base = this.url + SalesOrderApiUrls.UpdateSO; // '/SalesOrder/update'
    const query = `?reallocate=${reallocate ? 'true' : 'false'}`;
    return this.http.put<ResponseResult<any>>(base + query, data);
  }

  // DELETE
// sales-order.service.ts
deleteSO(id: number, updatedBy = 1) {
  const base = this.url + SalesOrderApiUrls.DeleteSO + id;
  const query = `?updatedBy=${encodeURIComponent(updatedBy)}`;
  return this.http.delete<ResponseResult<any>>(base + query);
}

  // QUOTATION → DETAILS
  GetByQuatitonDetails(id: number): Observable<ResponseResult<any>> {
    return this.http.get<ResponseResult<any>>(this.url + SalesOrderApiUrls.GetByQuatitonDetails + id);
  }

  // PREVIEW allocation — body must be { lines }
  previewAllocation(lines: { itemId: number; quantity: number }[]) {
    return this.http.post<ResponseResult<AllocationPreviewResponse>>(
      this.url + SalesOrderApiUrls.previewAllocation,
      { lines }
    );
  }

approveSO(id: number, approvedBy = 1) {
  return this.http.post<ResponseResult<any>>(
    this.url + SalesOrderApiUrls.ApproveSO(id, approvedBy),
    {}
  );
}

rejectSO(id: number) {
  return this.http.post<ResponseResult<any>>(
    this.url + SalesOrderApiUrls.RejectSO(id),
    {}
  );
}

getDrafts() {
  return this.http.get<ResponseResult<any[]>>(this.url + SalesOrderApiUrls.Drafts);
}
 getSOByStatus(id): Observable<ResponseResult<any>> {
    return this.http.get<ResponseResult<any>>(this.url + SalesOrderApiUrls.GetSOByStatus+id);
  }
  getOpenByCustomer(customerId: number): Observable<ResponseResult<any[]>> {
  return this.http.get<ResponseResult<any[]>>(
    this.url + SalesOrderApiUrls.GetOpenSOByCustomer + customerId
  );
}

}