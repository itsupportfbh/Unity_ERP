import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { environment } from 'environments/environment';
import { Observable } from 'rxjs';

export interface SoHeaderDto {
  id: number;
  salesOrderNo: string;
  customerId?: number;
  deliveryDate?: string;
  status?: string;
}

export interface PlanRowDto {
  recipeId: number;
  finishedItemId: number;
  recipeName: string;
  plannedQty: number;
  expectedOutput: number;
  batchQty: number;
  headerYieldPct: number;
}

export interface IngredientRowDto {
  itemId: number;
  itemName: string;
  uom?: string;
  requiredQty: number;
  availableQty: number;
  status: 'OK' | 'Shortage';
}
export interface ProductionPlanLineDto {
  id: number;
  productionPlanId: number;
  recipeId: number;
  finishedItemId?: number;
  finishedItemName?: string;
  plannedQty: number;
  expectedOutput: number;
}
export interface ProductionPlanListRow {
  id: number;
  salesOrderId?: number;
  salesOrderNo?: string;
  planDate?: string; // ISO
  status?: string;
  totalShortage?: number; // optional if backend provides
  lines?: ProductionPlanLineDto[];
}
export interface ProductionPlanResponseDto {
  productionPlanId?: number;
  planRows: PlanRowDto[];
  ingredients: IngredientRowDto[];
}

@Injectable({ providedIn: 'root' })
export class ProductionPlanService {
 private url = environment.apiUrl; 
  constructor(private http: HttpClient) {}

getSalesOrders(includeSoId?: number): Observable<SoHeaderDto[]> {
  const params: any = {};

  if (includeSoId && includeSoId > 0) {
    params.includeSoId = includeSoId;
  }

  return this.http.get<SoHeaderDto[]>(
    `${this.url}/ProductionPlan/salesorders`,
    { params }
  );
}

  getBySo(soId: number, warehouseId: number): Observable<ProductionPlanResponseDto> {
    return this.http.get<ProductionPlanResponseDto>(`${this.url}/ProductionPlan/so/${soId}?warehouseId=${warehouseId}`);
  }

  savePlan(payload: { salesOrderId: number; outletId?: number; warehouseId?: number; createdBy?: string }) {
    return this.http.post(`${this.url}/ProductionPlan/save`, payload);
  }
  createPrFromRecipeShortage(payload: {
  salesOrderId: number;
  warehouseId: number;
  outletId: number;
  userId: number;
  userName: string;
  deliveryDate?: string | null;
  note?: string | null;
}) {
  return this.http.post<any>(
    `${this.url}/PurchaseRequest/create-from-recipe-shortage`,
    payload
  );
}
 getProductionPlanList(): Observable<ProductionPlanListRow[]> {
    return this.http.get<ProductionPlanListRow[]>(`${this.url}/ProductionPlan/list-with-lines`);
  }

  getShortageGrnAlerts() {
  return this.http.get<any>(`${this.url}/ProductionPlan/shortage-grn-alerts`);
  }
getPlanById(id: number) {
  return this.http.get<any>(`${this.url}/ProductionPlan/${id}`);
}

updatePlan(payload: any) {
  return this.http.put<any>(`${this.url}/ProductionPlan/update`, payload);
}

deletePlan(planId: number) {
  return this.http.delete<any>(`${this.url}/ProductionPlan/${planId}`);
}
}
