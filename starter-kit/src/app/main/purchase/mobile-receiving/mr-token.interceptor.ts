import { Injectable } from '@angular/core';
import { HttpInterceptor, HttpRequest, HttpHandler } from '@angular/common/http';

@Injectable()
export class MobileLinkInterceptor implements HttpInterceptor {
  intercept(req: HttpRequest<any>, next: HttpHandler) {
    const token = sessionStorage.getItem('mrToken');

    if (token && req.url.includes('/api/mobile-receiving')) {
      req = req.clone({
        setHeaders: { 'X-MR-TOKEN': token }   // ✅ match backend
      });
    }
    return next.handle(req);
  }
}

