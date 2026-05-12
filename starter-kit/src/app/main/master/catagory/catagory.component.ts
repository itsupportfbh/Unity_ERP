import {
  Component,
  OnInit,
  ViewChild,
  AfterViewChecked,
  AfterViewInit,
  ViewEncapsulation
} from '@angular/core';
import { FormBuilder, NgForm } from '@angular/forms';
import Swal from 'sweetalert2';
import * as feather from 'feather-icons';

import { CatagoryService } from './catagory.service';
import { FunctionPermission, PermissionService } from 'app/shared/permission.service';

@Component({
  selector: 'app-catagory',
  templateUrl: './catagory.component.html',
  styleUrls: ['./catagory.component.scss'],
  encapsulation: ViewEncapsulation.None
})
export class CatagoryComponent implements OnInit, AfterViewChecked, AfterViewInit {
  @ViewChild('addForm') addForm!: NgForm;

  CatagoryList: any[] = [];
  CatagoryName: string = '';
  description: string = '';

  isEditMode = false;
  selectedCatagory: any = null;
  public isDisplay = false;
  modeHeader: string = 'Add Catagory';

  userId: number = 0;

  // IMPORTANT: DB/Menu permission code exact ah match aaganum
  functionId = 'catagory';

  permission: FunctionPermission;
  isPermissionLoaded = false;
  isPageLoading = false;

  constructor(
    private fb: FormBuilder,
    private CatagoryService: CatagoryService,
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
          this.loadCatagory();
        } else {
          this.CatagoryList = [];
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

  loadCatagory(): void {
    this.CatagoryService.getAllCatagory().subscribe({
      next: (res: any) => {
        this.CatagoryList = (res?.data || []).filter((item: any) => item.isActive === true);
        setTimeout(() => feather.replace(), 0);
      },
      error: (err) => {
        console.error('Load catagory error:', err);
        this.CatagoryList = [];
      }
    });
  }

  createCatagory(): void {
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
    this.selectedCatagory = null;
    this.modeHeader = 'Create Catagory';
    this.reset();
  }

  editCatagory(data: any): void {
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
    this.selectedCatagory = data;

    this.CatagoryName = data.catagoryName || '';
    this.description = data.description || '';
    this.modeHeader = 'Edit Catagory';
  }

  cancel(): void {
    this.isEditMode = false;
    this.isDisplay = false;
    this.selectedCatagory = null;
  }

  reset(): void {
    this.CatagoryName = '';
    this.description = '';
    this.modeHeader = this.isEditMode ? 'Edit Catagory' : 'Create Catagory';
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
      catagoryName: this.CatagoryName,
      description: this.description,
      CreatedBy: this.userId,
      UpdatedBy: this.userId,
      CreatedDate: new Date(),
      UpdatedDate: new Date(),
      isActive: true
    };

    if (this.isEditMode) {
      const updatedCatagory = {
        ...this.selectedCatagory,
        ...payload
      };

      this.CatagoryService.updateCatagory(this.selectedCatagory.id, updatedCatagory).subscribe({
        next: (res: any) => {
          if (res?.isSuccess === false) {
            Swal.fire({
              icon: 'error',
              title: 'Error',
              text: res?.message || 'Failed to update Catagory',
              confirmButtonText: 'OK',
              confirmButtonColor: '#d33'
            });
            return;
          }

          Swal.fire({
            icon: 'success',
            title: 'Updated!',
            text: res?.message || 'Catagory updated successfully',
            confirmButtonText: 'OK',
            confirmButtonColor: '#0e3a4c'
          });

          this.loadCatagory();
          this.cancel();
        },
        error: (err) => {
          Swal.fire({
            icon: 'error',
            title: 'Error',
            text: err?.error?.message || err?.message || 'Failed to update Catagory',
            confirmButtonText: 'OK',
            confirmButtonColor: '#d33'
          });
        }
      });
    } else {
      this.CatagoryService.createCatagory(payload).subscribe({
        next: (res: any) => {
          if (res?.isSuccess === false) {
            Swal.fire({
              icon: 'error',
              title: 'Error',
              text: res?.message || 'Failed to create Catagory',
              confirmButtonText: 'OK',
              confirmButtonColor: '#d33'
            });
            return;
          }

          Swal.fire({
            icon: 'success',
            title: 'Created!',
            text: res?.message || 'Catagory created successfully',
            confirmButtonText: 'OK',
            confirmButtonColor: '#0e3a4c'
          });

          this.loadCatagory();
          this.cancel();
        },
        error: (err) => {
          Swal.fire({
            icon: 'error',
            title: 'Error',
            text: err?.error?.message || err?.message || 'Failed to create Catagory',
            confirmButtonText: 'OK',
            confirmButtonColor: '#d33'
          });
        }
      });
    }
  }

  confirmdeleteCatagory(data: any): void {
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
        this.deleteCatagory(data);
      }
    });
  }

  deleteCatagory(item: any): void {
    this.CatagoryService.deleteCatagory(item.id).subscribe({
      next: (res: any) => {
        Swal.fire({
          icon: 'success',
          title: 'Deleted!',
          text: res?.message || 'Catagory deleted successfully',
          confirmButtonColor: '#3085d6'
        });

        this.loadCatagory();
      },
      error: (err) => {
        Swal.fire({
          icon: 'error',
          title: 'Error',
          text: err?.error?.message || err?.message || 'Failed to delete Catagory',
          confirmButtonColor: '#d33'
        });
      }
    });
  }
}