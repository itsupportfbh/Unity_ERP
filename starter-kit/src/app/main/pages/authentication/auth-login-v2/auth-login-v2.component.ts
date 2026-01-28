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
      username: ['', Validators.required],
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
          username: saved?.username || '',
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

    // ✅ login payload only username/password
    const payload = {
      username: this.loginForm.value.username,
      password: this.loginForm.value.password
    };

    this.authService.userLogin(payload).subscribe({
      next: (res: any) => {
        const username = res.username ?? payload.username;
        const password = payload.password;

        // ✅ Remember Me: store username + password
        if (remember) {
          localStorage.setItem(
            this.REMEMBER_KEY,
            JSON.stringify({ username, password, rememberMe: true })
          );
        } else {
          localStorage.removeItem(this.REMEMBER_KEY);
        }

        // ✅ existing stores
        localStorage.setItem('username', username);
        localStorage.setItem('token', res.token ?? '');
        localStorage.setItem('id', String(res.userId ?? ''));
        localStorage.setItem('email', res.email ?? '');

        localStorage.setItem('approvalRoles', JSON.stringify(res.approvalLevelNames || []));
        localStorage.setItem('teams', JSON.stringify(res.teams || []));

        this.loading = false;
        this._router.navigate([this.returnUrl]);
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
