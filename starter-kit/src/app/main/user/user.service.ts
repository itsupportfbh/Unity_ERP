import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from 'environments/environment';
import { Observable } from 'rxjs';

export interface ApprovalLevel {
  id: number;
  name: string;
  description?: string;
}

export interface UserView {
  id: number;
  username: string;
  email: string;
  isActive: boolean;
  approvalLevelIds: number[];
  departmentId: number;
  locationId: number;
  approvalLevelNames: string[];
}

@Injectable({ providedIn: 'root' })
export class UserService {
  private url = environment.apiUrl;

  constructor(private http: HttpClient) {}

  getAllView() {
    return this.http.get<UserView[]>(`${this.url}/User/getAllView`);
  }

  getViewById(id: number) {
    return this.http.get<UserView>(`${this.url}/User/view/${id}`);
  }

  insert(payload: any) {
    return this.http.post(`${this.url}/User/insert`, payload);
  }

  update(id: number, payload: any) {
    return this.http.put(`${this.url}/User/update/${id}`, payload);
  }

  delete(id: number) {
    return this.http.delete(`${this.url}/User/delete/${id}`);
  }

  getApprovalLevels() {
    return this.http.get<any>(`${this.url}/ApprovalLevel/GetApprovalLevels`);
  }

  getDepartments() {
    return this.http.get<any>(`${this.url}/User/departments`);
  }

  getDepartmentMenuAccess(departmentId: number) {
    return this.http.get<any>(`${this.url}/DepartmentMenuAccess/by-department/${departmentId}`);
  }

submitUserAccessWizard(payload: any) {
  return this.http.post<any>(
    `${this.url}/User/submit-user-access`,
    payload
  );
}

updateUserAccessWizard(id: number, payload: any) {
  return this.http.put<any>(
    `${this.url}/User/update-user-access/${id}`,
    payload
  );
}

  getOrganizationRoleByUserId(userId: number): Observable<any> {
    return this.http.get<any>(`${this.url}/User/organization-role/${userId}`);
  }
}