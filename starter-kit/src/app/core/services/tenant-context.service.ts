import { Injectable } from '@angular/core';

/**
 * Single source for tenant session values set at login (auth-login-v2).
 * Use this instead of reading localStorage keys directly in components.
 */
@Injectable({ providedIn: 'root' })
export class TenantContextService {
  get token(): string {
    return this.read('token');
  }

  get companyId(): number {
    const raw =
      this.read('companyId') ||
      this.read('CompanyId');
    const n = Number(raw);
    return Number.isFinite(n) && n > 0 ? n : 0;
  }

  get orgGuid(): string {
    return this.read('orgGuid');
  }

  get databaseName(): string {
    return this.read('databaseName');
  }

  get companyName(): string {
    return this.read('companyName');
  }

  get isLoggedIn(): boolean {
    return !!this.token;
  }

  get requiresCompanySelection(): boolean {
    return this.read('requiresCompanySelection') === 'true';
  }

  private read(key: string): string {
    const v = localStorage.getItem(key);
    if (!v || v === 'undefined' || v === 'null') return '';
    return v;
  }
}
