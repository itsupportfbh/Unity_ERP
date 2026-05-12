import {
  AfterViewChecked,
  AfterViewInit,
  Component,
  OnInit,
  ViewChild,
  ViewEncapsulation
} from '@angular/core';
import { NgForm } from '@angular/forms';
import Swal from 'sweetalert2';
import * as feather from 'feather-icons';

import { UomConversionService } from '../uomconversion-service';
import { UomService } from '../../uom/uom.service';
import { FunctionPermission, PermissionService } from 'app/shared/permission.service';

@Component({
  selector: 'app-uomconversion',
  templateUrl: './uomconversion.component.html',
  styleUrls: ['./uomconversion.component.scss'],
  encapsulation: ViewEncapsulation.None
})
export class UomconversionComponent implements OnInit, AfterViewChecked, AfterViewInit {
  @ViewChild('addForm') addForm!: NgForm;

  conversionList: any[] = [];
  uomList: any[] = [];

  fromUomId: number | null = null;
  toUomId: number | null = null;
  factor: number | null = null;
  description: string = '';

  isEditMode = false;
  selectedRow: any = null;
  isDisplay = false;

  userId: number = 0;

  // IMPORTANT: DB/Menu permission code exact ah match aaganum
  functionId = 'uomconversion';

  permission: FunctionPermission;
  isPermissionLoaded = false;
  isPageLoading = false;

  constructor(
    private uomService: UomService,
    private conversionService: UomConversionService,
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
          this.loadUoms();
          this.loadConversions();
        } else {
          this.uomList = [];
          this.conversionList = [];
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

  loadUoms(): void {
    this.uomService.getAllUom().subscribe({
      next: (res: any) => {
        this.uomList = (res?.data || []).filter((x: any) => x.isActive === true);
      },
      error: (err) => {
        console.error('Load UOM error:', err);
        this.uomList = [];
      }
    });
  }

  loadConversions(): void {
    this.conversionService.getAll().subscribe({
      next: (res: any) => {
        this.conversionList = res?.data || [];
        setTimeout(() => feather.replace(), 0);
      },
      error: (err) => {
        console.error('Load UOM conversions error:', err);
        this.conversionList = [];
      }
    });
  }

  createRow(): void {
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
    this.selectedRow = null;
    this.reset();
  }

  editRow(row: any): void {
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
    this.selectedRow = row;

    this.fromUomId = row.fromUomId;
    this.toUomId = row.toUomId;
    this.factor = row.factor;
    this.description = row.description || '';
  }

  cancel(): void {
    this.isDisplay = false;
    this.isEditMode = false;
    this.selectedRow = null;
  }

  reset(): void {
    this.fromUomId = null;
    this.toUomId = null;
    this.factor = null;
    this.description = '';
  }

  onSubmit(form: NgForm): void {
    if (!form.valid) {
      Swal.fire({
        icon: 'warning',
        title: 'Warning',
        text: 'Please fill all required fields',
        confirmButtonColor: '#0e3a4c'
      });
      return;
    }

    if (this.fromUomId === this.toUomId) {
      Swal.fire({
        icon: 'warning',
        title: 'Warning',
        text: 'From UOM and To UOM cannot be same',
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
      fromUomId: this.fromUomId,
      toUomId: this.toUomId,
      factor: Number(this.factor || 0),
      description: this.description,
      createdBy: this.userId,
      updatedBy: this.userId,
      updatedDate: new Date(),
      isActive: true
    };

    if (this.isEditMode) {
      const body = {
        ...this.selectedRow,
        ...payload
      };

      this.conversionService.update(this.selectedRow.id, body).subscribe({
        next: (res: any) => {
          if (res?.isSuccess === false) {
            Swal.fire({
              icon: 'error',
              title: 'Error',
              text: res?.message || 'Failed to update UOM Conversion',
              confirmButtonColor: '#d33'
            });
            return;
          }

          Swal.fire({
            icon: 'success',
            title: 'Updated!',
            text: res?.message || 'UOM Conversion updated successfully',
            confirmButtonColor: '#0e3a4c'
          });

          this.loadConversions();
          this.cancel();
        },
        error: (err) => {
          Swal.fire({
            icon: 'error',
            title: 'Error',
            text: err?.error?.message || err?.message || 'Failed to update UOM Conversion',
            confirmButtonColor: '#d33'
          });
        }
      });
    } else {
      this.conversionService.create(payload).subscribe({
        next: (res: any) => {
          if (res?.isSuccess === false) {
            Swal.fire({
              icon: 'error',
              title: 'Error',
              text: res?.message || 'Failed to create UOM Conversion',
              confirmButtonColor: '#d33'
            });
            return;
          }

          Swal.fire({
            icon: 'success',
            title: 'Created!',
            text: res?.message || 'UOM Conversion created successfully',
            confirmButtonColor: '#0e3a4c'
          });

          this.loadConversions();
          this.cancel();
        },
        error: (err) => {
          Swal.fire({
            icon: 'error',
            title: 'Error',
            text: err?.error?.message || err?.message || 'Failed to create UOM Conversion',
            confirmButtonColor: '#d33'
          });
        }
      });
    }
  }

  confirmDelete(row: any): void {
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
      text: 'Are you sure you want to delete this conversion?',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Delete',
      cancelButtonText: 'Cancel',
      confirmButtonColor: '#d33',
      cancelButtonColor: '#3085d6'
    }).then(result => {
      if (result.isConfirmed) {
        this.deleteRow(row);
      }
    });
  }

  deleteRow(row: any): void {
    this.conversionService.delete(row.id).subscribe({
      next: (res: any) => {
        Swal.fire({
          icon: 'success',
          title: 'Deleted!',
          text: res?.message || 'UOM Conversion deleted successfully',
          confirmButtonColor: '#3085d6'
        });

        this.loadConversions();
      },
      error: (err) => {
        Swal.fire({
          icon: 'error',
          title: 'Error',
          text: err?.error?.message || err?.message || 'Failed to delete UOM Conversion',
          confirmButtonColor: '#d33'
        });
      }
    });
  }
}