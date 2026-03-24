import { Injectable } from '@angular/core';
import {
  HttpEvent,
  HttpHandler,
  HttpInterceptor,
  HttpRequest
} from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable()
export class TenantInterceptor implements HttpInterceptor {
  intercept(req: HttpRequest<any>, next: HttpHandler): Observable<HttpEvent<any>> {
    const organizationId = localStorage.getItem('organizationId');
    const orgGuid = localStorage.getItem('orgGuid');

    let headers = req.headers;

    if (organizationId) {
      headers = headers.set('X-Organization-Id', organizationId);
    }

    if (orgGuid) {
      headers = headers.set('X-Org-Guid', orgGuid);
    }

    const cloned = req.clone({ headers });
    return next.handle(cloned);
  }
}