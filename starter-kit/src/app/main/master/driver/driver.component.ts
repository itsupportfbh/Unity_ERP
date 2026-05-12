import {
  Component,
  OnInit,
  ViewChild,
  AfterViewChecked,
  ViewEncapsulation
} from '@angular/core';
import Swal from 'sweetalert2';
import * as feather from 'feather-icons';
import { NgForm } from '@angular/forms';

import { DriverService } from './driver.service';
import { FunctionPermission, PermissionService } from 'app/shared/permission.service';

@Component({
  selector: 'app-driver',
  templateUrl: './driver.component.html',
  styleUrls: ['./driver.component.scss'],
  encapsulation: ViewEncapsulation.None
})
export class DriverComponent implements OnInit, AfterViewChecked {
  @ViewChild('addForm') addForm!: NgForm;

  driverList: any[] = [];

  driverName: string = '';
  nricOrId: string = '';
  contactNumber: number | null = null;
  licenseNumber: string = '';
  licenseExpiryDate: string = '';
  remarks: string = '';

  isEditMode = false;
  selectedDriver: any = null;
  public isDisplay = false;
  modeHeader: string = 'Add Driver';

  userId: number = 0;

  // IMPORTANT: DB/Menu permission code exact ah match aaganum
  functionId = 'driver';

  permission: FunctionPermission;
  isPermissionLoaded = false;
  isPageLoading = false;

  constructor(
    private driverService: DriverService,
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
          this.loadDrivers();
        } else {
          this.driverList = [];
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

  loadDrivers(): void {
    this.driverService.getAllDriver().subscribe({
      next: (res: any) => {
        this.driverList = (res?.data || []).filter((x: any) => x.isActive === true);
        setTimeout(() => feather.replace(), 0);
      },
      error: (err) => {
        console.error('Load driver error:', err);
        this.driverList = [];
      }
    });
  }

  createDriver(): void {
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
    this.selectedDriver = null;
    this.modeHeader = 'Create Driver';
    this.reset();
  }

  editDriver(data: any): void {
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
    this.selectedDriver = data;
    this.modeHeader = 'Edit Driver';

    this.driverName = data.driverName || '';
    this.nricOrId = data.nricOrId || '';
    this.contactNumber = data.mobileNumber || null;
    this.licenseNumber = data.licenseNumber || '';
    this.licenseExpiryDate = data.licenseExpiryDate
      ? data.licenseExpiryDate.split('T')[0]
      : '';
    this.remarks = data.remarks || '';
  }

  cancel(): void {
    this.isDisplay = false;
    this.isEditMode = false;
    this.selectedDriver = null;
  }

  reset(): void {
    this.driverName = '';
    this.nricOrId = '';
    this.contactNumber = null;
    this.licenseNumber = '';
    this.licenseExpiryDate = '';
    this.remarks = '';
    this.modeHeader = this.isEditMode ? 'Edit Driver' : 'Create Driver';
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
      driverName: this.driverName,
      nricOrId: this.nricOrId,
      mobileNumber: this.contactNumber,
      licenseNumber: this.licenseNumber,
      licenseExpiryDate: this.licenseExpiryDate,
      remarks: this.remarks,
      createdBy: this.userId,
      updatedBy: this.userId,
      createdDate: new Date(),
      updatedDate: new Date(),
      isActive: true
    };

    if (this.isEditMode) {
      const updatedDriver = {
        ...this.selectedDriver,
        ...payload
      };

      this.driverService.updateDriver(this.selectedDriver.id, updatedDriver).subscribe({
        next: (res: any) => {
          if (res?.isSuccess === false) {
            Swal.fire({
              icon: 'error',
              title: 'Error',
              text: res?.message || 'Failed to update driver',
              confirmButtonColor: '#d33'
            });
            return;
          }

          Swal.fire({
            icon: 'success',
            title: 'Updated!',
            text: res?.message || 'Driver updated successfully',
            confirmButtonColor: '#0e3a4c'
          });

          this.loadDrivers();
          this.cancel();
        },
        error: (err) => {
          Swal.fire({
            icon: 'error',
            title: 'Error',
            text: err?.error?.message || err?.message || 'Failed to update driver',
            confirmButtonColor: '#d33'
          });
        }
      });
    } else {
      this.driverService.createDriver(payload).subscribe({
        next: (res: any) => {
          if (res?.isSuccess === false) {
            Swal.fire({
              icon: 'error',
              title: 'Error',
              text: res?.message || 'Failed to create driver',
              confirmButtonColor: '#d33'
            });
            return;
          }

          Swal.fire({
            icon: 'success',
            title: 'Created!',
            text: res?.message || 'Driver created successfully',
            confirmButtonColor: '#0e3a4c'
          });

          this.loadDrivers();
          this.cancel();
        },
        error: (err) => {
          Swal.fire({
            icon: 'error',
            title: 'Error',
            text: err?.error?.message || err?.message || 'Failed to create driver',
            confirmButtonColor: '#d33'
          });
        }
      });
    }
  }

  confirmDelete(data: any): void {
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
      title: 'Are you sure want to delete?',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#d33',
      cancelButtonColor: '#3085d6',
      confirmButtonText: 'Yes, delete',
      cancelButtonText: 'Cancel'
    }).then(result => {
      if (result.isConfirmed) {
        this.deleteDriver(data);
      }
    });
  }

  deleteDriver(item: any): void {
    this.driverService.deleteDriver(item.id).subscribe({
      next: (res: any) => {
        Swal.fire({
          icon: 'success',
          title: 'Deleted!',
          text: res?.message || 'Driver deleted successfully',
          confirmButtonColor: '#3085d6'
        });

        this.loadDrivers();
      },
      error: (err) => {
        Swal.fire({
          icon: 'error',
          title: 'Error',
          text: err?.error?.message || err?.message || 'Failed to delete driver',
          confirmButtonColor: '#d33'
        });
      }
    });
  }
}