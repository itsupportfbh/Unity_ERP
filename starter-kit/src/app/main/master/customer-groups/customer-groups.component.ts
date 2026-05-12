import {
  AfterViewChecked,
  AfterViewInit,
  Component,
  OnInit,
  ViewChild,
  ViewEncapsulation
} from '@angular/core';
import { NgForm } from '@angular/forms';
import * as feather from 'feather-icons';
import Swal from 'sweetalert2';

import { CustomerGroupsService } from './customer-groups.service';
import { FunctionPermission, PermissionService } from 'app/shared/permission.service';

@Component({
  selector: 'app-customer-groups',
  templateUrl: './customer-groups.component.html',
  styleUrls: ['./customer-groups.component.scss'],
  encapsulation: ViewEncapsulation.None
})
export class CustomerGroupsComponent implements OnInit, AfterViewInit, AfterViewChecked {
  @ViewChild('addForm') addFormForm!: NgForm;

  public id = 0;
  public Name: string = '';
  public description: string = '';

  isDisplay = false;
  modeHeader: string = 'Add Customer Group';
  resetButton = true;

  rows: any[] = [];
  tempData: any;
  customerGroupValue: any;
  isEditMode = false;

  userId: number = 0;

  // IMPORTANT: unga DB/Menu permission code exact ah match aaganum
  functionId = 'customergroups';

  permission: FunctionPermission;
  isPermissionLoaded = false;
  isPageLoading = false;

  constructor(
    private _customerService: CustomerGroupsService,
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
          this.getAllCustomerGroups();
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

  createCustomerGroups(): void {
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
    this.modeHeader = 'Create Customer Group';
    this.reset();
  }

  reset(): void {
    this.modeHeader = this.isEditMode ? 'Edit Customer Group' : 'Create Customer Group';
    this.Name = '';
    this.description = '';
    this.id = 0;
  }

  getAllCustomerGroups(): void {
    this._customerService.getCustomer().subscribe({
      next: (response: any) => {
        this.rows = response?.data || [];
        this.tempData = this.rows;
      },
      error: (err) => {
        console.error('Load customer groups error:', err);
        this.rows = [];
      }
    });
  }

  CreateCustomerGroups(): void {
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
      this._customerService.insertCustomer(obj).subscribe({
        next: (res: any) => {
          if (res?.isSuccess) {
            Swal.fire({
              title: 'Success',
              text: res.message || 'Customer group created successfully',
              icon: 'success',
              allowOutsideClick: false,
              confirmButtonColor: '#0e3a4c'
            });

            this.getAllCustomerGroups();
            this.isDisplay = false;
            this.isEditMode = false;
          } else {
            Swal.fire({
              title: 'Error',
              text: res?.message || 'Failed to create customer group',
              icon: 'error',
              allowOutsideClick: false,
              confirmButtonColor: '#d33'
            });
          }
        },
        error: (err) => {
          Swal.fire({
            title: 'Error',
            text: err?.error?.message || err?.message || 'Failed to create customer group',
            icon: 'error',
            allowOutsideClick: false,
            confirmButtonColor: '#d33'
          });
        }
      });
    } else {
      this._customerService.updateCustomer(obj).subscribe({
        next: (res: any) => {
          if (res?.isSuccess) {
            Swal.fire({
              title: 'Success',
              text: res.message || 'Customer group updated successfully',
              icon: 'success',
              allowOutsideClick: false,
              confirmButtonColor: '#0e3a4c'
            });

            this.getAllCustomerGroups();
            this.isDisplay = false;
            this.isEditMode = false;
          } else {
            Swal.fire({
              title: 'Error',
              text: res?.message || 'Failed to update customer group',
              icon: 'error',
              allowOutsideClick: false,
              confirmButtonColor: '#d33'
            });
          }
        },
        error: (err) => {
          Swal.fire({
            title: 'Error',
            text: err?.error?.message || err?.message || 'Failed to update customer group',
            icon: 'error',
            allowOutsideClick: false,
            confirmButtonColor: '#d33'
          });
        }
      });
    }
  }

  getCustomerGroupsDetails(id: any): void {
    if (!this.canEdit()) {
      Swal.fire({
        icon: 'warning',
        title: 'Access Denied',
        text: 'You do not have edit permission.',
        confirmButtonColor: '#0e3a4c'
      });
      return;
    }

    this._customerService.getCustomerById(id).subscribe({
      next: (arg: any) => {
        this.customerGroupValue = arg?.data;

        this.id = this.customerGroupValue?.id || 0;
        this.Name = this.customerGroupValue?.name || '';
        this.description = this.customerGroupValue?.description || '';

        this.isDisplay = true;
        this.resetButton = false;
        this.modeHeader = 'Edit Customer Group';
        this.isEditMode = true;
      },
      error: (err) => {
        Swal.fire({
          icon: 'error',
          title: 'Error',
          text: err?.error?.message || err?.message || 'Unable to load customer group details',
          confirmButtonColor: '#d33'
        });
      }
    });
  }

  deleteCustomerGroups(id: any): void {
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
        this._customerService.deleteCustomer(id).subscribe({
          next: (response: any) => {
            if (response?.isSuccess) {
              Swal.fire({
                icon: 'success',
                title: 'Deleted!',
                text: response.message || 'Customer group deleted successfully',
                allowOutsideClick: false,
                confirmButtonColor: '#3085d6'
              });
            } else {
              Swal.fire({
                icon: 'error',
                title: 'Error!',
                text: response?.message || 'Failed to delete customer group',
                allowOutsideClick: false,
                confirmButtonColor: '#d33'
              });
            }

            this.getAllCustomerGroups();
          },
          error: (err) => {
            Swal.fire({
              icon: 'error',
              title: 'Error!',
              text: err?.error?.message || err?.message || 'Failed to delete customer group',
              allowOutsideClick: false,
              confirmButtonColor: '#d33'
            });
          }
        });
      }
    });
  }
}