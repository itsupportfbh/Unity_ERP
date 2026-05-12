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

import { VehicleService } from './vehicle.service';
import { FunctionPermission, PermissionService } from 'app/shared/permission.service';

@Component({
  selector: 'app-vehicle',
  templateUrl: './vehicle.component.html',
  styleUrls: ['./vehicle.component.scss'],
  encapsulation: ViewEncapsulation.None
})
export class VehicleComponent implements OnInit, AfterViewInit, AfterViewChecked {
  @ViewChild('addForm') addForm!: NgForm;

  vehicleList: any[] = [];
  isDisplay = false;
  isEditMode = false;
  selected: any = null;

  vehicleNo = '';
  vehicleType = '';
  capacity: number | null = null;
  capacityUom = 'KG';

  userId: number = 0;

  // IMPORTANT: DB/Menu permission code exact ah match aaganum
  functionId = 'vehicle';

  permission: FunctionPermission;
  isPermissionLoaded = false;
  isPageLoading = false;

  constructor(
    private vehicleSvc: VehicleService,
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
          this.loadVehicles();
        } else {
          this.vehicleList = [];
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

  loadVehicles(): void {
    this.vehicleSvc.getVehicles().subscribe({
      next: (res: any) => {
        this.vehicleList = (res?.data || []).filter((x: any) => x.isActive === true);
        setTimeout(() => feather.replace(), 0);
      },
      error: (err) => {
        console.error('Load vehicles error:', err);
        this.vehicleList = [];
      }
    });
  }

  createVehicle(): void {
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
    this.selected = null;
    this.reset();
  }

  editVehicle(row: any): void {
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
    this.selected = row;

    this.vehicleNo = row.vehicleNo || '';
    this.vehicleType = row.vehicleType || '';
    this.capacity = row.capacity ?? null;
    this.capacityUom = row.capacityUom || 'KG';
  }

  cancel(): void {
    this.isDisplay = false;
    this.isEditMode = false;
    this.selected = null;
  }

  reset(): void {
    this.vehicleNo = '';
    this.vehicleType = '';
    this.capacity = null;
    this.capacityUom = 'KG';
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
      vehicleNo: this.vehicleNo.trim(),
      vehicleType: this.vehicleType || null,
      capacity: this.capacity,
      capacityUom: this.capacityUom || null,
      createdBy: this.userId,
      updatedBy: this.userId,
      isActive: true
    };

    if (this.isEditMode) {
      this.vehicleSvc.updateVehicle(this.selected.id, payload).subscribe({
        next: (res: any) => {
          if (res?.isSuccess === false) {
            Swal.fire({
              icon: 'error',
              title: 'Error',
              text: res?.message || 'Failed to update vehicle',
              confirmButtonColor: '#d33'
            });
            return;
          }

          Swal.fire({
            icon: 'success',
            title: 'Updated!',
            text: res?.message || 'Vehicle updated successfully',
            confirmButtonColor: '#0e3a4c'
          });

          this.loadVehicles();
          this.cancel();
        },
        error: (err) => {
          Swal.fire({
            icon: 'error',
            title: 'Error',
            text: err?.error?.message || err?.message || 'Failed to update vehicle',
            confirmButtonColor: '#d33'
          });
        }
      });
    } else {
      this.vehicleSvc.createVehicle(payload).subscribe({
        next: (res: any) => {
          if (res?.isSuccess === false) {
            Swal.fire({
              icon: 'error',
              title: 'Error',
              text: res?.message || 'Failed to create vehicle',
              confirmButtonColor: '#d33'
            });
            return;
          }

          Swal.fire({
            icon: 'success',
            title: 'Created!',
            text: res?.message || 'Vehicle created successfully',
            confirmButtonColor: '#0e3a4c'
          });

          this.loadVehicles();
          this.cancel();
        },
        error: (err) => {
          Swal.fire({
            icon: 'error',
            title: 'Error',
            text: err?.error?.message || err?.message || 'Failed to create vehicle',
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
      text: `Deactivate vehicle ${row.vehicleNo}?`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Delete',
      cancelButtonText: 'Cancel',
      confirmButtonColor: '#d33',
      cancelButtonColor: '#3085d6'
    }).then(result => {
      if (result.isConfirmed) {
        this.deleteVehicle(row);
      }
    });
  }

  deleteVehicle(row: any): void {
    this.vehicleSvc.deleteVehicle(row.id).subscribe({
      next: (res: any) => {
        Swal.fire({
          icon: 'success',
          title: 'Deleted!',
          text: res?.message || 'Vehicle deactivated',
          confirmButtonColor: '#3085d6'
        });

        this.loadVehicles();
      },
      error: (err) => {
        Swal.fire({
          icon: 'error',
          title: 'Error',
          text: err?.error?.message || err?.message || 'Failed to delete vehicle',
          confirmButtonColor: '#d33'
        });
      }
    });
  }
}