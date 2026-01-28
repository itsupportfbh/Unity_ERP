import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { environment } from 'environments/environment';
import { Observable } from 'rxjs';
import { SupplierInvoiceAPIUrls } from 'Urls/SupplierInvoiceAPIUrls ';
import { SupplierApiUrls } from 'Urls/SuppliersApiUrls';
import { DebitNoteApiUrls } from 'Urls/DebitNoteApiUrls';   // 🔹 add this

export interface OcrInvoiceLine {
  poNo?: string;
  grnNo?: string;
  item?: string;
  qty?: number;
  price?: number;
}

export interface OcrInvoiceResult {
  invoiceNo?: string;
  invoiceDate?: string; // yyyy-mm-dd
  amount?: number;
  tax?: number;
  currency?: string;
  lines?: OcrInvoiceLine[];
}

@Injectable({
  providedIn: 'root'
})
export class SupplierInvoiceService {
  private url = environment.apiUrl;

  constructor(private http: HttpClient) {}

  // 🔹 GET all supplier invoices (PIN)
  getAll(): Observable<any> {
    return this.http.get<any[]>(this.url + SupplierInvoiceAPIUrls.GetAll);
  }

  // 🔹 CREATE PIN
  create(data: any): Observable<any> {
    return this.http.post(this.url + SupplierInvoiceAPIUrls.Create, data);
  }

  // 🔹 UPDATE PIN
  update(id: number, data: any): Observable<any> {
    return this.http.put(
      `${this.url + SupplierInvoiceAPIUrls.Update}${id}`,
      data
    );
  }

  // 🔹 DELETE PIN
  delete(id: number): Observable<any> {
    return this.http.delete(
      `${this.url + SupplierInvoiceAPIUrls.Delete}${id}`
    );
  }

  // 🔹 GET PIN by Id
  GetSupplierInvoiceById(id: number): Observable<any> {
    return this.http.get(
      `${this.url + SupplierInvoiceAPIUrls.GetById}${id}`
    );
  }

  // 🔹 3-Way match
  getThreeWayMatch(pinId: number): Observable<any> {
    return this.http.get<any>(
      this.url + SupplierInvoiceAPIUrls.GetThreeWayMatch + pinId
    );
  }

  // 🔹 Post to A/P
  postToAp(pinId: number): Observable<any> {
    // controller: [HttpPost("PostToAp/{id}")]
    return this.http.post<any>(
      this.url + SupplierInvoiceAPIUrls.PostToAp + pinId,
      {}
    );
  }

  // 🔹 Flag for Review (Hold / Flagged)
  flagForReview(pinId: number): Observable<any> {
    // controller: [HttpPost("FlagForReview/{id}")]
    return this.http.post<any>(
      this.url + SupplierInvoiceAPIUrls.FlagForReview + pinId,
      {}
    );
  }

  // 🔹 NEW: Get Debit Note source (used when creating Debit Note from PIN)
  // hits SupplierDebitNoteController.GetDebitNoteSource(id)
  getDebitNoteSource(pinId: number): Observable<any> {
    return this.http.get<any>(
      this.url + DebitNoteApiUrls.GetDebitNoteSource + pinId
    );
  }
  markDebitNote(pinId: number): Observable<any> {
    return this.http.post<any>(
      this.url + DebitNoteApiUrls.MarkDebitNote + pinId,
      {}
    );
  }
  getSupplierAdvancesBySupplier(supplierId: number) {
  return this.http.get<any>(
    this.url +DebitNoteApiUrls.getSupplierAdvancesBySupplier + supplierId
  );
}

}
