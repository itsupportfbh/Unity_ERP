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

import { IncotermsService } from './incoterms.service';
import { FunctionPermission, PermissionService } from 'app/shared/permission.service';

@Component({
  selector: 'app-incoterms',
  templateUrl: './incoterms.component.html',
  styleUrls: ['./incoterms.component.scss'],
  encapsulation: ViewEncapsulation.None
})
export class IncotermsComponent implements OnInit, AfterViewInit, AfterViewChecked {
  @ViewChild('addForm') addForm!: NgForm;

  incotermsList: any[] = [];
  incotermsName: string = '';
  description: string = '';

  isEditMode = false;
  selectedIncoterms: any = null;
  public isDisplay = false;
  modeHeader: string = 'Add Incoterms';

  userId: number = 0;

  // IMPORTANT: DB/Menu permission code exact ah match aaganum
  functionId = 'incoterms';

  permission: FunctionPermission;
  isPermissionLoaded = false;
  isPageLoading = false;

  constructor(
    private fb: FormBuilder,
    private incotermsService: IncotermsService,
    private permissionService: PermissionService
  ) {
    this.userId = Number(localStorage.getItem('id') || 0);
    this.permission = this.permissionService.getEmptyPermission(this.functionId);
  }

  ngOnInit(): void {
    this.loadPermission();
  }

  ngAfterViewInit(): void {
    feather.replace();
  }

  ngAfterViewChecked(): void {
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
          this.loadIncoterms();
        } else {
          this.incotermsList = [];
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

  loadIncoterms(): void {
    this.incotermsService.getAllIncoterms().subscribe({
      next: (res: any) => {
        this.incotermsList = (res?.data || []).filter((item: any) => item.isActive === true);
        setTimeout(() => feather.replace(), 0);
      },
      error: (err) => {
        console.error('Load incoterms error:', err);
        this.incotermsList = [];
      }
    });
  }

  createIncoterms(): void {
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
    this.selectedIncoterms = null;
    this.modeHeader = 'Create Incoterms';
    this.reset();
  }

  editIncoterms(data: any): void {
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
    this.selectedIncoterms = data;

    this.incotermsName = data.incotermsName || '';
    this.description = data.description || '';
    this.modeHeader = 'Edit Incoterms';
  }

  cancel(): void {
    this.isEditMode = false;
    this.isDisplay = false;
    this.selectedIncoterms = null;
  }

  reset(): void {
    this.incotermsName = '';
    this.description = '';
    this.modeHeader = this.isEditMode ? 'Edit Incoterms' : 'Create Incoterms';
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
      IncotermsName: this.incotermsName,
      Description: this.description,
      CreatedBy: this.userId,
      UpdatedBy: this.userId,
      CreatedDate: new Date(),
      UpdatedDate: new Date(),
      IsActive: true
    };

    const handleResponse = (res: any, successMsg: string) => {
      if (res?.isSuccess === false) {
        Swal.fire({
          icon: 'warning',
          title: 'Warning',
          text: res?.message || 'Operation failed',
          confirmButtonText: 'OK',
          confirmButtonColor: '#0e3a4c'
        });
        return;
      }

      Swal.fire({
        icon: 'success',
        title: 'Success!',
        text: res?.message || successMsg,
        confirmButtonText: 'OK',
        confirmButtonColor: '#0e3a4c'
      });

      this.loadIncoterms();
      this.cancel();
    };

    const handleError = (err: any, fallbackMsg: string) => {
      Swal.fire({
        icon: 'error',
        title: 'Error',
        text: err?.error?.message || err?.message || fallbackMsg,
        confirmButtonText: 'OK',
        confirmButtonColor: '#d33'
      });
    };

    if (this.isEditMode) {
      const updatedIncoterms = {
        ...this.selectedIncoterms,
        ...payload
      };

      this.incotermsService
        .updateIncoterms(this.selectedIncoterms.id, updatedIncoterms)
        .subscribe({
          next: (res: any) => handleResponse(res, 'Incoterms updated successfully'),
          error: (err: any) => handleError(err, 'Failed to update Incoterms')
        });
    } else {
      this.incotermsService
        .createIncoterms(payload)
        .subscribe({
          next: (res: any) => handleResponse(res, 'Incoterms created successfully'),
          error: (err: any) => handleError(err, 'Failed to create Incoterms')
        });
    }
  }

  confirmdeleteIncoterms(data: any): void {
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
        this.deleteIncoterms(data);
      }
    });
  }

  deleteIncoterms(item: any): void {
    this.incotermsService.deleteIncoterms(item.id).subscribe({
      next: (res: any) => {
        Swal.fire({
          icon: 'success',
          title: 'Deleted!',
          text: res?.message || 'Incoterms deleted successfully',
          confirmButtonColor: '#3085d6'
        });

        this.loadIncoterms();
      },
      error: (err) => {
        Swal.fire({
          icon: 'error',
          title: 'Error',
          text: err?.error?.message || err?.message || 'Failed to delete Incoterms',
          confirmButtonColor: '#d33'
        });
      }
    });
  }
}