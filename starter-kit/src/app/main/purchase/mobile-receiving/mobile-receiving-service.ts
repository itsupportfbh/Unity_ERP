import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { environment } from 'environments/environment';

@Injectable({ providedIn: 'root' })
export class MobileReceivingApi {

  private url = environment.apiUrl;

  constructor(private http: HttpClient) {}

  private headers(poNo?: string): { headers: HttpHeaders } {
    const token = sessionStorage.getItem('mrToken') || '';
    return {
      headers: token
        ? new HttpHeaders({ 'X-MR-TOKEN': token, 'X-MR-PO': poNo || '' })
        : new HttpHeaders()
    };
  }

  // Validate barcode against PO
  validateScan(poNo: string, barcode: string, qty = 1) {
    return this.http.post(
      this.url + '/mobile-receiving/scan',
      {
        purchaseOrderNo: poNo,
        itemKey: barcode,
        qty,
        createdBy: Number(localStorage.getItem('id') || 0)
      },
      this.headers(poNo)
    );
  }

  // Sync receiving lines
 sync(body: { purchaseOrderNo: string; lines: any[] }) {
  return this.http.post(
    this.url + '/mobile-receiving/sync',
    body,
    this.headers(body.purchaseOrderNo)
  );
}


  // Optional – load PO for showing expected qty
  getPo(poNo: string) {
    return this.http.get(
      this.url + '/mobile-receiving/po',
      { params: { poNo }, ...this.headers(poNo) }
    );
  }
}
