import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { environment } from 'environments/environment';
import { Observable } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class RecipemasterserviceService {
  private url = environment.apiUrl; // ex: https://localhost:7182/api

  constructor(private http: HttpClient) {}

  // ✅ Create recipe
  createRecipe(payload: any): Observable<any> {
    return this.http.post<any>(`${this.url}/Recipe/create`, payload);
  }

  // ✅ List recipes
  listRecipes(): Observable<any> {
    return this.http.get<any>(`${this.url}/Recipe/list`);
  }

  // ✅ Get recipe by id
  getRecipeById(id: number): Observable<any> {
    return this.http.get<any>(`${this.url}/Recipe/${id}`);
  }

  // ✅ Update recipe
  updateRecipe(id: number, payload: any): Observable<any> {
    return this.http.put<any>(`${this.url}/Recipe/${id}`, payload);
  }

  // ✅ Delete recipe (soft delete in backend)
  deleteRecipe(id: number): Observable<any> {
    return this.http.delete<any>(`${this.url}/Recipe/${id}`);
  }
   listSalesOrders() {
    return this.http.get<any>(`${this.url}/ProductionPlanning/salesorders`);
  }

  getSoLines(soId: number, warehouseId?: number) {
    const q = warehouseId ? `?warehouseId=${warehouseId}` : '';
    return this.http.get<any>(`${this.url}/ProductionPlanning/salesorders/${soId}/lines${q}`);
  }

  createPlan(payload: { salesOrderId: number; warehouseId?: number | null }) {
    return this.http.post<any>(`${this.url}/ProductionPlanning/create-plan`, payload);
  }
}
