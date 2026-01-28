import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { environment } from 'environments/environment';

@Injectable({ providedIn: 'root' })
export class InvoiceEmailService {
  private base = environment.apiUrl + '/invoiceemail';

  constructor(private http: HttpClient) {}

  // 1) Get invoices for dropdown (filtered by docType)
  getInvoiceList(docType: string) {
    // backend: /api/invoiceemail/invoices?docType=SI or PIN
    return this.http.get<any[]>(`${this.base}/invoices?docType=${docType}`);
  }

  // 2) Get selected invoice details (with customer/supplier email)
  getInvoiceInfo(docType: string, invoiceId: number) {
    // backend: /api/invoiceemail/invoiceinfo/SI/123
    return this.http.get<any>(`${this.base}/invoiceinfo/${docType}/${invoiceId}`);
  }

  // 3) Get template (optionally by docType)
  getTemplate(id: number, docType?: string) {
    if (docType) {
      // backend can ignore docType if not needed
      return this.http.get<any>(`${this.base}/template/${id}?docType=${docType}`);
    }
    return this.http.get<any>(`${this.base}/template/${id}`);
  }

  // 4) Send email
  // sendEmail(dto: any) {
  //   return this.http.post<any>(`${this.base}/send`, dto);
  // }
  // email.service.ts
// invoice-email.service.ts
sendEmail(docType: 'SI' | 'PIN', invoiceId: number, payload: any) {
  debugger
  const endpoint = docType === 'SI' ? 'sales' : 'pin';   // 👈 choose API path

  return this.http.post<any>(
    `${this.base}/${endpoint}/${invoiceId}`,
    payload
  );
}


}
