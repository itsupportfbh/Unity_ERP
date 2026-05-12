import {
  Component,
  OnInit,
  ViewChild,
  AfterViewInit,
  AfterViewChecked,
  ViewEncapsulation
} from '@angular/core';
import { NgForm } from '@angular/forms';
import * as feather from 'feather-icons';
import Swal from 'sweetalert2';
import { DepartmentService } from '../department.service';
import { ActivatedRoute, Router } from '@angular/router';
import { FunctionPermission, PermissionService } from 'app/shared/permission.service';

type OriginContext = 'standalone' | 'fromPR';

@Component({
  selector: 'app-department',
  templateUrl: './department.component.html',
  styleUrls: ['./department.component.scss'],
  encapsulation: ViewEncapsulation.None
})
export class DepartmentComponent implements OnInit, AfterViewInit, AfterViewChecked {
  @ViewChild('departmentForm') departmentForm!: NgForm;

  public id = 0;
  departmentCode: string = '';
  departmentName: string = '';
  isDisplay: boolean = false;
  modeHeader: string = 'Add Department';
  resetButton: boolean = true;

  rows: any[] = [];
  departmentValue: any;
  isEditMode: boolean = false;

  private origin: OriginContext = 'standalone';
  private returnUrl: string | null = null;
  get isFromPR() {
    return this.origin === 'fromPR';
  }

  userId: number = 0;

  // IMPORTANT: DB/Menu permission code exact ah match aaganum
  functionId = 'department';

  permission: FunctionPermission;
  isPermissionLoaded = false;
  isPageLoading = false;

  constructor(
    private _departmentService: DepartmentService,
    private route: ActivatedRoute,
    private router: Router,
    private permissionService: PermissionService
  ) {
    this.userId = Number(localStorage.getItem('id') || 0);
    this.permission = this.permissionService.getEmptyPermission(this.functionId);
  }

  ngOnInit(): void {
    const st = (window.history.state || {}) as any;
    const qpFrom = this.route.snapshot.queryParamMap.get('from');

    this.origin =
      st?.from === 'pr' || st?.openCreate === true || qpFrom === 'pr'
        ? 'fromPR'
        : 'standalone';

    this.returnUrl = st?.returnUrl || null;

    this.loadPermission(st);
  }

  ngAfterViewInit(): void {
    feather.replace();
  }

  ngAfterViewChecked(): void {
    feather.replace();
  }

  loadPermission(st?: any): void {
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
          this.getAllDepartment();

          if (st?.openCreate === true) {
            this.createDepartment();
          }
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

  createDepartment(): void {
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
    this.modeHeader = 'Add Department';
    this.reset();
  }

  reset(): void {
    this.modeHeader = this.isEditMode ? 'Edit Department' : 'Create Department';
    this.departmentName = '';
    this.departmentCode = '';
    this.id = 0;
    this.resetButton = true;
    this.isEditMode = false;
  }

  cancel(): void {
    const hasChanges =
      !!this.id ||
      !!(this.departmentName && this.departmentName.trim()) ||
      !!(this.departmentCode && this.departmentCode.trim()) ||
      !!this.departmentForm?.dirty;

    const doCancel = () => {
      if (this.isFromPR) {
        this.cancelAndReturnToPR();
      } else {
        this.getAllDepartment();
        this.isDisplay = false;
        this.isEditMode = false;
        this.resetButton = true;
      }
    };

    if (hasChanges) {
      Swal.fire({
        title: 'Discard changes?',
        text: 'Your unsaved changes will be lost.',
        icon: 'warning',
        showCancelButton: true,
        confirmButtonText: 'Discard',
        cancelButtonText: 'Stay',
        confirmButtonColor: '#E42728',
        cancelButtonColor: '#0e3a4c',
        customClass: {
          confirmButton: 'btn btn-danger',
          cancelButton: 'btn btn-secondary ml-1'
        },
        allowOutsideClick: false
      }).then(res => {
        if (res.isConfirmed) {
          doCancel();
        }
      });
    } else {
      doCancel();
    }
  }

  private cancelAndReturnToPR(): void {
    if (!this.returnUrl) {
      this.getAllDepartment();
      this.isDisplay = false;
      this.isEditMode = false;
      this.resetButton = true;
      return;
    }

    this.router.navigate([this.returnUrl], {
      state: { from: 'department', cancelled: true },
      replaceUrl: true
    });
  }

  private afterSave(newDeptId?: number): void {
    if (this.isFromPR && this.returnUrl) {
      this.router.navigate([this.returnUrl], {
        state: {
          deptId: newDeptId ?? this.id ?? null,
          deptName: this.departmentName ?? null,
          from: 'department'
        },
        replaceUrl: true
      });
    } else {
      this.getAllDepartment();
      this.isDisplay = false;
      this.isEditMode = false;
      this.resetButton = true;
    }
  }

  getAllDepartment(): void {
    this._departmentService.getDepartment().subscribe({
      next: (response: any) => {
        this.rows = response?.data || [];
      },
      error: (err) => {
        console.error('Load department error:', err);
        this.rows = [];
      }
    });
  }

  getDepartmentDetails(id: any): void {
    if (!this.canEdit()) {
      Swal.fire({
        icon: 'warning',
        title: 'Access Denied',
        text: 'You do not have edit permission.',
        confirmButtonColor: '#0e3a4c'
      });
      return;
    }

    this._departmentService.getDepartmentById(id).subscribe({
      next: (arg: any) => {
        this.departmentValue = arg?.data;
        this.id = this.departmentValue?.id ?? 0;
        this.departmentName = this.departmentValue?.departmentName ?? '';
        this.departmentCode = this.departmentValue?.departmentCode ?? '';
        this.isDisplay = true;
        this.resetButton = false;
        this.modeHeader = 'Edit Department';
        this.isEditMode = true;
      },
      error: (err) => {
        Swal.fire({
          icon: 'error',
          title: 'Error',
          text: err?.error?.message || err?.message || 'Unable to load department details',
          confirmButtonColor: '#d33'
        });
      }
    });
  }

  saveDepartment(): void {
    const payload = {
      id: this.id,
      departmentName: (this.departmentName || '').trim(),
      departmentCode: (this.departmentCode || '').trim(),
      createdBy: this.userId,
      createdDate: new Date(),
      updatedBy: this.userId,
      updatedDate: new Date(),
      isActive: true
    };

    if (!payload.departmentName || !payload.departmentCode) {
      Swal.fire({
        icon: 'warning',
        title: 'Required',
        text: 'Department Name and Code are required.',
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

    if (this.id === 0) {
      this._departmentService.insertDepartment(payload).subscribe({
        next: (res: any) => {
          if (res?.isSuccess === false) {
            Swal.fire({
              icon: 'error',
              title: 'Error',
              text: res?.message || 'Failed to create Department',
              confirmButtonText: 'OK',
              confirmButtonColor: '#d33'
            });
            return;
          }

          const newId = res?.data?.id ?? 0;

          Swal.fire({
            icon: 'success',
            title: 'Created!',
            text: res?.message || 'Department created successfully',
            confirmButtonText: 'OK',
            confirmButtonColor: '#0e3a4c'
          }).then(() => this.afterSave(newId));
        },
        error: (err) => {
          Swal.fire({
            icon: 'error',
            title: 'Error',
            text: err?.error?.message || err?.message || 'Failed to create Department',
            confirmButtonText: 'OK',
            confirmButtonColor: '#d33'
          });
        }
      });
    } else {
      this._departmentService.updateDepartment(payload).subscribe({
        next: (res: any) => {
          if (res?.isSuccess === false) {
            Swal.fire({
              icon: 'error',
              title: 'Error',
              text: res?.message || 'Failed to update Department',
              confirmButtonText: 'OK',
              confirmButtonColor: '#d33'
            });
            return;
          }

          Swal.fire({
            icon: 'success',
            title: 'Updated!',
            text: res?.message || 'Department updated successfully',
            confirmButtonText: 'OK',
            confirmButtonColor: '#0e3a4c'
          }).then(() => this.afterSave(this.id));
        },
        error: (err) => {
          Swal.fire({
            icon: 'error',
            title: 'Error',
            text: err?.error?.message || err?.message || 'Failed to update Department',
            confirmButtonText: 'OK',
            confirmButtonColor: '#d33'
          });
        }
      });
    }
  }

  deleteDepartment(id: any, isUsed?: any): void {
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
        text: 'This department is already used.',
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
        this._departmentService.deleteDepartment(id).subscribe({
          next: (response: any) => {
            if (response?.isSuccess) {
              Swal.fire({
                icon: 'success',
                title: 'Deleted!',
                text: response?.message || 'Department deleted successfully',
                allowOutsideClick: false,
                confirmButtonColor: '#3085d6'
              });
            } else {
              Swal.fire({
                icon: 'error',
                title: 'Error!',
                text: response?.message || 'Failed to delete department',
                allowOutsideClick: false,
                confirmButtonColor: '#d33'
              });
            }

            this.getAllDepartment();
          },
          error: (err) => {
            Swal.fire({
              icon: 'error',
              title: 'Error!',
              text: err?.error?.message || err?.message || 'Failed to delete department',
              allowOutsideClick: false,
              confirmButtonColor: '#d33'
            });
          }
        });
      }
    });
  }
}