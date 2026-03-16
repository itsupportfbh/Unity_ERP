import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { DepartmentMenuAccessAPIUrls } from 'Urls/DepartmentMenuAccessAPIUrls';
import { environment } from 'environments/environment';

export interface SaveDepartmentMenuAccessRequest {
  departmentId: number;
  menuIds: string[];
  updatedBy: number;
}

export interface ApiResponse<T = any> {
  success?: boolean;
  isSuccess?: boolean;
  message: string;
  data?: T;
}

export interface DepartmentDto {
  id: number;
  departmentName: string;
}

export interface DepartmentMenuAccessListItem {
  departmentId: number;
  departmentName: string;
  menuIds: string[];
}

@Injectable({
  providedIn: 'root'
})
export class DepartmentMenuAccessService {
  constructor(private http: HttpClient) {}

  private url = environment.apiUrl;

   saveDepartmentMenuAccess(
    payload: SaveDepartmentMenuAccessRequest
  ): Observable<ApiResponse> {
    return this.http.post<ApiResponse>(
      this.url + DepartmentMenuAccessAPIUrls.SaveDepartmentMenuAccess,
      payload
    );
  }
  getByDepartmentId(departmentId: number): Observable<string[]> {
    return this.http.get<string[]>(
      this.url + DepartmentMenuAccessAPIUrls.GetDepartmentMenuAccessByDepartmentId + departmentId
    );
  }

  getCurrentUserMenuAccess(): Observable<any> {
    return this.http.get<any>(
      this.url + DepartmentMenuAccessAPIUrls.GetCurrentUserMenuAccess
    );
  }

  getAllDepartmentMenuAccess(): Observable<DepartmentMenuAccessListItem[]> {
    return this.http.get<DepartmentMenuAccessListItem[]>(
      this.url + DepartmentMenuAccessAPIUrls.GetAllDepartmentMenuAccess
    );
  }

  deleteDepartmentMenuAccess(departmentId: number): Observable<ApiResponse> {
    return this.http.delete<ApiResponse>(
      this.url + DepartmentMenuAccessAPIUrls.DeleteDepartmentMenuAccess + departmentId
    );
  }

  getDepartments(): Observable<ApiResponse<DepartmentDto[]>> {
    return this.http.get<ApiResponse<DepartmentDto[]>>(
      this.url + DepartmentMenuAccessAPIUrls.GetAllDepartments
    );
  }
}