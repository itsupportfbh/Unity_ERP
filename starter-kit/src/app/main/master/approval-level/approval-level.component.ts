import {
  Component,
  OnInit,
  ViewChild,
  ViewEncapsulation,
  AfterViewChecked,
  AfterViewInit
} from '@angular/core';
import { FormBuilder, NgForm } from '@angular/forms';
import Swal from 'sweetalert2';
import * as feather from 'feather-icons';

import { ApprovallevelService } from './approvallevel.service';
import { FunctionPermission, PermissionService } from 'app/shared/permission.service';


@Component({
  selector: 'app-approval-level',
  templateUrl: './approval-level.component.html',
  styleUrls: ['./approval-level.component.scss'],
  encapsulation: ViewEncapsulation.None
})
export class ApprovalLevelComponent implements OnInit, AfterViewChecked, AfterViewInit {
  @ViewChild('addForm') addForm!: NgForm;

  approvalLevelList: any[] = [];
  approvalLevelName: string = '';
  description: string = '';
  isEditMode = false;
  selectedApprovalLevel: any = null;
  public isDisplay = false;
  approvalLevelHeader: string = 'Add Approval Level';

  userId: number = 0;
  functionId = 'approval-level';

  permission: FunctionPermission;
  isPermissionLoaded = false;
  isPageLoading = false;

  constructor(
    private fb: FormBuilder,
    private approvallevelService: ApprovallevelService,
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
          this.loadApprovalLevel();
        } else {
          this.approvalLevelList = [];
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

  loadApprovalLevel(): void {
    this.approvallevelService.getAllApprovalLevel().subscribe({
      next: (response: any) => {
        if (response?.isSuccess) {
          this.approvalLevelList = (response.data || []).filter((item: any) => item.isActive);
        } else {
          this.approvalLevelList = [];
        }
      },
      error: (err) => {
        console.error('Load approval level error:', err);
        this.approvalLevelList = [];
      }
    });
  }

  createApprovalLevel(): void {
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
    this.selectedApprovalLevel = null;
    this.reset();
    this.approvalLevelHeader = 'Create Approval Level';
  }

  editApprovalLevel(data: any): void {
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
    this.selectedApprovalLevel = data;

    this.approvalLevelName = data.name || '';
    this.description = data.description || '';
    this.approvalLevelHeader = 'Edit Approval Level';
  }

  cancel(): void {
    this.isEditMode = false;
    this.isDisplay = false;
    this.selectedApprovalLevel = null;
  }

  reset(): void {
    this.approvalLevelName = '';
    this.description = '';
    this.approvalLevelHeader = 'Create Approval Level';
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
      Name: this.approvalLevelName,
      Description: this.description,
      IsActive: true,
      CreatedBy: this.userId,
      UpdatedBy: this.userId,
      CreatedDate: new Date(),
      UpdatedDate: new Date()
    };

    if (this.isEditMode) {
      const updatedApprovallevel = {
        ...this.selectedApprovalLevel,
        ...payload
      };

      this.approvallevelService
        .updateApprovalLevel(this.selectedApprovalLevel.id, updatedApprovallevel)
        .subscribe({
          next: (res: any) => {
            if (res?.isSuccess) {
              Swal.fire({
                icon: 'success',
                title: 'Updated!',
                text: res.message || 'Approval level updated successfully',
                confirmButtonText: 'OK',
                confirmButtonColor: '#0e3a4c'
              });
              this.loadApprovalLevel();
              this.cancel();
            } else {
              Swal.fire({
                icon: 'error',
                title: 'Error',
                text: res?.message || 'Failed to update Approval level.',
                confirmButtonText: 'OK',
                confirmButtonColor: '#d33'
              });
            }
          },
          error: (err) => {
            const msg =
              err?.error?.message ||
              err?.message ||
              'Unable to update Approval level.';
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
      this.approvallevelService.createApprovalLevel(payload).subscribe({
        next: (res: any) => {
          if (res?.isSuccess) {
            Swal.fire({
              icon: 'success',
              title: 'Created!',
              text: res.message || 'Approval level created successfully',
              confirmButtonText: 'OK',
              confirmButtonColor: '#0e3a4c'
            });
            this.loadApprovalLevel();
            this.cancel();
          } else {
            Swal.fire({
              icon: 'error',
              title: 'Error',
              text: res?.message || 'Something went wrong.',
              confirmButtonText: 'OK',
              confirmButtonColor: '#d33'
            });
          }
        },
        error: (err) => {
          const msg =
            err?.error?.message ||
            err?.message ||
            'Unable to create Approval level.';
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

  confirmdeleteApprovalLevel(data: any): void {
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
        this.deleteApprovallevel(data);
      }
    });
  }

  deleteApprovallevel(item: any): void {
    this.approvallevelService.deleteApprovalLevel(item.id).subscribe({
      next: (res: any) => {
        Swal.fire({
          icon: 'success',
          title: 'Deleted!',
          text: res?.message || 'Approval level deleted successfully',
          confirmButtonColor: '#3085d6'
        });
        this.loadApprovalLevel();
      },
      error: (err) => {
        console.error('Delete error:', err);
        Swal.fire({
          icon: 'error',
          title: 'Error',
          text: 'Failed to delete Approval level',
          confirmButtonColor: '#d33'
        });
      }
    });
  }
}