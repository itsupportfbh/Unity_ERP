import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { environment } from 'environments/environment';

@Injectable({ providedIn: 'root' })
export class MobileReceivingApi {

  private url = environment.apiUrl;

  constructor(private http: HttpClient) {}

  // Validate barcode against PO
  validateScan(poNo: string, barcode: string) {
    return this.http.post(
      this.url + '/mobile-receiving/scan',
      {
        purchaseOrderNo: poNo,
        itemKey: barcode,
        qty: 1,
        createdBy: 'mobile'
      }
    );
  }

  // Sync receiving lines
 sync(body: { purchaseOrderNo: string; lines: any[] }) {
  return this.http.post(
    this.url + '/mobile-receiving/sync',
    body
  );
}


  // Optional – load PO for showing expected qty
  getPo(poNo: string) {
    return this.http.get(
      this.url + '/mobile-receiving/po',
      { params: { poNo } }
    );
  }
}
