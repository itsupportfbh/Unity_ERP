import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { environment } from 'environments/environment';
import { Observable } from 'rxjs';
import { QuotationAPIUrls } from 'Urls/QuotationAPIUrls';
export interface QuotationLine {
  id?: number;
  itemId: number;
  itemName?: string;
  uomId: string;
  qty: number;
  unitPrice: number;
  discountPct: number;
  taxMode?: string | null;
  taxCodeLabel?: string;
  lineNet?: number;
  lineTax?: number;
  lineTotal?: number;
  remarks?: string | null;
}

export interface QuotationHeader {
  id?: number;
  number?: string;
  status: number;                  // 0 draft, 1 submitted, 2 approved, 3 rejected, 4 posted
  customerId: number | null;
  customerName?: string;
  currencyId: number | null;
  fxRate: number;
  paymentTermsId?: number | null;
  validityDate?: string | null;    // yyyy-MM-dd
  subtotal: number;
  taxAmount: number;
  rounding: number;
  grandTotal: number;
  needsHodApproval: boolean;
  remarks?: string | null;
  lines: QuotationLine[];

}
@Injectable({
  providedIn: 'root'
})
export class QuotationsService {
private base = environment.apiUrl;

  constructor(private http: HttpClient) {}

  getAll(): Observable<QuotationHeader[]> {
    return this.http.get<any>(this.base + QuotationAPIUrls.GetAllQuotations)
     
  }

  getById(id: number): Observable<QuotationHeader> {
    return this.http.get<any>(this.base + QuotationAPIUrls.GetQuotationById + id)
      
  }

  create(q: QuotationHeader): Observable<number> {
    return this.http.post<any>(this.base + QuotationAPIUrls.CreateQuotation, q)
      
  }

  update(id: number, q: QuotationHeader): Observable<void> {
    return this.http.put<any>(this.base + QuotationAPIUrls.UpdateQuotationById + id, q)
     
  }

  delete(id: number): Observable<void> {
    return this.http.delete<any>(this.base + QuotationAPIUrls.DeleteQuotationById + id)
      
  }
}
