import {
  Component,
  OnInit,
  ViewChild,
  ViewEncapsulation,
  AfterViewChecked,
  AfterViewInit
} from '@angular/core';
import { FormBuilder, NgForm } from '@angular/forms';
import * as feather from 'feather-icons';
import Swal from 'sweetalert2';

import { CoastingMethodService } from './coasting-method.service';
import { FunctionPermission, PermissionService } from 'app/shared/permission.service';

@Component({
  selector: 'app-coasting-method',
  templateUrl: './coasting-method.component.html',
  styleUrls: ['./coasting-method.component.scss'],
  encapsulation: ViewEncapsulation.None
})
export class CoastingMethodComponent implements OnInit, AfterViewChecked, AfterViewInit {
  @ViewChild('addForm') addForm!: NgForm;

  CoastingMethodList: any[] = [];
  costingName: string = '';
  description: string = '';
  isEditMode = false;
  selectedCoastingMethod: any = null;
  public isDisplay = false;
  modeHeader: string = 'Add Costing Method';

  userId: number = 0;

  // IMPORTANT: DB/Menu permission function id same ah irukanum
  functionId = 'costingmethod';

  permission: FunctionPermission;
  isPermissionLoaded = false;
  isPageLoading = false;

  constructor(
    private fb: FormBuilder,
    private coastingmethodService: CoastingMethodService,
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
          this.loadCoastingMethod();
        } else {
          this.CoastingMethodList = [];
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

  loadCoastingMethod(): void {
    this.coastingmethodService.getAllCoastingMethod().subscribe({
      next: (res: any) => {
        if (res?.isSuccess) {
          this.CoastingMethodList = (res.data || []).filter((item: any) => item.isActive === true);
        } else {
          this.CoastingMethodList = [];
        }
      },
      error: (err) => {
        console.error('Load costing method error:', err);
        this.CoastingMethodList = [];
      }
    });
  }

  createCoastingMethod(): void {
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
    this.selectedCoastingMethod = null;
    this.reset();
    this.modeHeader = 'Create Costing Method';
  }

  editCoastingMethod(data: any): void {
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
    this.selectedCoastingMethod = data;

    this.costingName = data.costingName || '';
    this.description = data.description || '';
    this.modeHeader = 'Edit Costing Method';
  }

  cancel(): void {
    this.isEditMode = false;
    this.isDisplay = false;
    this.selectedCoastingMethod = null;
  }

  reset(): void {
    this.costingName = '';
    this.description = '';
    this.modeHeader = this.isEditMode ? 'Edit Costing Method' : 'Create Costing Method';
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
      costingName: this.costingName,
      description: this.description,
      CreatedDate: new Date(),
      CreatedBy: this.userId,
      UpdatedBy: this.userId,
      UpdatedDate: new Date(),
      isActive: true
    };

    if (this.isEditMode) {
      const updatedCoastingMethod = {
        ...this.selectedCoastingMethod,
        ...payload
      };

      this.coastingmethodService
        .updateCoastingMethod(this.selectedCoastingMethod.id, updatedCoastingMethod)
        .subscribe({
          next: (res: any) => {
            if (res?.isSuccess === false) {
              Swal.fire({
                icon: 'error',
                title: 'Error',
                text: res?.message || 'Failed to update Costing Method',
                confirmButtonText: 'OK',
                confirmButtonColor: '#d33'
              });
              return;
            }

            Swal.fire({
              icon: 'success',
              title: 'Updated!',
              text: res?.message || 'Costing Method updated successfully',
              confirmButtonText: 'OK',
              confirmButtonColor: '#0e3a4c'
            });

            this.loadCoastingMethod();
            this.cancel();
          },
          error: (err) => {
            const msg =
              err?.error?.message ||
              err?.message ||
              'Failed to update Costing Method';

            Swal.fire({
              icon: 'error',
              title: 'Error',
              text: msg,
              confirmButtonText: 'OK',
              confirmButtonColor: '#d33'
            });
          }
        });
    } else {
      this.coastingmethodService.createCoastingMethod(payload).subscribe({
        next: (res: any) => {
          if (res?.isSuccess === false) {
            Swal.fire({
              icon: 'error',
              title: 'Error',
              text: res?.message || 'Failed to create Costing Method',
              confirmButtonText: 'OK',
              confirmButtonColor: '#d33'
            });
            return;
          }

          Swal.fire({
            icon: 'success',
            title: 'Created!',
            text: res?.message || 'Costing Method created successfully',
            confirmButtonText: 'OK',
            confirmButtonColor: '#0e3a4c'
          });

          this.loadCoastingMethod();
          this.cancel();
        },
        error: (err) => {
          const msg =
            err?.error?.message ||
            err?.message ||
            'Failed to create Costing Method';

          Swal.fire({
            icon: 'error',
            title: 'Error',
            text: msg,
            confirmButtonText: 'OK',
            confirmButtonColor: '#d33'
          });
        }
      });
    }
  }

  confirmdeleteCoastingMethod(data: any): void {
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
        this.deleteCoastingMethod(data);
      }
    });
  }

  deleteCoastingMethod(item: any): void {
    this.coastingmethodService.deleteCoastingMethod(item.id).subscribe({
      next: (res: any) => {
        Swal.fire({
          icon: 'success',
          title: 'Deleted!',
          text: res?.message || 'Costing Method deleted successfully',
          confirmButtonColor: '#3085d6'
        });

        this.loadCoastingMethod();
      },
      error: (err) => {
        console.error('Delete error:', err);

        Swal.fire({
          icon: 'error',
          title: 'Error',
          text: 'Failed to delete Costing Method',
          confirmButtonColor: '#d33'
        });
      }
    });
  }
}