import { Component, OnInit, OnDestroy, AfterViewInit, ViewEncapsulation } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { UntypedFormBuilder, UntypedFormGroup, Validators } from '@angular/forms';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { CoreConfigService } from '@core/services/config.service';
import { AuthService } from '../auth-service';
import Swal from 'sweetalert2';

@Component({
  selector: 'app-auth-login-v2',
  templateUrl: './auth-login-v2.component.html',
  styleUrls: ['./auth-login-v2.component.scss'],
  encapsulation: ViewEncapsulation.None
})
export class AuthLoginV2Component implements OnInit, AfterViewInit, OnDestroy {

  loginForm!: UntypedFormGroup;
  submitted = false;
  loading = false;
  error = '';
  passwordTextType = false;

  images: string[] = [
    'assets/images/pages/image1.JPG',
    'assets/images/pages/image2.JPG',
    'assets/images/pages/image3.JPG'
  ];
  currentImage: string = this.images[0];
  private imgIndex = 0;
  private imageTimer: any;

  returnUrl!: string;
  coreConfig: any;

  private _unsubscribeAll = new Subject<any>();

  // ✅ NEW STORAGE KEY (single object)
  private readonly REMEMBER_KEY = 'remember_login';

  constructor(
    private _coreConfigService: CoreConfigService,
    private _formBuilder: UntypedFormBuilder,
    private _route: ActivatedRoute,
    private _router: Router,
    private authService: AuthService
  ) {
    this._coreConfigService.config = {
      layout: {
        navbar: { hidden: true },
        menu: { hidden: true },
        footer: { hidden: true },
        customizer: false,
        enableLocalStorage: false
      }
    };
  }

  get f() {
    return this.loginForm.controls;
  }

  ngOnInit(): void {

    // ✅ default empty form
   this.loginForm = this._formBuilder.group({
  email: ['', [Validators.required, Validators.email]],
  password: ['', Validators.required],
  rememberMe: [false]
});

    this.returnUrl = this._route.snapshot.queryParams['returnUrl'] || '/home';

    this._coreConfigService.config
      .pipe(takeUntil(this._unsubscribeAll))
      .subscribe(config => (this.coreConfig = config));

    // ✅ background image slider
    this.imageTimer = setInterval(() => {
      this.imgIndex = (this.imgIndex + 1) % this.images.length;
      this.currentImage = this.images[this.imgIndex];
    }, 4000);
  }

  // ✅ load remembered username + password AFTER view (autofill override)
  ngAfterViewInit(): void {
    setTimeout(() => {
      const raw = localStorage.getItem(this.REMEMBER_KEY);

      if (!raw) return;

      try {
        const saved = JSON.parse(raw);
        this.loginForm.patchValue({
          email: saved?.email || '',
          password: saved?.password || '',
          rememberMe: !!saved?.rememberMe
        });
      } catch {
        localStorage.removeItem(this.REMEMBER_KEY);
      }
    }, 0);
  }

  togglePasswordTextType() {
    this.passwordTextType = !this.passwordTextType;
  }

 onSubmit(): void {
  this.submitted = true;
  this.error = '';

  if (this.loginForm.invalid) return;

  this.loading = true;

  const remember = !!this.loginForm.value.rememberMe;

  const payload = {
    email: this.loginForm.value.email,
    password: this.loginForm.value.password
  };

  this.authService.userLogin(payload).subscribe({
    next: (res: any) => {
      if (!res?.success || !res?.data) {
        this.loading = false;
        Swal.fire({
          icon: 'error',
          title: 'Error',
          text: res?.message || 'Login failed',
          confirmButtonText: 'OK',
          confirmButtonColor: '#d33'
        });
        return;
      }

      const data = res.data;
      const email = data.email ?? payload.email;
      const password = payload.password;

      if (remember) {
        localStorage.setItem(
          this.REMEMBER_KEY,
          JSON.stringify({ email, password, rememberMe: true })
        );
      } else {
        localStorage.removeItem(this.REMEMBER_KEY);
      }

      localStorage.setItem('username', data.username ?? '');
      localStorage.setItem('token', data.token ?? '');
      localStorage.setItem('id', String(data.userId ?? ''));
      localStorage.setItem('email', data.email ?? '');

      localStorage.setItem('approvalRoles', JSON.stringify(data.approvalLevelNames || []));
      localStorage.setItem('approvalLevelIds', JSON.stringify(data.approvalLevelIds || []));
      localStorage.setItem('teams', JSON.stringify(data.teams || []));
      localStorage.setItem('allowedMenuIds', JSON.stringify(data.allowedMenuIds || []));
      localStorage.setItem('locationId', String(data.locationId || 0));
      localStorage.setItem('departmentId', String(data.departmentId || 0));
      localStorage.setItem('orgGuid', data.orgGuid ?? '');
      localStorage.setItem('menuIds', JSON.stringify(res.menuIds || []));
      localStorage.setItem('databaseName', data.databaseName ?? '');
      localStorage.setItem('isMasterOwner', String(!!data.isMasterOwner));
      localStorage.setItem('isTenantUser', String(!!data.isTenantUser));
      localStorage.setItem('organizations', JSON.stringify(data.organizations || []));
      localStorage.setItem('organizationId', String(data.organizationId ?? ''));

      this.loading = false;

      if (data.isMasterOwner) {
        this._router.navigate(['/master/companyList']);
      } else if (data.isTenantUser) {
        this._router.navigate(['/home']);
      } else {
        this._router.navigate([this.returnUrl || '/home']);
      }
    },
    error: (err: any) => {
      this.loading = false;

      let errorMessage = 'Something went wrong!';
      if (err?.error?.message) errorMessage = err.error.message;
      else if (typeof err?.error === 'string') errorMessage = err.error;
      else if (err?.status) errorMessage = `Error ${err.status}: ${err.statusText}`;

      Swal.fire({
        icon: 'error',
        title: 'Error',
        text: errorMessage,
        confirmButtonText: 'OK',
        confirmButtonColor: '#d33'
      });
    }
  });
}

  ngOnDestroy(): void {
    if (this.imageTimer) clearInterval(this.imageTimer);
    this._unsubscribeAll.next(null);
    this._unsubscribeAll.complete();
  }
}
