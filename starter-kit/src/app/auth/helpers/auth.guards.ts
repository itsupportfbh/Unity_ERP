import { Injectable } from '@angular/core';
import { Router, CanActivate, ActivatedRouteSnapshot, RouterStateSnapshot } from '@angular/router';

import { AuthenticationService } from 'app/auth/service';

@Injectable({ providedIn: 'root' })
export class AuthGuard implements CanActivate {
  constructor(private _router: Router, private _authenticationService: AuthenticationService) {}

  canActivate(route: ActivatedRouteSnapshot, state: RouterStateSnapshot) {
    const currentUser = this._authenticationService.currentUserValue;

    if (currentUser) {

      // ✅ allowed roles from route config
      const allowed: string[] = route.data?.roles || [];

      // ✅ user roles from localStorage
      let myRoles: string[] = [];
      try {
        myRoles = JSON.parse(localStorage.getItem('roles') || '[]');
      } catch {
        myRoles = [];
      }

      // ✅ if route has role restriction, validate
      if (allowed.length > 0) {
        const my = myRoles.map(x => (x || '').toLowerCase());
        const ok = allowed.some(r => my.includes((r || '').toLowerCase()));

        if (!ok) {
          this._router.navigate(['/pages/miscellaneous/not-authorized']);
          return false;
        }
      }

      return true;
    }

    this._router.navigate(['/pages/authentication/login-v2'], { queryParams: { returnUrl: state.url } });
    return false;
  }
}
