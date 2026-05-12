import {
  AfterViewChecked,
  AfterViewInit,
  Component,
  OnInit,
  ViewChild,
  ViewEncapsulation
} from '@angular/core';
import { FormBuilder, NgForm } from '@angular/forms';
import Swal from 'sweetalert2';
import * as feather from 'feather-icons';

import { PaymentTermsService } from './payment-terms.service';
import { FunctionPermission, PermissionService } from 'app/shared/permission.service';

@Component({
  selector: 'app-payment-terms',
  templateUrl: './payment-terms.component.html',
  styleUrls: ['./payment-terms.component.scss'],
  encapsulation: ViewEncapsulation.None
})
export class PaymentTermsComponent implements OnInit, AfterViewChecked, AfterViewInit {
  @ViewChild('addForm') addForm!: NgForm;

  PaymentTermsList: any[] = [];
  PaymentTermsName: string = '';
  description: string = '';

  isEditMode = false;
  selectedPaymentTerms: any = null;
  public isDisplay = false;
  modeHeader: string = 'Add Payment Terms';

  userId: number = 0;

  // IMPORTANT: DB/Menu permission code exact ah match aaganum
  functionId = 'paymentTerms';

  permission: FunctionPermission;
  isPermissionLoaded = false;
  isPageLoading = false;

  constructor(
    private fb: FormBuilder,
    private PaymentTermsService: PaymentTermsService,
    private permissionService: PermissionService
  ) {
    this.userId = Number(localStorage.getItem('id') || 0);
    this.permission = this.permissionService.getEmptyPermission(this.functionId);
  }

  ngOnInit(): void {
    this.loadPermission();
  }

  ngAfterViewChecked(): void {
    feather.replace();
  }

  ngAfterViewInit(): void {
    feather.replace();
  }

  loadPermission(): void {
    if (!this.userId || this.userId <= 0) {
      this.permission = this.permissionService.getEmptyPermission(this.functionId);
      this.isPermissionLoaded = true;

      Swal.fire({
        icon: 'warning',
        title: 'Access Denied',
        text: 'User not found. Please login again.',
        confirmButtonColor: '#0e3a4c'
      });
      return;
    }

    this.isPageLoading = true;

    this.permissionService.getFunctionPermission(this.userId, this.functionId).subscribe({
      next: (res: FunctionPermission) => {
        this.permission = res || this.permissionService.getEmptyPermission(this.functionId);
        this.isPermissionLoaded = true;
        this.isPageLoading = false;

        if (this.canView()) {
          this.loadPaymentTerms();
        } else {
          this.PaymentTermsList = [];
          this.isDisplay = false;
        }
      },
      error: (err) => {
        console.error('Permission load error:', err);

        this.permission = this.permissionService.getEmptyPermission(this.functionId);
        this.isPermissionLoaded = true;
        this.isPageLoading = false;

        Swal.fire({
          icon: 'error',
          title: 'Error',
          text: 'Unable to load permission.',
          confirmButtonColor: '#d33'
        });
      }
    });
  }

  canView(): boolean {
    return this.permissionService.hasView(this.permission);
  }

  canCreate(): boolean {
    return this.permissionService.hasCreate(this.permission);
  }

  canEdit(): boolean {
    return this.permissionService.hasEdit(this.permission);
  }

  canDelete(): boolean {
    return this.permissionService.hasDelete(this.permission);
  }

  loadPaymentTerms(): void {
    this.PaymentTermsService.getAllPaymentTerms().subscribe({
      next: (res: any) => {
        this.PaymentTermsList = (res?.data || []).filter((item: any) => item.isActive === true);
        setTimeout(() => feather.replace(), 0);
      },
      error: (err) => {
        console.error('Load payment terms error:', err);
        this.PaymentTermsList = [];
      }
    });
  }

  createPaymentTerms(): void {
    if (!this.canCreate()) {
      Swal.fire({
        icon: 'warning',
        title: 'Access Denied',
        text: 'You do not have create permission.',
        confirmButtonColor: '#0e3a4c'
      });
      return;
    }

    this.isDisplay = true;
    this.isEditMode = false;
    this.selectedPaymentTerms = null;
    this.modeHeader = 'Create Payment Terms';
    this.reset();
  }

  editPaymentTerms(data: any): void {
    if (!this.canEdit()) {
      Swal.fire({
        icon: 'warning',
        title: 'Access Denied',
        text: 'You do not have edit permission.',
        confirmButtonColor: '#0e3a4c'
      });
      return;
    }

    this.isDisplay = true;
    this.isEditMode = true;
    this.selectedPaymentTerms = data;

    this.PaymentTermsName = data.paymentTermsName || '';
    this.description = data.description || '';
    this.modeHeader = 'Edit Payment Terms';
  }

  cancel(): void {
    this.isEditMode = false;
    this.isDisplay = false;
    this.selectedPaymentTerms = null;
  }

  reset(): void {
    this.PaymentTermsName = '';
    this.description = '';
    this.modeHeader = this.isEditMode ? 'Edit Payment Terms' : 'Create Payment Terms';
  }

  onSubmit(form: NgForm): void {
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

    if (this.isEditMode && !this.canEdit()) {
      Swal.fire({
        icon: 'warning',
        title: 'Access Denied',
        text: 'You do not have edit permission.',
        confirmButtonColor: '#0e3a4c'
      });
      return;
    }

    if (!this.isEditMode && !this.canCreate()) {
      Swal.fire({
        icon: 'warning',
        title: 'Access Denied',
        text: 'You do not have create permission.',
        confirmButtonColor: '#0e3a4c'
      });
      return;
    }

    const payload = {
      PaymentTermsName: this.PaymentTermsName,
      description: this.description,
      CreatedBy: this.userId,
      UpdatedBy: this.userId,
      CreatedDate: new Date(),
      UpdatedDate: new Date(),
      isActive: true,
      companyId: Number(localStorage.getItem('companyId') || 0)
    };

    if (this.isEditMode) {
      const updatedPaymentTerms = {
        ...this.selectedPaymentTerms,
        ...payload
      };

      this.PaymentTermsService
        .updatePaymentTerms(this.selectedPaymentTerms.id, updatedPaymentTerms)
        .subscribe({
          next: (res: any) => {
            if (res?.isSuccess === false) {
              Swal.fire({
                icon: 'error',
                title: 'Error',
                text: res?.message || 'Failed to update Payment Terms',
                confirmButtonText: 'OK',
                confirmButtonColor: '#d33'
              });
              return;
            }

            Swal.fire({
              icon: 'success',
              title: 'Updated!',
              text: res?.message || 'Payment Terms updated successfully',
              confirmButtonText: 'OK',
              confirmButtonColor: '#0e3a4c'
            });

            this.loadPaymentTerms();
            this.cancel();
          },
          error: (err) => {
            Swal.fire({
              icon: 'error',
              title: 'Error',
              text: err?.error?.message || err?.message || 'Failed to update Payment Terms',
              confirmButtonText: 'OK',
              confirmButtonColor: '#d33'
            });
          }
        });
    } else {
      this.PaymentTermsService.createPaymentTerms(payload).subscribe({
        next: (res: any) => {
          if (res?.isSuccess === false) {
            Swal.fire({
              icon: 'error',
              title: 'Error',
              text: res?.message || 'Failed to create Payment Terms',
              confirmButtonText: 'OK',
              confirmButtonColor: '#d33'
            });
            return;
          }

          Swal.fire({
            icon: 'success',
            title: 'Created!',
            text: res?.message || 'Payment Terms created successfully',
            confirmButtonText: 'OK',
            confirmButtonColor: '#0e3a4c'
          });

          this.loadPaymentTerms();
          this.cancel();
        },
        error: (err) => {
          Swal.fire({
            icon: 'error',
            title: 'Error',
            text: err?.error?.message || err?.message || 'Failed to create Payment Terms',
            confirmButtonText: 'OK',
            confirmButtonColor: '#d33'
          });
        }
      });
    }
  }

  confirmdeletePaymentTerms(data: any): void {
    if (!this.canDelete()) {
      Swal.fire({
        icon: 'warning',
        title: 'Access Denied',
        text: 'You do not have delete permission.',
        confirmButtonColor: '#0e3a4c'
      });
      return;
    }

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
      }
    });
  }

  deletePaymentTerms(item: any): void {
    this.PaymentTermsService.deletePaymentTerms(item.id).subscribe({
      next: (res: any) => {
        Swal.fire({
          icon: 'success',
          title: 'Deleted!',
          text: res?.message || 'Payment Terms deleted successfully',
          confirmButtonColor: '#3085d6'
        });

        this.loadPaymentTerms();
      },
      error: (err) => {
        Swal.fire({
          icon: 'error',
          title: 'Error',
          text: err?.error?.message || err?.message || 'Failed to delete Payment Terms',
          confirmButtonColor: '#d33'
        });
      }
    });
  }
}