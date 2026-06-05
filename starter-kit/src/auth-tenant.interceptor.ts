import { Injectable } from '@angular/core';
import {
  HttpEvent,
  HttpHandler,
  HttpInterceptor,
  HttpRequest
} from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from 'environments/environment';
import { TenantContextService } from 'app/core/services/tenant-context.service';

/**
 * Sends JWT + tenant headers on every FinanceApi request.
 * Backend resolves org → tenant DB (TenantResolutionMiddleware) and companyId from JWT.
 */
@Injectable()
export class AuthTenantInterceptor implements HttpInterceptor {
  constructor(private tenant: TenantContextService) {}

  intercept(req: HttpRequest<any>, next: HttpHandler): Observable<HttpEvent<any>> {
    const isApi = req.url.startsWith(environment.apiUrl);
    if (!isApi) {
      return next.handle(req);
    }

    let headers = req.headers;

    const token = this.tenant.token;
    if (token) {
      headers = headers.set('Authorization', `Bearer ${token}`);
    }

    const orgGuid = this.tenant.orgGuid;
    if (orgGuid) {
      headers = headers.set('X-Org-Guid', orgGuid);
    }

    const companyId = this.tenant.companyId;
    if (companyId > 0) {
      headers = headers.set('X-Company-Id', String(companyId));
    }

    const organizationId = localStorage.getItem('organizationId');
    if (organizationId && organizationId !== 'undefined' && organizationId !== 'null') {
      headers = headers.set('X-Organization-Id', organizationId);
    }

    return next.handle(req.clone({ headers }));
  }
}
