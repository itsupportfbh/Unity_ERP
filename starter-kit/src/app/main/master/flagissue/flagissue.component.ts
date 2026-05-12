import {
  AfterViewChecked,
  AfterViewInit,
  Component,
  OnInit,
  ViewChild,
  ViewEncapsulation
} from '@angular/core';
import Swal from 'sweetalert2';
import * as feather from 'feather-icons';
import { FormBuilder, NgForm } from '@angular/forms';

import { FlagissueService } from './flagissue.service';
import { FunctionPermission, PermissionService } from 'app/shared/permission.service';

@Component({
  selector: 'app-flagissue',
  templateUrl: './flagissue.component.html',
  styleUrls: ['./flagissue.component.scss'],
  encapsulation: ViewEncapsulation.None
})
export class FlagissueComponent implements OnInit, AfterViewInit, AfterViewChecked {
  @ViewChild('addForm') addForm!: NgForm;

  flagIssueList: any[] = [];
  flagIssueName: string = '';
  description: string = '';

  isEditMode = false;
  selectedFlagIssue: any = null;
  public isDisplay = false;
  modeHeader: string = 'Add Flag Issue';

  userId: number = 0;

  // IMPORTANT: DB/Menu permission code exact ah match aaganum
  functionId = 'flagissue';

  permission: FunctionPermission;
  isPermissionLoaded = false;
  isPageLoading = false;

  constructor(
    private fb: FormBuilder,
    private flagIssueService: FlagissueService,
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
          this.loadFlagIssue();
        } else {
          this.flagIssueList = [];
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

  loadFlagIssue(): void {
    this.flagIssueService.getAllFlagIssue().subscribe({
      next: (res: any) => {
        this.flagIssueList = (res?.data || []).filter((item: any) => item.isActive === true);
        setTimeout(() => feather.replace(), 0);
      },
      error: (err) => {
        console.error('Load flag issue error:', err);
        this.flagIssueList = [];
      }
    });
  }

  createFlagIssue(): void {
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
    this.selectedFlagIssue = null;
    this.modeHeader = 'Create Flag Issue';
    this.reset();
  }

  editFlagIssue(data: any): void {
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
    this.selectedFlagIssue = data;

    this.flagIssueName = data.flagIssuesNames || '';
    this.description = data.description || '';
    this.modeHeader = 'Edit Flag Issue';
  }

  cancel(): void {
    this.isEditMode = false;
    this.isDisplay = false;
    this.selectedFlagIssue = null;
  }

  reset(): void {
    this.flagIssueName = '';
    this.description = '';
    this.modeHeader = this.isEditMode ? 'Edit Flag Issue' : 'Create Flag Issue';
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
      FlagIssuesNames: this.flagIssueName,
      Description: this.description,
      CreatedBy: this.userId,
      UpdatedBy: this.userId,
      CreatedDate: new Date(),
      UpdatedDate: new Date(),
      IsActive: true
    };

    const handleResponse = (res: any, successMsg: string) => {
      if (res?.isSuccess === false) {
        Swal.fire({
          icon: 'warning',
          title: 'Warning',
          text: res?.message || 'Operation failed',
          confirmButtonText: 'OK',
          confirmButtonColor: '#0e3a4c'
        });
        return;
      }

      Swal.fire({
        icon: 'success',
        title: 'Success!',
        text: res?.message || successMsg,
        confirmButtonText: 'OK',
        confirmButtonColor: '#0e3a4c'
      });

      this.loadFlagIssue();
      this.cancel();
    };

    const handleError = (err: any, fallbackMsg: string) => {
      Swal.fire({
        icon: 'error',
        title: 'Error',
        text: err?.error?.message || err?.message || fallbackMsg,
        confirmButtonText: 'OK',
        confirmButtonColor: '#d33'
      });
    };

    if (this.isEditMode) {
      const updatedFlagIssue = {
        ...this.selectedFlagIssue,
        ...payload
      };

      this.flagIssueService.updateFlagIssue(this.selectedFlagIssue.id, updatedFlagIssue).subscribe({
        next: (res: any) => handleResponse(res, 'Flag Issue updated successfully'),
        error: (err: any) => handleError(err, 'Failed to update Flag Issue')
      });
    } else {
      this.flagIssueService.createFlagIssue(payload).subscribe({
        next: (res: any) => handleResponse(res, 'Flag Issue created successfully'),
        error: (err: any) => handleError(err, 'Failed to create Flag Issue')
      });
    }
  }

  confirmdeleteFlagIssue(data: any): void {
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
        this.deleteFlagIssue(data);
      }
    });
  }

  deleteFlagIssue(item: any): void {
    this.flagIssueService.deleteFlagIssue(item.id).subscribe({
      next: (res: any) => {
        Swal.fire({
          icon: 'success',
          title: 'Deleted!',
          text: res?.message || 'Flag Issue deleted successfully',
          confirmButtonColor: '#3085d6'
        });

        this.loadFlagIssue();
      },
      error: (err) => {
        Swal.fire({
          icon: 'error',
          title: 'Error',
          text: err?.error?.message || err?.message || 'Failed to delete Flag Issue',
          confirmButtonColor: '#d33'
        });
      }
    });
  }
}