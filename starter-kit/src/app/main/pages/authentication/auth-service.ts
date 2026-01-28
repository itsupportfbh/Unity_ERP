import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from 'environments/environment';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private url = environment.apiUrl;
  private baseUrl = this.url + '/user/';

  constructor(private http: HttpClient) {}

  userLogin(data: any) {
    return this.http.post<any>(`${this.baseUrl}login`, data);
  }

  // =========================
  // ✅ STORAGE HELPERS
  // =========================
  getTeams(): string[] {
    try {
      const v = JSON.parse(localStorage.getItem('teams') || '[]');
      return Array.isArray(v) ? v : [];
    } catch {
      return [];
    }
  }

  getApprovalRoles(): string[] {
    try {
      const v = JSON.parse(localStorage.getItem('approvalRoles') || '[]');
      return Array.isArray(v) ? v : [];
    } catch {
      return [];
    }
  }

  isLoggedIn(): boolean {
    return !!localStorage.getItem('token');
  }

logout() {
  localStorage.removeItem('token');
  localStorage.removeItem('approvalRoles');
  localStorage.removeItem('teams');
  localStorage.removeItem('id');
  localStorage.removeItem('username');
  localStorage.removeItem('email');

  // ✅ keep remember_username always
  // localStorage.removeItem('remember_username'); ❌ never
}

  // =========================
  // ✅ MENU ACCESS CHECK
  // =========================
  canShowMenu(allowTeams: string[] = [], allowApprovalRoles: string[] = []): boolean {
    // if no restriction => allow
    if ((!allowTeams || allowTeams.length === 0) && (!allowApprovalRoles || allowApprovalRoles.length === 0)) {
      return true;
    }

    const userTeams = this.getTeams();
    const userRoles = this.getApprovalRoles();

    const teamOk = (allowTeams || []).some(t => userTeams.includes(t));
    const roleOk = (allowApprovalRoles || []).some(r => userRoles.includes(r));

    // ✅ IMPORTANT: If BOTH are given, allow if ANY matches? or BOTH must match?
    // Your requirement: approval roles control admin screens, teams control modules.
    // So: allow if either condition passes.
    return teamOk || roleOk;
  }

  // optional helpers
  hasAnyTeam(teams: string[] = []): boolean {
    if (!teams || teams.length === 0) return true;
    return teams.some(t => this.getTeams().includes(t));
  }

  hasAnyApprovalRole(roles: string[] = []): boolean {
    if (!roles || roles.length === 0) return true;
    return roles.some(r => this.getApprovalRoles().includes(r));
  }

  // -------------------------
  // your other APIs (keep)
  // -------------------------
  updateChangePassword(body: any): Observable<any> {
    const token = localStorage.getItem('token');
    const headers = { Authorization: `Bearer ${token}` };
    return this.http.post<any>(this.baseUrl + 'changePassword', body, { headers });
  }

  forgotPassword(data: any): Observable<any> {
    return this.http.post<any>(this.baseUrl + 'forgotPassword', data);
  }

  resetPassword(body: any): Observable<any> {
    const token = localStorage.getItem('token');
    const headers = { Authorization: `Bearer ${token}` };
    return this.http.post<any>(this.baseUrl + 'resetPassword', body, { headers });
  }
}
