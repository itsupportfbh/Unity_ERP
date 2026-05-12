import {
  AfterViewChecked,
  AfterViewInit,
  Component,
  OnInit,
  ViewChild,
  ViewEncapsulation
} from '@angular/core';
import { FormBuilder, NgForm } from '@angular/forms';
import { UomService } from './uom.service';
import Swal from 'sweetalert2';
import * as feather from 'feather-icons';
import { FunctionPermission, PermissionService } from 'app/shared/permission.service';

@Component({
  selector: 'app-uom',
  templateUrl: './uom.component.html',
  styleUrls: ['./uom.component.scss'],
  encapsulation: ViewEncapsulation.None
})
export class UomComponent implements OnInit, AfterViewChecked, AfterViewInit {
  @ViewChild('addForm') addForm!: NgForm;

  uomList: any[] = [];
  allUomList: any[] = [];

  uomName: string = '';
  description: string = '';
  searchText: string = '';

  isEditMode = false;
  selectedUom: any = null;
  public isDisplay = false;
  modeHeader: string = 'Add UOM';

  userId: number = 0;

  // IMPORTANT: DB/Menu permission code exact ah match aaganum
  functionId = 'uom';

  permission: FunctionPermission;
  isPermissionLoaded = false;
  isPageLoading = false;

  constructor(
    private fb: FormBuilder,
    private uomService: UomService,
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
          this.loadUom();
        } else {
          this.uomList = [];
          this.allUomList = [];
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

  loadUom(): void {
    this.uomService.getAllUom().subscribe({
      next: (res: any) => {
        this.allUomList = (res?.data || []).filter((item: any) => item.isActive === true);
        this.filterUom();
        setTimeout(() => feather.replace(), 0);
      },
      error: (err) => {
        console.error('Load UOM error:', err);
        this.allUomList = [];
        this.uomList = [];
      }
    });
  }

  filterUom(): void {
    const search = (this.searchText || '').toLowerCase().trim();

    if (!search) {
      this.uomList = [...this.allUomList];
      return;
    }

    this.uomList = this.allUomList.filter((item: any) =>
      (item.name || '').toLowerCase().includes(search) ||
      (item.description || '').toLowerCase().includes(search)
    );
  }

  clearSearch(): void {
    this.searchText = '';
    this.uomList = [...this.allUomList];
  }

  createUom(): void {
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
    this.selectedUom = null;
    this.modeHeader = 'Create UOM';
    this.reset();
  }

  editUom(data: any): void {
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
    this.selectedUom = data;

    this.uomName = data.name || '';
    this.description = data.description || '';
    this.modeHeader = 'Edit UOM';
  }

  cancel(): void {
    this.isEditMode = false;
    this.isDisplay = false;
    this.selectedUom = null;
  }

  reset(): void {
    this.uomName = '';
    this.description = '';
    this.modeHeader = this.isEditMode ? 'Edit UOM' : 'Create UOM';
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
      Name: this.uomName,
      description: this.description,
      CreatedBy: this.userId,
      UpdatedBy: this.userId,
      CreatedDate: new Date(),
      UpdatedDate: new Date(),
      isActive: true
    };

    if (this.isEditMode) {
      const updatedUom = {
        ...this.selectedUom,
        ...payload
      };

      this.uomService.updateUom(this.selectedUom.id, updatedUom).subscribe({
        next: (res: any) => {
          if (res?.isSuccess === false) {
            Swal.fire({
              icon: 'error',
              title: 'Error',
              text: res?.message || 'Failed to update UOM',
              confirmButtonText: 'OK',
              confirmButtonColor: '#d33'
            });
            return;
          }

          Swal.fire({
            icon: 'success',
            title: 'Updated!',
            text: res?.message || 'UOM updated successfully',
            confirmButtonText: 'OK',
            confirmButtonColor: '#0e3a4c'
          });

          this.loadUom();
          this.cancel();
        },
        error: (err) => {
          Swal.fire({
            icon: 'error',
            title: 'Error',
            text: err?.error?.message || err?.message || 'Failed to update UOM',
            confirmButtonText: 'OK',
            confirmButtonColor: '#d33'
          });
        }
      });
    } else {
      this.uomService.createUom(payload).subscribe({
        next: (res: any) => {
          if (res?.isSuccess === false) {
            Swal.fire({
              icon: 'error',
              title: 'Error',
              text: res?.message || 'Failed to create UOM',
              confirmButtonText: 'OK',
              confirmButtonColor: '#d33'
            });
            return;
          }

          Swal.fire({
            icon: 'success',
            title: 'Created!',
            text: res?.message || 'UOM created successfully',
            confirmButtonText: 'OK',
            confirmButtonColor: '#0e3a4c'
          });

          this.loadUom();
          this.cancel();
        },
        error: (err) => {
          Swal.fire({
            icon: 'error',
            title: 'Error',
            text: err?.error?.message || err?.message || 'Failed to create UOM',
            confirmButtonText: 'OK',
            confirmButtonColor: '#d33'
          });
        }
      });
    }
  }

  confirmdeleteUom(data: any): void {
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
        this.deleteUom(data);
      }
    });
  }

  deleteUom(item: any): void {
    this.uomService.deleteUom(item.id).subscribe({
      next: (res: any) => {
        Swal.fire({
          icon: 'success',
          title: 'Deleted!',
          text: res?.message || 'UOM deleted successfully',
          confirmButtonColor: '#3085d6'
        });

        this.loadUom();
      },
      error: (err) => {
        Swal.fire({
          icon: 'error',
          title: 'Error',
          text: err?.error?.message || err?.message || 'Failed to delete UOM',
          confirmButtonColor: '#d33'
        });
      }
    });
  }
}