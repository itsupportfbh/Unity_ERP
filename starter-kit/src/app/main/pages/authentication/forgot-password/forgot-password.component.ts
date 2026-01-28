import { Component, OnInit, ViewEncapsulation } from '@angular/core';
import { UntypedFormBuilder, UntypedFormGroup, Validators } from '@angular/forms';

import { takeUntil } from 'rxjs/operators';
import { Subject } from 'rxjs';

import { CoreConfigService } from '@core/services/config.service';
import { ActivatedRoute, Router } from '@angular/router';
import { AuthService } from '../auth-service';
import Swal from 'sweetalert2';

@Component({
  selector: 'app-forgot-password',
  templateUrl: './forgot-password.component.html',
  styleUrls: ['./forgot-password.component.scss'],
  encapsulation: ViewEncapsulation.None
})
export class ForgotPasswordComponent implements OnInit {

     // Public
  public emailVar;
  public coreConfig: any;
  public forgotPasswordForm: UntypedFormGroup;
  public submitted = false;

  // Private
  private _unsubscribeAll: Subject<any>;
  mode: any;

  /**
   * Constructor
   *
   * @param {CoreConfigService} _coreConfigService
   * @param {FormBuilder} _formBuilder
   *
   */
  constructor(private _coreConfigService: CoreConfigService, private _formBuilder: UntypedFormBuilder,
    private _route: ActivatedRoute,
    private _router: Router,
    private authService:AuthService,
  ) {
    this._unsubscribeAll = new Subject();

    // Configure the layout
    this._coreConfigService.config = {
      layout: {
        navbar: {
          hidden: true
        },
        menu: {
          hidden: true
        },
        footer: {
          hidden: true
        },
        customizer: false,
        enableLocalStorage: false
      }
    };
  }

  // convenience getter for easy access to form fields
  get f() {
    return this.forgotPasswordForm.controls;
  }

  get promptText(): string {
  return this.mode === 'username'
    ? "Username sent to your email, please check and proceed further."
    : "Reset link sent to your email, please check and proceed further.";
  }

  /**
   * On Submit
   */
  onSubmit() {
    this.submitted = true;

    // stop here if form is invalid
    if (this.forgotPasswordForm.invalid) {
      return;
    }
    if (this.forgotPasswordForm.valid) {       
        
        this.authService.forgotPassword(this.forgotPasswordForm.value).subscribe({
                next: () => {
                  Swal.fire({
                    icon: 'success',
                    title: 'Send!',
                    text: this.promptText,
                    // confirmButtonText: 'OK',
                    confirmButtonColor: '#0e3a4c',
                    showConfirmButton: false, 
                    timer: 2000 
                  });
                  
                setTimeout(() => {
                     this._router.navigateByUrl('/pages/authentication/login-v2'); 
                }, 700);
                
                },
                error: (err) => {
                   let errorMessage = 'Something went wrong!';
            
                    // If your API sends { message: "error text" }
                    if (err.error && err.error.message) {
                      errorMessage = err.error.message;
                    } 
                    // If backend sends plain text instead of JSON
                    else if (typeof err.error === 'string') {
                      errorMessage = err.error;
                    }
                    // If backend sends status code details
                    else if (err.status) {
                      errorMessage = `Error ${err.status}: ${err.statusText}`;
                    }
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
  }

  // Lifecycle Hooks
  // -----------------------------------------------------------------------------------------------------

  /**
   * On init
   */
  ngOnInit(): void {
    this.mode = (this._route.snapshot.queryParamMap.get('mode')).toLowerCase()
    this.forgotPasswordForm = this._formBuilder.group({
      email: ['', [Validators.required, Validators.email]],
      mode: [this.mode]
    });

    // Subscribe to config changes
    this._coreConfigService.config.pipe(takeUntil(this._unsubscribeAll)).subscribe(config => {
      this.coreConfig = config;
    });
  }

  /**
   * On destroy
   */
  ngOnDestroy(): void {
    // Unsubscribe from all subscriptions
    this._unsubscribeAll.next();
    this._unsubscribeAll.complete();
  }

}




