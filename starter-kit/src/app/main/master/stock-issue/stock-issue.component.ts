import {
  AfterViewChecked,
  AfterViewInit,
  Component,
  OnInit,
  ViewChild,
  ViewEncapsulation
} from '@angular/core';
import { FormBuilder, NgForm } from '@angular/forms';
import * as feather from 'feather-icons';
import Swal from 'sweetalert2';

import { StockIssueService } from './stock-issue.service';
import { FunctionPermission, PermissionService } from 'app/shared/permission.service';

@Component({
  selector: 'app-stock-issue',
  templateUrl: './stock-issue.component.html',
  styleUrls: ['./stock-issue.component.scss'],
  encapsulation: ViewEncapsulation.None
})
export class StockIssueComponent implements OnInit, AfterViewInit, AfterViewChecked {
  @ViewChild('addForm') addForm!: NgForm;

  StockissueList: any[] = [];
  StockissueName: string = '';
  description: string = '';

  isEditMode = false;
  selectedStockissue: any = null;
  public isDisplay = false;
  modeHeader: string = 'Add Stock Issue';

  userId: number = 0;

  // IMPORTANT: DB/Menu permission code exact ah match aaganum
  functionId = 'stockissue';

  permission: FunctionPermission;
  isPermissionLoaded = false;
  isPageLoading = false;

  constructor(
    private fb: FormBuilder,
    private StockissueService: StockIssueService,
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
          this.loadStockissue();
        } else {
          this.StockissueList = [];
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

  loadStockissue(): void {
    this.StockissueService.getAllStockissue().subscribe({
      next: (res: any) => {
        this.StockissueList = (res?.data || []).filter((item: any) => item.isActive === true);
        setTimeout(() => feather.replace(), 0);
      },
      error: (err) => {
        console.error('Load stock issue error:', err);
        this.StockissueList = [];
      }
    });
  }

  createStockissue(): void {
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
    this.selectedStockissue = null;
    this.modeHeader = 'Create Stock Issue';
    this.reset();
  }

  editStockissue(data: any): void {
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
    this.selectedStockissue = data;

    this.StockissueName = data.stockIssuesNames || '';
    this.description = data.description || '';
    this.modeHeader = 'Edit Stock Issue';
  }

  cancel(): void {
    this.isEditMode = false;
    this.isDisplay = false;
    this.selectedStockissue = null;
  }

  reset(): void {
    this.StockissueName = '';
    this.description = '';
    this.modeHeader = this.isEditMode ? 'Edit Stock Issue' : 'Create Stock Issue';
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
      StockissuesNames: this.StockissueName,
      Description: this.description,
      CreatedBy: this.userId,
      UpdatedBy: this.userId,
      CreatedDate: new Date(),
      UpdatedDate: new Date(),
      IsActive: true
    };

    if (this.isEditMode) {
      const updatedStockissue = {
        ...this.selectedStockissue,
        ...payload
      };

      this.StockissueService
        .updateStockissue(this.selectedStockissue.id, updatedStockissue)
        .subscribe({
          next: (res: any) => {
            if (res?.isSuccess === false) {
              Swal.fire({
                icon: 'error',
                title: 'Error',
                text: res?.message || 'Failed to update Stock Issue',
                confirmButtonText: 'OK',
                confirmButtonColor: '#d33'
              });
              return;
            }

            Swal.fire({
              icon: 'success',
              title: 'Updated!',
              text: res?.message || 'Stock Issue updated successfully',
              confirmButtonText: 'OK',
              confirmButtonColor: '#0e3a4c'
            });

            this.loadStockissue();
            this.cancel();
          },
          error: (err) => {
            Swal.fire({
              icon: 'error',
              title: 'Error',
              text: err?.error?.message || err?.message || 'Failed to update Stock Issue',
              confirmButtonText: 'OK',
              confirmButtonColor: '#d33'
            });
          }
        });
    } else {
      this.StockissueService.createStockissue(payload).subscribe({
        next: (res: any) => {
          if (res?.isSuccess === false) {
            Swal.fire({
              icon: 'error',
              title: 'Error',
              text: res?.message || 'Failed to create Stock Issue',
              confirmButtonText: 'OK',
              confirmButtonColor: '#d33'
            });
            return;
          }

          Swal.fire({
            icon: 'success',
            title: 'Created!',
            text: res?.message || 'Stock Issue created successfully',
            confirmButtonText: 'OK',
            confirmButtonColor: '#0e3a4c'
          });

          this.loadStockissue();
          this.cancel();
        },
        error: (err) => {
          Swal.fire({
            icon: 'error',
            title: 'Error',
            text: err?.error?.message || err?.message || 'Failed to create Stock Issue',
            confirmButtonText: 'OK',
            confirmButtonColor: '#d33'
          });
        }
      });
    }
  }

  confirmdeleteStockissue(data: any): void {
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
        this.deleteStockissue(data);
      }
    });
  }

  deleteStockissue(item: any): void {
    this.StockissueService.deleteStockissue(item.id).subscribe({
      next: (res: any) => {
        Swal.fire({
          icon: 'success',
          title: 'Deleted!',
          text: res?.message || 'Stock Issue deleted successfully',
          confirmButtonColor: '#3085d6'
        });

        this.loadStockissue();
      },
      error: (err) => {
        Swal.fire({
          icon: 'error',
          title: 'Error',
          text: err?.error?.message || err?.message || 'Failed to delete Stock Issue',
          confirmButtonColor: '#d33'
        });
      }
    });
  }
}