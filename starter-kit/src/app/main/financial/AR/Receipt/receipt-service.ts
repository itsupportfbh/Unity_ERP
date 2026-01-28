import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable, of } from 'rxjs';
import { environment } from 'environments/environment';
import { ReceiptApiUrls } from 'Urls/ReceiptAPIUrls';
import { map } from 'rxjs/operators';


export interface ReceiptAllocationDto {
  id?: number;
  invoiceId: number;
  invoiceNo: string;
  allocatedAmount: number;
  invoiceDate:string
  amount:number
  paidAmount:number
  balance:number
}

export interface ReceiptDetailDto {
  id: number;
  receiptNo: string;
  customerId: number;
  customerName: string;
  receiptDate: string;
  paymentMode: 'CASH' | 'BANK';
  bankId?: number | null;
  amountReceived: number;
  totalAllocated: number;
  unallocated: number;
  referenceNo?: string | null;
  remarks?: string | null;
  allocations: ReceiptAllocationDto[];
}

@Injectable({
  providedIn: 'root'
})
export class ReceiptService {
  private url = environment.apiUrl
  private requestSource = new BehaviorSubject<any>(null);
  currentRequest = this.requestSource.asObservable();

  constructor(private http: HttpClient) { }

  getReceipt(): Observable<any[]> {
    return this.http.get<any[]>(this.url + ReceiptApiUrls.GetAllReceipt);
  }

  getReceiptById(id: number): Observable<ReceiptDetailDto> {
    return this.http.get<ReceiptDetailDto>(this.url + ReceiptApiUrls.GetReceiptById + id);
  }
  insertReceipt(data: any): Observable<any> {
    return this.http.post<any>(this.url + ReceiptApiUrls.CreateReceipt, data);
  }

  updateReceipt(id: number, body: any): Observable<any> {
    return this.http.put<any>(this.url + ReceiptApiUrls.UpdateReceipt + id, body);
  }

  deleteReceipt(id: any) {
    return this.http.delete<any>(this.url + ReceiptApiUrls.DeleteReceipt + id);
  }
  getOpenInvoices(customerId: number): Observable<any[]> {
    const url = `${this.url}/ArReceipt/open-invoices/${customerId}`;
    return this.http
      .get<{ data: any[] }>(url)
      .pipe(map(res => res.data || []));
  }

}
