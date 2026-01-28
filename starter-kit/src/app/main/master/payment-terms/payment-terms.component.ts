import { AfterViewChecked, Component, OnInit, ViewChild } from '@angular/core';
import { FormBuilder, NgForm } from '@angular/forms';
import Swal from 'sweetalert2';
import { PaymentTermsService } from './payment-terms.service';
import * as feather from 'feather-icons';

@Component({
  selector: 'app-payment-terms',
  templateUrl: './payment-terms.component.html',
  styleUrls: ['./payment-terms.component.scss']
})
export class PaymentTermsComponent implements OnInit,AfterViewChecked {
 @ViewChild('addForm') addForm!: NgForm;
  PaymentTermsList: any[] = [];
  PaymentTermsName: string = '';
  description: string = '';
  isEditMode = false;
  selectedPaymentTerms: any = null;
  public isDisplay = false;
  private iconsReplaced = false;
  userId: string;
  constructor(private fb: FormBuilder,
    private PaymentTermsService: PaymentTermsService,) { 
       this.userId = localStorage.getItem('id');
    }

  ngOnInit(): void {
    this.loadPaymentTerms();
  }
 ngAfterViewChecked(): void {
      setTimeout(() => {
        feather.replace();
      });
    }
  ngAfterViewInit(): void {
    feather.replace();
  }
  // Load data from API
  loadPaymentTerms() {
    debugger
    this.PaymentTermsService.getAllPaymentTerms().subscribe((res: any) => {
      this.PaymentTermsList = res.data.filter((item: any) => item.isActive === true);
      setTimeout(() => feather.replace(), 0);
    });
  }

  // Show form for creating
  createPaymentTerms() {
    this.isDisplay = true;
    this.isEditMode = false;
    this.selectedPaymentTerms = null;
    this.reset();
  }

  // Show form for editing
  editPaymentTerms(data: any) {
    this.isDisplay = true;       // show the form
    this.isEditMode = true;      // enable edit mode
    this.selectedPaymentTerms = data;

    // patch the form fields
    this.PaymentTermsName = data.paymentTermsName;       // bind to input
    this.description = data.description; // bind to textarea
  }
  cancel() {

    this.isEditMode = false;
    this.isDisplay = false;
  }

  reset() {
    this.PaymentTermsName = '';
    this.description = '';
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
      PaymentTermsName: this.PaymentTermsName,
      description: this.description,
      CreatedBy: this.userId,
      UpdatedBy: this.userId,
      UpdatedDate: new Date(),
      isActive : true
    };

    if (this.isEditMode) {
      const updatedPaymentTerms = { ...this.selectedPaymentTerms, ...payload };
      this.PaymentTermsService.updatePaymentTerms(this.selectedPaymentTerms.id, updatedPaymentTerms).subscribe({
        next: () => {
          Swal.fire({
            icon: 'success',
            title: 'Updated!',
            text: 'PaymentTerms updated successfully',
            confirmButtonText: 'OK',
            confirmButtonColor: '#0e3a4c'
          });
          this.loadPaymentTerms();
          this.cancel();
        },
        error: () => {
          Swal.fire({
            icon: 'error',
            title: 'Error',
            text: 'Failed to update PaymentTerms',
            confirmButtonText: 'OK',
            confirmButtonColor: '#d33'
          });
        }
      });
    } else {
      this.PaymentTermsService.createPaymentTerms(payload).subscribe({
        next: () => {
          Swal.fire({
            icon: 'success',
            title: 'Created!',
            text: 'PaymentTerms created successfully',
            confirmButtonText: 'OK',
            confirmButtonColor: '#0e3a4c'
          });
          this.loadPaymentTerms();
          this.cancel();
        },
        error: () => {
          Swal.fire({
            icon: 'error',
            title: 'Error',
            text: 'Failed to create PaymentTerms',
            confirmButtonText: 'OK',
            confirmButtonColor: '#d33'
          });
        }
      });
    }
  }
  // Delete
  confirmdeletePaymentTerms(data: any) {
    Swal.fire({
      title: 'Confirm Delete',
      text: 'Are you sure you want to delete this item?',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Delete',
      cancelButtonText: 'Cancel',
      confirmButtonColor: '#d33',
      cancelButtonColor: '#3085d6'
    }).then((result) => {
      if (result.isConfirmed) {
        this.deletePaymentTerms(data);
        Swal.fire({
          icon: 'success',
          title: 'Deleted!',
          text: 'Item has been deleted.',
          confirmButtonColor: '#3085d6'
        });
      }
    });
  }
  // Delete
  deletePaymentTerms(item: any) {
    this.PaymentTermsService.deletePaymentTerms(item.id).subscribe({
      next: (res) => {
        Swal.fire({
          icon: 'success',
          title: 'Deleted!',
          text: 'PaymentTerms deleted successfully',
          confirmButtonColor: '#3085d6'
        });
        this.ngOnInit();
      },
      error: (err) => {
        Swal.fire({
          icon: 'error',
          title: 'Error',
          text: 'Failed to delete PaymentTerms',
          confirmButtonColor: '#d33'
        });
      }
    });
  }
}
