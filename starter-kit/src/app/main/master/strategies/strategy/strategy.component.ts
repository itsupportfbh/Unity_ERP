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

import { StrategyService } from '../strategy.service';
import { FunctionPermission, PermissionService } from 'app/shared/permission.service';

@Component({
  selector: 'app-strategy',
  templateUrl: './strategy.component.html',
  styleUrls: ['./strategy.component.scss'],
  encapsulation: ViewEncapsulation.None
})
export class StrategyComponent implements OnInit, AfterViewInit, AfterViewChecked {
  @ViewChild('strategyForm') strategyForm!: NgForm;

  public id = 0;
  public strategyName = '';

  isDisplay = false;
  modeHeader: string = 'Add Frequency';
  resetButton = true;

  rows: any[] = [];
  tempData: any;
  strategyValue: any;
  isEditMode = false;

  userId: number = 0;

  // IMPORTANT: DB/Menu permission code exact ah match aaganum
  functionId = 'strategy';

  permission: FunctionPermission;
  isPermissionLoaded = false;
  isPageLoading = false;

  constructor(
    private strategyService: StrategyService,
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
          this.getAllStrategy();
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

  createStrategy(): void {
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
    this.modeHeader = 'Create Frequency';
    this.reset();
  }

  reset(): void {
    this.modeHeader = this.isEditMode ? 'Edit Frequency' : 'Create Frequency';
    this.strategyName = '';
    this.id = 0;
  }

  getAllStrategy(): void {
    this.strategyService.getStrategy().subscribe({
      next: (response: any) => {
        this.rows = response?.data || [];
        this.tempData = this.rows;
      },
      error: (err) => {
        console.error('Load frequency error:', err);
        this.rows = [];
      }
    });
  }

  saveStrategy(): void {
    if (!this.strategyName || !this.strategyName.trim()) {
      Swal.fire({
        icon: 'warning',
        title: 'Warning',
        text: 'Frequency Name is required.',
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
      strategyName: this.strategyName.trim(),
      createdBy: this.userId,
      createdDate: new Date(),
      updatedBy: this.userId,
      updatedDate: new Date(),
      isActive: true
    };

    if (this.id === 0) {
      this.strategyService.insertStrategy(obj).subscribe({
        next: (res: any) => {
          if (res?.isSuccess) {
            Swal.fire({
              title: 'Success',
              text: res.message || 'Frequency created successfully',
              icon: 'success',
              allowOutsideClick: false,
              confirmButtonColor: '#0e3a4c'
            });

            this.getAllStrategy();
            this.isDisplay = false;
            this.isEditMode = false;
          } else {
            Swal.fire({
              title: 'Error',
              text: res?.message || 'Failed to create frequency',
              icon: 'error',
              allowOutsideClick: false,
              confirmButtonColor: '#d33'
            });
          }
        },
        error: (err) => {
          Swal.fire({
            title: 'Error',
            text: err?.error?.message || err?.message || 'Failed to create frequency',
            icon: 'error',
            allowOutsideClick: false,
            confirmButtonColor: '#d33'
          });
        }
      });
    } else {
      this.strategyService.updateStrategy(obj).subscribe({
        next: (res: any) => {
          if (res?.isSuccess) {
            Swal.fire({
              title: 'Success',
              text: res.message || 'Frequency updated successfully',
              icon: 'success',
              allowOutsideClick: false,
              confirmButtonColor: '#0e3a4c'
            });

            this.getAllStrategy();
            this.isDisplay = false;
            this.isEditMode = false;
          } else {
            Swal.fire({
              title: 'Error',
              text: res?.message || 'Failed to update frequency',
              icon: 'error',
              allowOutsideClick: false,
              confirmButtonColor: '#d33'
            });
          }
        },
        error: (err) => {
          Swal.fire({
            title: 'Error',
            text: err?.error?.message || err?.message || 'Failed to update frequency',
            icon: 'error',
            allowOutsideClick: false,
            confirmButtonColor: '#d33'
          });
        }
      });
    }
  }

  getStrategyDetails(id: any): void {
    if (!this.canEdit()) {
      Swal.fire({
        icon: 'warning',
        title: 'Access Denied',
        text: 'You do not have edit permission.',
        confirmButtonColor: '#0e3a4c'
      });
      return;
    }

    this.strategyService.getStrategyById(id).subscribe({
      next: (arg: any) => {
        this.strategyValue = arg?.data;

        this.id = this.strategyValue?.id || 0;
        this.strategyName = this.strategyValue?.strategyName || '';
        this.isDisplay = true;
        this.resetButton = false;
        this.modeHeader = 'Edit Frequency';
        this.isEditMode = true;
      },
      error: (err) => {
        Swal.fire({
          icon: 'error',
          title: 'Error',
          text: err?.error?.message || err?.message || 'Unable to load frequency details',
          confirmButtonColor: '#d33'
        });
      }
    });
  }

  deleteStrategy(id: any, isUsed?: any): void {
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
        text: 'This frequency is already used.',
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
        this.strategyService.deleteStrategy(id).subscribe({
          next: (response: any) => {
            if (response?.isSuccess) {
              Swal.fire({
                icon: 'success',
                title: 'Deleted!',
                text: response.message || 'Frequency deleted successfully',
                allowOutsideClick: false,
                confirmButtonColor: '#3085d6'
              });
            } else {
              Swal.fire({
                icon: 'error',
                title: 'Error!',
                text: response?.message || 'Failed to delete frequency',
                allowOutsideClick: false,
                confirmButtonColor: '#d33'
              });
            }

            this.getAllStrategy();
          },
          error: (err) => {
            Swal.fire({
              icon: 'error',
              title: 'Error!',
              text: err?.error?.message || err?.message || 'Failed to delete frequency',
              allowOutsideClick: false,
              confirmButtonColor: '#d33'
            });
          }
        });
      }
    });
  }
}