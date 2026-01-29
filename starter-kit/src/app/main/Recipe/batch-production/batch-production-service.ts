import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { environment } from 'environments/environment';
import { Observable } from 'rxjs';

/** Generic API wrapper used in your backend (most endpoints return {isSuccess, data}) */
export interface ApiResponse<T> {
  isSuccess?: boolean;
  data?: T;
  count?: number;
  message?: string;
}

/** ===== Batch DTOs ===== */

export interface BatchProductionHeaderDto {
  id: number;
  productionPlanId: number;
  warehouseId: number;
  batchNo?: string | null;
  status?: string | null;

  createdBy?: string | null;
  createdDate?: string | null;

  updatedBy?: string | null;
  updatedDate?: string | null;

  postedBy?: string | null;
  postedDate?: string | null;
}

export interface BatchProductionLineDto {
  id?: number;
  batchProductionId?: number;

  recipeId: number;
  finishedItemId?: number | null;

  plannedQty: number;
  actualQty: number;

  // optional view fields
  recipeName?: string;
  finishedItemName?: string;
  uom?: string;
  expectedOutput?: number;
}

export interface BatchProductionGetByIdDto {
  header?: BatchProductionHeaderDto;
  lines?: BatchProductionLineDto[];
}

/** Create/Update payload (matches backend BatchProductionSaveRequest) */
export interface BatchProductionSaveRequest {
  id?: number | null;                 // null => create
  productionPlanId: number;
  warehouseId: number;
  batchNo?: string | null;
  status?: string;                    // Draft
  user: string;                       // createdBy/updatedBy
  lines: BatchProductionLineDto[];
}

/** Post payload */
export interface BatchPostRequest {
  batchId: number;
  postedBy: string;
}

@Injectable({ providedIn: 'root' })
export class BatchProductionService {
  private url = environment.apiUrl;

  constructor(private http: HttpClient) {}


  listBatches(top: number = 200): Observable<ApiResponse<BatchProductionHeaderDto[]>> {
    return this.http.get<ApiResponse<BatchProductionHeaderDto[]>>(
      `${this.url}/BatchProduction/list?top=${top}`
    );
  }

  getBatchById(id: number): Observable<ApiResponse<BatchProductionGetByIdDto>> {
    return this.http.get<ApiResponse<BatchProductionGetByIdDto>>(
      `${this.url}/BatchProduction/${id}`
    );
  }

  deleteBatch(id: number): Observable<any> {
    return this.http.delete(`${this.url}/BatchProduction/${id}`);
  }


  postToInventory(batchId: number, postedBy?: string): Observable<any> {
    const body: BatchPostRequest = {
      batchId,
      postedBy: (postedBy || localStorage.getItem('username') || 'admin').trim()
    };
    return this.http.post(`${this.url}/BatchProduction/post`, body);
  }


  createBatch(payload: BatchProductionSaveRequest): Observable<any> {
    return this.http.post(`${this.url}/BatchProduction/create`, payload);
  }

  updateBatch(payload: BatchProductionSaveRequest): Observable<any> {
    return this.http.put(`${this.url}/BatchProduction/update`, payload);
  }

 postAndSave(payload: any) {
  return this.http.post(`${this.url}/BatchProduction/post`, payload);
}
}
