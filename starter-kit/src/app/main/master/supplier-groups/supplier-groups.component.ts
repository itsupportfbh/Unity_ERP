import {
  AfterViewChecked,
  AfterViewInit,
  Component,
  OnInit,
  ViewChild,
  ViewEncapsulation
} from '@angular/core';
import Swal from 'sweetalert2';
import { SupplierGroupsService } from './supplier-groups.service';
import * as feather from 'feather-icons';
import { NgForm } from '@angular/forms';
import { FunctionPermission, PermissionService } from 'app/shared/permission.service';

@Component({
  selector: 'app-supplier-groups',
  templateUrl: './supplier-groups.component.html',
  styleUrls: ['./supplier-groups.component.scss'],
  encapsulation: ViewEncapsulation.None
})
export class SupplierGroupsComponent implements OnInit, AfterViewInit, AfterViewChecked {
  @ViewChild('addForm') addFormForm!: NgForm;

  public id = 0;
  public Name: string = '';
  public description: string = '';

  isDisplay = false;
  modeHeader: string = 'Add Supplier Group';
  resetButton = true;

  rows: any[] = [];
  tempData: any;
  isEditMode = false;
  supplierGroupValue: any;

  userId: number = 0;

  // IMPORTANT: DB/Menu permission code exact ah match aaganum
  functionId = 'suppliergroups';

  permission: FunctionPermission;
  isPermissionLoaded = false;
  isPageLoading = false;

  constructor(
    private _supplierService: SupplierGroupsService,
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
          this.getAllSupplierGroups();
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

  createSupplierGroups(): void {
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
    this.resetButton = true;
    this.modeHeader = 'Create Supplier Group';
    this.reset();
  }

  reset(): void {
    this.modeHeader = this.isEditMode ? 'Edit Supplier Group' : 'Create Supplier Group';
    this.Name = '';
    this.description = '';
    this.id = 0;
  }

  getAllSupplierGroups(): void {
    this._supplierService.getSupplier().subscribe({
      next: (response: any) => {
        this.rows = response?.data || [];
        this.tempData = this.rows;
      },
      error: (err) => {
        console.error('Load supplier groups error:', err);
        this.rows = [];
      }
    });
  }

  CreateSupplierGroups(): void {
    if (!this.Name || !this.description) {
      Swal.fire({
        icon: 'warning',
        title: 'Warning',
        text: 'Please fill all required fields',
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
      name: this.Name,
      description: this.description,
      createdBy: this.userId,
      createdDate: new Date(),
      updatedBy: this.userId,
      updatedDate: new Date(),
      isActive: true
    };

    if (this.id === 0) {
      this._supplierService.insertSupplier(obj).subscribe({
        next: (res: any) => {
          if (res?.isSuccess) {
            Swal.fire({
              title: 'Success',
              text: res.message || 'Supplier group created successfully',
              icon: 'success',
              allowOutsideClick: false,
              confirmButtonColor: '#0e3a4c'
            });

            this.getAllSupplierGroups();
            this.isDisplay = false;
            this.isEditMode = false;
          } else {
            Swal.fire({
              title: 'Error',
              text: res?.message || 'Failed to create supplier group',
              icon: 'error',
              allowOutsideClick: false,
              confirmButtonColor: '#d33'
            });
          }
        },
        error: (err) => {
          Swal.fire({
            title: 'Error',
            text: err?.error?.message || err?.message || 'Failed to create supplier group',
            icon: 'error',
            allowOutsideClick: false,
            confirmButtonColor: '#d33'
          });
        }
      });
    } else {
      this._supplierService.updateSupplier(obj).subscribe({
        next: (res: any) => {
          if (res?.isSuccess) {
            Swal.fire({
              title: 'Success',
              text: res.message || 'Supplier group updated successfully',
              icon: 'success',
              allowOutsideClick: false,
              confirmButtonColor: '#0e3a4c'
            });

            this.getAllSupplierGroups();
            this.isDisplay = false;
            this.isEditMode = false;
          } else {
            Swal.fire({
              title: 'Error',
              text: res?.message || 'Failed to update supplier group',
              icon: 'error',
              allowOutsideClick: false,
              confirmButtonColor: '#d33'
            });
          }
        },
        error: (err) => {
          Swal.fire({
            title: 'Error',
            text: err?.error?.message || err?.message || 'Failed to update supplier group',
            icon: 'error',
            allowOutsideClick: false,
            confirmButtonColor: '#d33'
          });
        }
      });
    }
  }

  getSupplierGroupsDetails(id: any): void {
    if (!this.canEdit()) {
      Swal.fire({
        icon: 'warning',
        title: 'Access Denied',
        text: 'You do not have edit permission.',
        confirmButtonColor: '#0e3a4c'
      });
      return;
    }

    this._supplierService.getSupplierById(id).subscribe({
      next: (arg: any) => {
        this.supplierGroupValue = arg?.data;

        this.id = this.supplierGroupValue?.id || 0;
        this.Name = this.supplierGroupValue?.name || '';
        this.description = this.supplierGroupValue?.description || '';

        this.isDisplay = true;
        this.resetButton = false;
        this.modeHeader = 'Edit Supplier Group';
        this.isEditMode = true;
      },
      error: (err) => {
        Swal.fire({
          icon: 'error',
          title: 'Error',
          text: err?.error?.message || err?.message || 'Unable to load supplier group details',
          confirmButtonColor: '#d33'
        });
      }
    });
  }

  deleteSupplierGroups(id: any, isUsed?: any): void {
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
        text: 'This supplier group is already used.',
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
        this._supplierService.deleteSupplier(id).subscribe({
          next: (response: any) => {
            if (response?.isSuccess) {
              Swal.fire({
                icon: 'success',
                title: 'Deleted!',
                text: response.message || 'Supplier group deleted successfully',
                allowOutsideClick: false,
                confirmButtonColor: '#3085d6'
              });
            } else {
              Swal.fire({
                icon: 'error',
                title: 'Error!',
                text: response?.message || 'Failed to delete supplier group',
                allowOutsideClick: false,
                confirmButtonColor: '#d33'
              });
            }

            this.getAllSupplierGroups();
          },
          error: (err) => {
            Swal.fire({
              icon: 'error',
              title: 'Error!',
              text: err?.error?.message || err?.message || 'Failed to delete supplier group',
              allowOutsideClick: false,
              confirmButtonColor: '#d33'
            });
          }
        });
      }
    });
  }
}