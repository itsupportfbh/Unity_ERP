import {
  AfterViewInit,
  AfterViewChecked,
  Component,
  OnInit,
  ViewChild,
  ViewEncapsulation
} from '@angular/core';
import { NgForm } from '@angular/forms';
import * as feather from 'feather-icons';
import Swal from 'sweetalert2';

import { TaxCodeService } from './taxcode.service';
import { FunctionPermission, PermissionService } from 'app/shared/permission.service';

@Component({
  selector: 'app-taxcode',
  templateUrl: './taxcode.component.html',
  styleUrls: ['./taxcode.component.scss'],
  encapsulation: ViewEncapsulation.None
})
export class TaxcodeComponent implements OnInit, AfterViewInit, AfterViewChecked {
  @ViewChild('taxCodeForm') taxCodeForm!: NgForm;

  public id = 0;
  public name = '';
  public description = '';
  public rate: number | null = null;
  public typeId: number | null = null;

  isDisplay = false;
  modeHeader: string = 'Add TaxCode';
  resetButton = true;

  rows: any[] = [];
  tempData: any;
  taxCodeValue: any;
  isEditMode = false;

  userId: number = 0;

  // IMPORTANT: DB/Menu permission code exact ah match aaganum
  functionId = 'taxcode';

  permission: FunctionPermission;
  isPermissionLoaded = false;
  isPageLoading = false;

  taxTypes = [
    { id: 1, name: 'Input GST' },
    { id: 2, name: 'Output GST' }
  ];

  constructor(
    private taxCodeService: TaxCodeService,
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
          this.getAllTaxCode();
        } else {
          this.rows = [];
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

  cancel(): void {
    this.isDisplay = false;
    this.isEditMode = false;
    this.resetButton = true;
  }

  createTaxCode(): void {
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
    this.modeHeader = 'Create TaxCode';
    this.resetButton = true;
    this.isEditMode = false;
    this.reset();
  }

  reset(): void {
    this.modeHeader = this.isEditMode ? 'Edit TaxCode' : 'Create TaxCode';
    this.id = 0;
    this.name = '';
    this.description = '';
    this.rate = null;
    this.typeId = null;

    if (this.taxCodeForm) {
      this.taxCodeForm.resetForm();
    }
  }

  getAllTaxCode(): void {
    this.taxCodeService.getTaxCode().subscribe({
      next: (response: any) => {
        this.rows = response?.data || [];
        this.tempData = this.rows;
      },
      error: (err) => {
        console.error('Load tax code error:', err);
        this.rows = [];
      }
    });
  }

  saveTaxCode(): void {
    if (!this.name || !this.name.trim() || !this.typeId || this.rate === null) {
      Swal.fire({
        icon: 'warning',
        title: 'Warning',
        text: 'Name, Type and Rate are required.',
        confirmButtonColor: '#0e3a4c'
      });
      return;
    }

    if (this.id > 0 && !this.canEdit()) {
      Swal.fire({
        icon: 'warning',
        title: 'Access Denied',
        text: 'You do not have edit permission.',
        confirmButtonColor: '#0e3a4c'
      });
      return;
    }

    if (this.id === 0 && !this.canCreate()) {
      Swal.fire({
        icon: 'warning',
        title: 'Access Denied',
        text: 'You do not have create permission.',
        confirmButtonColor: '#0e3a4c'
      });
      return;
    }

    const obj = {
      id: this.id,
      name: this.name.trim(),
      description: this.description,
      typeId: this.typeId,
      rate: Number(this.rate || 0),
      createdBy: this.userId,
      createdDate: new Date(),
      updatedBy: this.userId,
      updatedDate: new Date(),
      isActive: true
    };

    if (this.id === 0) {
      this.taxCodeService.insertTaxCode(obj).subscribe({
        next: (res: any) => {
          if (res?.isSuccess) {
            Swal.fire({
              title: 'Success',
              text: res.message || 'TaxCode created successfully',
              icon: 'success',
              allowOutsideClick: false,
              confirmButtonColor: '#0e3a4c'
            });

            this.getAllTaxCode();
            this.isDisplay = false;
            this.isEditMode = false;
          } else {
            Swal.fire({
              title: 'Error',
              text: res?.message || 'Failed to create TaxCode',
              icon: 'error',
              allowOutsideClick: false,
              confirmButtonColor: '#d33'
            });
          }
        },
        error: (err) => {
          Swal.fire({
            title: 'Error',
            text: err?.error?.message || err?.message || 'Failed to create TaxCode',
            icon: 'error',
            allowOutsideClick: false,
            confirmButtonColor: '#d33'
          });
        }
      });
    } else {
      this.taxCodeService.updateTaxCode(obj).subscribe({
        next: (res: any) => {
          if (res?.isSuccess) {
            Swal.fire({
              title: 'Success',
              text: res.message || 'TaxCode updated successfully',
              icon: 'success',
              allowOutsideClick: false,
              confirmButtonColor: '#0e3a4c'
            });

            this.getAllTaxCode();
            this.isDisplay = false;
            this.isEditMode = false;
          } else {
            Swal.fire({
              title: 'Error',
              text: res?.message || 'Failed to update TaxCode',
              icon: 'error',
              allowOutsideClick: false,
              confirmButtonColor: '#d33'
            });
          }
        },
        error: (err) => {
          Swal.fire({
            title: 'Error',
            text: err?.error?.message || err?.message || 'Failed to update TaxCode',
            icon: 'error',
            allowOutsideClick: false,
            confirmButtonColor: '#d33'
          });
        }
      });
    }
  }

  getTaxCodeDetails(id: any): void {
    if (!this.canEdit()) {
      Swal.fire({
        icon: 'warning',
        title: 'Access Denied',
        text: 'You do not have edit permission.',
        confirmButtonColor: '#0e3a4c'
      });
      return;
    }

    this.taxCodeService.getTaxCodeById(id).subscribe({
      next: (arg: any) => {
        this.taxCodeValue = arg?.data;

        this.id = this.taxCodeValue?.id || 0;
        this.name = this.taxCodeValue?.name || '';
        this.description = this.taxCodeValue?.description || '';
        this.typeId = this.taxCodeValue?.typeId || null;
        this.rate = this.taxCodeValue?.rate ?? null;

        this.isDisplay = true;
        this.resetButton = false;
        this.modeHeader = 'Edit TaxCode';
        this.isEditMode = true;
      },
      error: (err) => {
        Swal.fire({
          icon: 'error',
          title: 'Error',
          text: err?.error?.message || err?.message || 'Unable to load TaxCode details',
          confirmButtonColor: '#d33'
        });
      }
    });
  }

  deleteTaxCode(id: any, isUsed?: boolean): void {
    if (!this.canDelete()) {
      Swal.fire({
        icon: 'warning',
        title: 'Access Denied',
        text: 'You do not have delete permission.',
        confirmButtonColor: '#0e3a4c'
      });
      return;
    }

    if (isUsed) {
      Swal.fire({
        icon: 'warning',
        title: 'Cannot Delete',
        text: 'This TaxCode is already used.',
        confirmButtonColor: '#0e3a4c'
      });
      return;
    }

    Swal.fire({
      title: 'Are you sure?',
      text: 'You will not be able to revert this!',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#d33',
      cancelButtonColor: '#3085d6',
      confirmButtonText: 'Yes, Delete it!',
      cancelButtonText: 'Cancel',
      allowOutsideClick: false
    }).then((result) => {
      if (result.isConfirmed) {
        this.taxCodeService.deleteTaxCode(id).subscribe({
          next: (response: any) => {
            Swal.fire({
              icon: response?.isSuccess ? 'success' : 'error',
              title: response?.isSuccess ? 'Deleted!' : 'Error!',
              text: response?.message || (
                response?.isSuccess
                  ? 'TaxCode deleted successfully'
                  : 'Failed to delete TaxCode'
              ),
              allowOutsideClick: false
            });

            this.getAllTaxCode();
          },
          error: (err) => {
            Swal.fire({
              icon: 'error',
              title: 'Error!',
              text: err?.error?.message || err?.message || 'Failed to delete TaxCode',
              allowOutsideClick: false,
              confirmButtonColor: '#d33'
            });
          }
        });
      }
    });
  }
}