import { Component, OnInit, ViewChild } from '@angular/core';
import { FormBuilder, FormGroup, NgForm, Validators } from '@angular/forms';
import Swal from 'sweetalert2';
import {Router } from '@angular/router';
import { AuthService } from '../auth-service';

@Component({
  selector: 'app-change-password',
  templateUrl: './change-password.component.html',
  styleUrls: ['./change-password.component.scss']
})
export class ChangePasswordComponent implements OnInit {

  @ViewChild('addForm') addForm!: NgForm;
 
  newPassword: string = '';
  currentPassword: string = ''
  confirmNewPassword: string = ''
  userName: string;
  
 
  constructor(private fb: FormBuilder,
  private _router: Router,
  private authService:AuthService,) { }

  ngOnInit(): void {
    this.userName = localStorage.getItem('username');
  }


 
  // Save or update
  onSubmit(form: any) {
    if (!form.valid) {
      Swal.fire({
        icon: 'warning',
        title: 'Warning',
        text: 'Please fill all required fields',
        confirmButtonText: 'OK',
        confirmButtonColor: '#0e3a4c'
      });
      return;
    }

    const payload = {
      currentPassword: this.currentPassword,
      newPassword: this.newPassword,
      confirmNewPassword: this.confirmNewPassword,
      CreatedBy: this.userName,
      UpdatedBy: this.userName,
      UpdatedDate: new Date()
    };

    this.authService.updateChangePassword(payload).subscribe({
        next: () => {
          Swal.fire({
            icon: 'success',
            title: 'Created!',
            text: 'Change Password created successfully',
            // confirmButtonText: 'OK',
            confirmButtonColor: '#0e3a4c',
            showConfirmButton: false,
            timer: 2000   
          });
          
        setTimeout(() => {
          this._router.navigateByUrl('pages/authentication/login-v2');
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
  cancel(){
    this._router.navigateByUrl('home');
  }
}




