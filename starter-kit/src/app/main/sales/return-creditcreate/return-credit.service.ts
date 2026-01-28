import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable, of } from 'rxjs';
import { environment } from 'environments/environment';
import { CrdeitNoteApiUrls } from 'Urls/CreditNoteAPIUrls';



export interface CnLine {
  id?: number;
  doLineId?: number | null;
  siId: number,
  itemId: number;
  itemName: string;
  uom?: string | null;
  deliveredQty: number;      // from DO
  returnedQty: number;       // user input
  unitPrice: number;
  discountPct: number;
  gstPct?: number | null;
  tax?: string | null;
  taxCodeId?: number | null;
  lineNet: number;           // computed client-side, persisted
  reasonId?: number | null;
  restockDispositionId?: number | null;
  warehouseId: number,
  supplierId: number,
  binId: number
}

export interface CnHeader {
  id?: number;
  creditNoteNo?: string;
  doId: number | null;
  doNumber?: string | null;
  siId?: number | null;
  siNumber?: string | null;
  customerId?: number | null;
  customerName?: string | null;
  requestedDate?: string | null;     // yyyy-MM-dd
  creditNoteDate: string;            // yyyy-MM-dd
  status?: number;
  subtotal: number;                  // footer subtotal only
  remarks?: string | null;
  lines: CnLine[];
}
export type DoItem = {
  doLineId: number;
  itemId: number;
  itemName: string;
  uom?: string | null;
  deliveredQty: number;    // <= this will hold the REMAINING qty
  unitPrice: number;
  discountPct: number;
  gstPct?: number | null;
  tax?: string | null;
  taxCodeId?: number | null;
  warehouseId?: number | null;
  supplierId?: number | null;
  binId?: number | null;
};

@Injectable({
  providedIn: 'root'
})
export class CreditNoteService {
  private url = environment.apiUrl
  private requestSource = new BehaviorSubject<any>(null);
  currentRequest = this.requestSource.asObservable();

  constructor(private http: HttpClient) { }

  getCreditNote(): Observable<any[]> {
    return this.http.get<any[]>(this.url + CrdeitNoteApiUrls.GetAllCreditNote);
  }

  getCreditNoteById(id: any): Observable<any[]> {
    return this.http.get<any[]>(this.url + CrdeitNoteApiUrls.GetCreditNoteById + id);
  }

  insertCreditNote(data: any): Observable<any> {
    return this.http.post<any>(this.url + CrdeitNoteApiUrls.CreateCreditNote, data);
  }

  updateCreditNote(data: any): Observable<any> {
    return this.http.put<any>(this.url + CrdeitNoteApiUrls.UpdateCreditNote, data);
  }

  deleteCreditNote(id: any) {
    return this.http.delete<any>(this.url + CrdeitNoteApiUrls.DeleteCreditNote + id);
  }

  getLines(doId: number, excludeCnId?: number | null): Observable<any> {
    let params = new HttpParams();
    if (excludeCnId) params = params.set('excludeCnId', String(excludeCnId));
    return this.http.get(`${this.url}/CreditNote/dolines/${doId}`, { params });
  }

}
