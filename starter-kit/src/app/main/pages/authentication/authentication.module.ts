import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { RouterModule, Routes } from '@angular/router';

import { NgbModule } from '@ng-bootstrap/ng-bootstrap';

import { CoreCommonModule } from '@core/common.module';

import { AuthLoginV2Component } from 'app/main/pages/authentication/auth-login-v2/auth-login-v2.component';
import { ForgotPasswordComponent } from './forgot-password/forgot-password.component';
import { ResetPasswordComponent } from './reset-password/reset-password.component';
import { ChangePasswordComponent } from './change-password/change-password.component';

// routing
const routes: Routes = [
  {
    path: 'authentication/login-v2',
    component: AuthLoginV2Component,
    data: { animation: 'auth' }
  },
  {
    path: 'authentication/forgot-password',
    component: ForgotPasswordComponent,
    data: { animation: 'auth' }
  },
  {
    path: 'authentication/reset-password',
    component: ResetPasswordComponent,
    data: { animation: 'auth' }
  },
  {
    path: 'authentication/change-password',
    component: ChangePasswordComponent,
    data: { animation: 'auth' }
  }
];

@NgModule({
  declarations: [AuthLoginV2Component, ForgotPasswordComponent, ResetPasswordComponent, ChangePasswordComponent],
  imports: [CommonModule, RouterModule.forChild(routes), NgbModule, FormsModule, ReactiveFormsModule, CoreCommonModule]
})
export class AuthenticationModule {}
