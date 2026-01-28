import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { environment } from 'environments/environment';
import { Observable } from 'rxjs';
import { GRNApiUrls } from 'Urls/GRNApiUrls';

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

}
