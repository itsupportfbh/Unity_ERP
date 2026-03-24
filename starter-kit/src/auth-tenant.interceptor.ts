import { Injectable } from '@angular/core';
import {
  HttpEvent,
  HttpHandler,
  HttpInterceptor,
  HttpRequest
} from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable()
export class AuthTenantInterceptor implements HttpInterceptor {
  intercept(req: HttpRequest<any>, next: HttpHandler): Observable<HttpEvent<any>> {
    const token = localStorage.getItem('token');
    const orgGuid = localStorage.getItem('orgGuid');
    const organizationId = localStorage.getItem('organizationId');

    let headers = req.headers;

    if (token && token !== 'undefined' && token !== 'null') {
      headers = headers.set('Authorization', `Bearer ${token}`);
    }

    if (orgGuid && orgGuid !== 'undefined' && orgGuid !== 'null') {
      headers = headers.set('X-Org-Guid', orgGuid);
    }

    if (organizationId && organizationId !== 'undefined' && organizationId !== 'null') {
      headers = headers.set('X-Organization-Id', organizationId);
    }

    return next.handle(req.clone({ headers }));
  }
}