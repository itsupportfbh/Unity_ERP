import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { environment } from 'environments/environment';
import { Observable, forkJoin } from 'rxjs';
import { ItemMasterAPIUrls } from 'Urls/ItemMasterAPIUrls';

export interface ApplyGrnLine {
  itemCode: string;           // SKU
  supplierId?: number | null;
  warehouseId: number;
  binId?: number | null;
  strategyId?: number | null;
  qtyDelta: number;           // +received
  batchFlag?: boolean;
  serialFlag?: boolean;
  barcode?: string | null;
  price?: number | null;
  remarks?: string | null;
}

export interface ApplyGrnRequest {
  grnNo?: string;
  receptionDate?: string | Date;
  updatedBy?: string;
  lines: ApplyGrnLine[];
}

export interface UpdateWarehouseAndSupplierPriceDto {
  itemCode: string;
  warehouseId: number;
  binId?: number | null;
  strategyId?: number | null;
  qtyDelta: number;
  batchFlag?: boolean;
  serialFlag?: boolean;
  supplierId?: number | null;
  price?: number | null;
  barcode?: string | null;
  remarks?: string | null;
  updatedBy?: string;
}

@Injectable({ providedIn: 'root' })
export class InventoryService {
  private url = environment.apiUrl;

  constructor(private http: HttpClient) {}

  /** POST api/ItemMaster/ApplyGrn */
  applyGrnToInventory(req: ApplyGrnRequest): Observable<any> {
    return this.http.post<any>(this.url + ItemMasterAPIUrls.ApplyGrn, req);
  }

  /** POST api/ItemMaster/UpdateWarehouseAndSupplierPrice */
  updateWarehouseAndSupplierPrice(dto: UpdateWarehouseAndSupplierPriceDto): Observable<any> {
    return this.http.post<any>(this.url + ItemMasterAPIUrls.UpdateWarehouseAndSupplierPrice, dto);
  }

  /** Helper to post many upserts in parallel */
  batchUpdateWarehouseAndSupplierPrice(dtos: UpdateWarehouseAndSupplierPriceDto[]): Observable<any[]> {
    return forkJoin(dtos.map(d => this.updateWarehouseAndSupplierPrice(d)));
  }
}
