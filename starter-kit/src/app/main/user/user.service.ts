import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from 'environments/environment';

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
  departmentId : number;
  approvalLevelNames: string[];
}

@Injectable({ providedIn: 'root' })
export class UserService {
  private base = '/api/User';
private url = environment.apiUrl;
  constructor(private http: HttpClient) {}

  // list with roles
  getAllView() {
    return this.http.get<UserView[]>(`${this.url}/User/getAllView`);
  }

  // edit load with roles
  getViewById(id: number) {
    return this.http.get<UserView>(`${this.url}/User/view/${id}`);
  }

  // crud
  insert(payload: any) {
    return this.http.post(`${this.url}/User/insert`, payload);
  }

  update(id: number, payload: any) {
    return this.http.put(`${this.url}/User/update/${id}`, payload);
  }

  delete(id: number) {
    return this.http.delete(`${this.url}/User/delete/${id}`);
  }

  // roles master
  getApprovalLevels() {
    return this.http.get<ApprovalLevel[]>(`${this.url}/ApprovalLevel/GetApprovalLevels`);
    // change url if your approval controller route differs
  }
  getDepartments() {
  return this.http.get<any>(`${this.url}/user/departments`);
}

}
