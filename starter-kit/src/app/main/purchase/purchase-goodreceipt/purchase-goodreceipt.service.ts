import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { environment } from 'environments/environment';
import { Observable } from 'rxjs';
import { GRNApiUrls } from 'Urls/GRNApiUrls';
export interface ApiResponse<T> {
  isSuccess?: boolean;
  message?: string;
  data?: T;
}

export interface GrnForPinDto {
  id: number;
  poid: number;
  receptionDate: string;
  grnNo: string;
  invoiceNo?: string | null;

  grnJson?: any;
  poLines?: any;
  poLinesJson?: any;

  currencyId?: number | null;
  tax?: number | null;

  supplierId?: number | null;
  supplierName?: string | null;

  poNo?: string | number | null;
}
@Injectable({
  providedIn: 'root'
})

export class PurchaseGoodreceiptService {
private url = environment.apiUrl;

  constructor(private http: HttpClient) {}

  getAllGRN(): Observable<any> {
    return this.http.get<any[]>(this.url + GRNApiUrls.GetAllGRN);
  }

    getAllDetails(): Observable<any> {
    return this.http.get<any[]>(this.url + GRNApiUrls.GetAllDetails);
  }
  createGRN(data: any): Observable<any> {
    return this.http.post(this.url + GRNApiUrls.CreateGRN, data);
  }

    getByIdGRN(id: number): Observable<any> {
    return this.http.get(`${this.url + GRNApiUrls.GetGRNById}${id}`);
  }
   UpdateFlagIssues(data: any): Observable<any> {
        return this.http.put<any>(this.url + GRNApiUrls.UpdateFlagIssues, data);
      }

  deleteGRN(id: number): Observable<any> {
    return this.http.delete(`${this.url + GRNApiUrls.DeleteGRN}${id}`);
  }
  GetAllGRNByPoId(): Observable<any> {
    return this.http.get<any[]>(this.url + GRNApiUrls.GetAllGRNByPOId);
  }

applyGrnAndUpdateSalesOrder(req: any): Observable<any> {
  return this.http.post<any>(this.url + GRNApiUrls.ApplyGrnAndUpdateSalesOrder, req);
}
 getReceivedAggByPO(poid: number): Observable<ApiResponse<any>> {
    const params = new HttpParams().set('poid', String(poid));
    return this.http.get<ApiResponse<any>>(`${this.url}/PurchaseGoodReceipt/getReceivedAggByPO`, { params });
  }
   getAvailableForPinCreate(): Observable<ApiResponse<GrnForPinDto[]>> {
    debugger
    return this.http.get<ApiResponse<GrnForPinDto[]>>(this.url + GRNApiUrls.GetAvailableForPinCreate);
  }

  /** ✅ Edit screen GRN dropdown: current PIN mapped GRNs + other available GRNs */
  getAvailableForPinEdit(pinId: number): Observable<ApiResponse<GrnForPinDto[]>> {
    return this.http.get<ApiResponse<GrnForPinDto[]>>(`${this.url + GRNApiUrls.GetAvailableForPinEdit}${pinId}`);
  }
}
