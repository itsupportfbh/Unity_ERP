import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable, of } from 'rxjs';
import { environment } from 'environments/environment';
import { PackingApiUrls } from 'Urls/PackingAPIUrls';
import { map } from 'rxjs/operators';

type ApiResponse<T> = { isSuccess: boolean; message: string; data: T };

@Injectable({
  providedIn: 'root'
})
export class PackingService {
  private url = environment.apiUrl
  private requestSource = new BehaviorSubject<any>(null);
  currentRequest = this.requestSource.asObservable();

  constructor(private http: HttpClient) { }

  getPacking(): Observable<any[]> {
    return this.http.get<any[]>(this.url + PackingApiUrls.GetAllPacking);
  }

  getPackingById(id: any): Observable<any[]> {
    return this.http.get<any[]>(this.url + PackingApiUrls.GetPackingById + id);
  }

  insertPacking(data: any): Observable<any> {
    return this.http.post<any>(this.url + PackingApiUrls.CreatePacking, data);
  }

  updatePacking(data: any): Observable<any> {
    return this.http.put<any>(this.url + PackingApiUrls.UpdatePacking, data);
  }

  deletePacking(id: any) {
    return this.http.delete<any>(this.url + PackingApiUrls.DeletePacking + id);
  }
  getPackingCodes(soId: number): Observable<{
    barCode: string;
    qrText: string;
    barCodeSrcBase64: string;   // data:image/png;base64,...
    qrCodeSrcBase64: string;    // data:image/png;base64,...
  }> {
    return this.http
      .post<ApiResponse<{
        barCode: string;
        qrText: string;
        barCodeSrcBase64: string;
        qrCodeSrcBase64: string;
      }>>(`${this.url}/picking/codes`, { soId })
      .pipe(map(r => r.data));   // <-- works once map is imported
  }
 
}
