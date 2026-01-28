// src/app/main/finance/ar/invoice-service.ts
import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from 'environments/environment';
import { map } from 'rxjs/operators';

export interface ArInvoiceListItem {
    rowType: 'INV' | 'CN';
    invoiceId: number;
    invoiceNo: string;
    invoiceDate: string;
    dueDate?: string | null;

    customerId: number;
    customerName: string;

    amount: number;
    paid: number;
    creditNote: number;
    outstanding: number;
    customerCreditNoteAmount?: number;
    customerCreditNoteNo?: string | null;
    customerCreditNoteDate?: string | null;
    customerCreditStatus?: number;
      referenceNo?: string | null;
}

/** Grouped by customer for UI */
export interface ArCustomerGroup {
    customerId: number;
    customerName: string;
    invoiceCount: number;
    totalAmount: number;        // invoices only
    totalPaid: number;          // invoices only
    totalCreditNote: number;    // all CN amounts (for display)
    totalOutstanding: number;   // invoices outstanding (before unapplied CN)
    netOutstanding: number;     // totalOutstanding - unapplied CN


    invoices: ArInvoiceListItem[];
    creditNotes: ArInvoiceListItem[];

    expanded?: boolean;
    creditNoteNo?: string | null;
    creditNoteDate?: string | null;
    creditNoteStatus?: number;
}

@Injectable({ providedIn: 'root' })
export class ArInvoiceService {
    private url = environment.apiUrl
    private baseUrl = '/ArInvoice';

    constructor(private http: HttpClient) { }

    getInvoices(): Observable<ArInvoiceListItem[]> {
        return this.http
            .get<{ data: ArInvoiceListItem[] }>(`${this.url + this.baseUrl}/list`)
            .pipe(map(r => r.data || []));
    }
    createAdvance(data: any) {
  return this.http.post(`${this.url + this.baseUrl}/advance`, data);
}
 getOpenAdvances(customerId: number, salesOrderId?: number) {
    const params: any = { customerId };
    if (salesOrderId) {
      params.salesOrderId = salesOrderId;
    }
    return this.http.get<any[]>(`${this.url + this.baseUrl}/advance/open`, { params });
  }
}
