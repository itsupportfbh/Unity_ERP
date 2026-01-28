// src/app/main/sales/sales-invoicecreate/sales-invoice.service.ts
import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';

import { environment } from 'environments/environment';
import { SalesInvoiceAPIUrls } from 'Urls/SalesInvoiceAPIUrls ';


export type SiSourceType = 1 | 2;

export interface ApiResponse<T = any> {
  isSuccess?: boolean;
  success?: boolean;
  message: string;
  data: T;
}

export interface SiSourceLine {
  sourceLineId: number;
  sourceType: SiSourceType;
  sourceId: number;
  itemId: number;
  itemName: string;
  uomName?: string | null;
  qtyOpen: number;
  unitPrice: number;
  discountPct: number;
  gstPct: number;
  tax: string;
  taxCodeId?: number | null;
  lineAmount?: number;
}

export interface SiCreateLine {
  sourceLineId?: number | null;
  itemId: number;
  itemName?: string | null;
  uom?: string | null;
  qty: number;
  unitPrice: number;
  discountPct: number;
  gstPct: number;
  tax: string;
  taxCodeId?: number | null;
  lineAmount?: number;
  taxAmount?: number;          // <<-- for save() mapping
  description?: string | null;
  budgetLineId?: number; 
}

export interface SiCreateRequest {
  sourceType: SiSourceType;
  soId?: number | null;
  doId?: number | null;
  invoiceDate: string;         // yyyy-MM-dd
  subtotal: number;            // <<-- used in component.save()
  shippingCost: number;        // <<-- used in component.save()
  total: number;               // net total
  remarks?: string | null;     // <<-- used in component.save()
  lines: SiCreateLine[];
  taxAmount:number;
}

@Injectable({ providedIn: 'root' })
export class SalesInvoiceService {
  private base = environment.apiUrl;

  constructor(private http: HttpClient) {}

  // ===== LIST =====
  list(): Observable<ApiResponse> {
    return this.http.get<ApiResponse>(this.base + SalesInvoiceAPIUrls.List);
  }

  // ===== GET SINGLE =====
  get(id: number): Observable<ApiResponse> {
    return this.http.get<ApiResponse>(this.base + SalesInvoiceAPIUrls.Get + id);
  }

  // ===== SOURCE LINES =====
  sourceLines(sourceType: SiSourceType, sourceId: number): Observable<ApiResponse> {
    const params = new HttpParams()
      .set('sourceType', String(sourceType))
      .set('sourceId', String(sourceId));

    return this.http.get<ApiResponse>(
      this.base + SalesInvoiceAPIUrls.SourceLines,
      { params }
    );
  }

  // ===== CREATE =====
  create(req: SiCreateRequest): Observable<ApiResponse> {
    return this.http.post<ApiResponse>(this.base + SalesInvoiceAPIUrls.Create, req);
  }

  // ===== DELETE =====
  delete(id: number): Observable<ApiResponse> {
    return this.http.delete<ApiResponse>(this.base + SalesInvoiceAPIUrls.Delete + id);
  }

  // ===== EDIT HEADER =====
  updateHeader(id: number, body: { invoiceDate: string }): Observable<ApiResponse> {
    return this.http.put<ApiResponse>(
      this.base + SalesInvoiceAPIUrls.UpdateHeader + id,
      body
    );
  }

  // ===== ADD LINE =====
  addLine(siId: number, body: SiCreateLine): Observable<ApiResponse> {
    return this.http.post<ApiResponse>(
      this.base + SalesInvoiceAPIUrls.AddLine + siId,
      body
    );
  }

  // ===== UPDATE LINE =====
  updateLine(
    lineId: number,
    body: {
      qty: number;
      unitPrice: number;
      discountPct: number;
      gstPct: number;
      tax: string;
      taxCodeId?: number | null;
      lineAmount?: number;
      taxAmount?:number;
      description?: string | null;
      budgetLineId: number
    }
  ): Observable<ApiResponse> {
    return this.http.put<ApiResponse>(
      this.base + SalesInvoiceAPIUrls.UpdateLine + lineId,
      body
    );
  }

  // ===== REMOVE LINE =====
  removeLine(lineId: number): Observable<ApiResponse> {
    return this.http.delete<ApiResponse>(
      this.base + SalesInvoiceAPIUrls.RemoveLine + lineId
    );
  }
}
