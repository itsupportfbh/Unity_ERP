import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { environment } from 'environments/environment';
import { map } from 'rxjs/operators';
import { Observable } from 'rxjs';
import { DeliveryOrderAPIUrls } from 'Urls/DeliveryOrderAPIUrls';

export type DoCreateRequest = {
  soId: number | null;
  packId: number | null;
  driverId: number;
  vehicleId: number | null;
  routeName: string | null;
  deliveryDate: string | null;
  lines: Array<{
    soLineId: number | null;
    packLineId: number | null;
    itemId: number | null;
    itemName: string;
    uom: string | null;
    qty: number;
    notes: string | null;
    warehouseId?: number | null;  // NEW (pass-through)
    binId?: number | null;        // NEW
    supplierId?: number | null;   // NEW
  }>;
};

export type DoHeaderDto = {
  id: number;
  doNumber: string;
  status: number;
  soId: number | null;
  packId: number | null;
  driverId: number | null;
  vehicleId: number | null;
  routeName: string | null;
  deliveryDate: string | null;
  podFileUrl?: string | null;
  isPosted: boolean | number;
};

export type DoLineDto = {
  id: number;
  doId: number;
  soLineId: number | null;
  packLineId: number | null;
  itemId: number | null;
  itemName: string;
  uom: string | null;
  qty: number;
  notes: string | null;
  warehouseId?: number | null;  // NEW
  binId?: number | null;        // NEW
  supplierId?: number | null;   // NEW
};

@Injectable({ providedIn: 'root' })
export class DeliveryOrderService {
  private readonly base = environment.apiUrl;
  constructor(private http: HttpClient) {}

  getAll() {
    return this.http.get<any>(`${this.base}${DeliveryOrderAPIUrls.GetAll}`)
      .pipe(map(res => res?.data ?? res ?? []));
  }

  get(id: number) {
    return this.http.get<any>(`${this.base}${DeliveryOrderAPIUrls.GetById}${id}`)
      .pipe(map(res => res?.data ?? res));
  }

  create(payload: DoCreateRequest): Observable<number> {
    return this.http.post<any>(`${this.base}${DeliveryOrderAPIUrls.Create}`, payload)
      .pipe(map(res => res?.data ?? res));
  }

  updateHeader(id: number, payload: any) {
    return this.http.put<any>(`${this.base}${DeliveryOrderAPIUrls.UpdateHeader}${id}/Header`, payload)
      .pipe(map(res => res?.data ?? res));
  }

  getLines(id: number) {
    return this.http.get<any>(`${this.base}${DeliveryOrderAPIUrls.GetLines}${id}`)
      .pipe(map(res => res?.data ?? res ?? []));
  }

  addLine(payload: any) {
    return this.http.post<any>(`${this.base}${DeliveryOrderAPIUrls.AddLine}`, payload)
      .pipe(map(res => res?.data ?? res));
  }

  removeLine(lineId: number) {
    return this.http.delete<any>(`${this.base}${DeliveryOrderAPIUrls.RemoveLine}${lineId}`)
      .pipe(map(res => res?.data ?? res));
  }

  submit(id: number)  { return this.http.post<any>(`${this.base}${DeliveryOrderAPIUrls.Submit}${id}`, {}).pipe(map(r=>r?.data??r)); }
  approve(id: number) { return this.http.post<any>(`${this.base}${DeliveryOrderAPIUrls.Approve}${id}`, {}).pipe(map(r=>r?.data??r)); }
  reject(id: number)  { return this.http.post<any>(`${this.base}${DeliveryOrderAPIUrls.Reject}${id}`, {}).pipe(map(r=>r?.data??r)); }
  post(id: number)    { return this.http.post<any>(`${this.base}${DeliveryOrderAPIUrls.Post}${id}`, {}).pipe(map(r=>r?.data??r)); }

  getSoSnapshot(doId: number) {
    return this.http.get<any>(`${this.base}${DeliveryOrderAPIUrls.GetSoSnapshot}${doId}`)
      .pipe(map(res => res?.data ?? res ?? []));
  }
}
