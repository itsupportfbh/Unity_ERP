import { Component, OnInit, ViewChild, AfterViewInit, AfterViewChecked } from '@angular/core';
import { NgForm } from '@angular/forms';
import * as feather from 'feather-icons';
import Swal from 'sweetalert2';
import { DepartmentService } from '../department.service';
import { ActivatedRoute, Router } from '@angular/router';

type OriginContext = 'standalone' | 'fromPR';

@Component({
  selector: 'app-department',
  templateUrl: './department.component.html',
  styleUrls: ['./department.component.scss']
})
export class DepartmentComponent implements OnInit, AfterViewInit, AfterViewChecked {
  @ViewChild('addForm') departmentForm!: NgForm;

  // --- form fields / state
  public id = 0;
  departmentCode: string = '';
  departmentName: string = '';
  isDisplay: boolean = false;
  modeHeader: string = 'Add Department';
  resetButton: boolean = true;

  rows: any[] = [];
  departmentValue: any;
  isEditMode: boolean = false;

  // --- origin & return handling
  private origin: OriginContext = 'standalone';
  private returnUrl: string | null = null;
  get isFromPR() { return this.origin === 'fromPR'; }

  constructor(
    private _departmentService: DepartmentService,
    private route: ActivatedRoute,
    private router: Router
  ) {}

  // -------------------- Lifecycle --------------------
  ngOnInit(): void {
    this.getAllDepartment();

    const st = (window.history.state || {}) as any;
    const qpFrom = this.route.snapshot.queryParamMap.get('from');

    // Mark origin
    this.origin = (st?.from === 'pr' || st?.openCreate === true || qpFrom === 'pr')
      ? 'fromPR'
      : 'standalone';

    // If PR asked to open create directly
    if (st?.openCreate === true) this.createDepartment();

    // Only use what PR passes; no default fallback to PR route
    this.returnUrl = st?.returnUrl || null;
  }

  ngAfterViewInit(): void { feather.replace(); }
  ngAfterViewChecked(): void { feather.replace(); }

  // -------------------- UI actions --------------------
  createDepartment() {
    this.isDisplay = true;
    this.modeHeader = 'Add Department';
    this.reset();
  }

  reset() {
    this.modeHeader = 'Create Department';
    this.departmentName = '';
    this.departmentCode = '';
    this.id = 0;
    this.resetButton = true;
    this.isEditMode = false;
  }

  // Cancel with PR awareness + unsaved changes guard
  cancel() {
    const hasChanges =
      !!this.id ||
      !!(this.departmentName && this.departmentName.trim()) ||
      !!(this.departmentCode && this.departmentCode.trim()) ||
      !!this.departmentForm?.dirty;

    const doCancel = () => {
      if (this.isFromPR) {
        this.cancelAndReturnToPR();
      } else {
        // Standalone: just close the panel and refresh list
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
        if (res.isConfirmed) doCancel();
      });
    } else {
      doCancel();
    }
  }

  // -------------------- Helpers --------------------
  private cancelAndReturnToPR() {
    if (!this.returnUrl) {
      // If PR didn't pass returnUrl, fail-safe: stay on list
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

  private afterSave(newDeptId?: number) {
    if (this.isFromPR && this.returnUrl) {
      // Return to PR, pass selection via navigation state
      this.router.navigate([this.returnUrl], {
        state: {
          deptId: newDeptId ?? this.id ?? null,
          deptName: this.departmentName ?? null,
          from: 'department'
        },
        replaceUrl: true
      });
    } else {
      // Standalone OR PR forgot returnUrl → stay here and show list
      this.getAllDepartment();
      this.isDisplay = false;
      this.isEditMode = false;
      this.resetButton = true;
    }
  }

  // -------------------- Data --------------------
  getAllDepartment() {
    this._departmentService.getDepartment().subscribe((response: any) => {
      this.rows = response?.data || [];
    });
  }

  getDepartmentDetails(id: any) {
    this._departmentService.getDepartmentById(id).subscribe((arg: any) => {
      this.departmentValue = arg?.data;
      this.id = this.departmentValue?.id ?? 0;
      this.departmentName = this.departmentValue?.departmentName ?? '';
      this.departmentCode = this.departmentValue?.departmentCode ?? '';
      this.isDisplay = true;
      this.resetButton = false;
      this.modeHeader = 'Edit Department';
      this.isEditMode = true;
    });
  }

  // -------------------- Create / Update --------------------
  saveDepartment() {
    const payload = {
      id: this.id,
      departmentName: (this.departmentName || '').trim(),
      departmentCode: (this.departmentCode || '').trim(),
      createdBy: '1',
      createdDate: new Date(),
      updatedBy: '1',
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

    if (this.id === 0) {
      // Create
      this._departmentService.insertDepartment(payload).subscribe({
        next: (res: any) => {
          const newId = res?.data?.id ?? 0;
          Swal.fire({
            icon: 'success',
            title: 'Created!',
            text: 'Department created successfully',
            confirmButtonText: 'OK',
            confirmButtonColor: '#0e3a4c'
          }).then(() => this.afterSave(newId));
        },
        error: () => {
          Swal.fire({
            icon: 'error',
            title: 'Error',
            text: 'Failed to create Department',
            confirmButtonText: 'OK',
            confirmButtonColor: '#d33'
          });
        }
      });
    } else {
      // Update
      this._departmentService.updateDepartment(payload).subscribe({
        next: () => {
          Swal.fire({
            icon: 'success',
            title: 'Updated!',
            text: 'Department updated successfully',
            confirmButtonText: 'OK',
            confirmButtonColor: '#0e3a4c'
          }).then(() => this.afterSave(this.id));
        },
        error: () => {
          Swal.fire({
            icon: 'error',
            title: 'Error',
            text: 'Failed to update Department',
            confirmButtonText: 'OK',
            confirmButtonColor: '#d33'
          });
        }
      });
    }
  }

  // -------------------- Delete --------------------
  deleteDepartment(id: any) {
    const _self = this;
    Swal.fire({
      title: 'Are you sure?',
      text: "You won't be able to revert this!",
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#7367F0',
      cancelButtonColor: '#E42728',
      confirmButtonText: 'Yes, Delete it!',
      customClass: {
        confirmButton: 'btn btn-primary',
        cancelButton: 'btn btn-danger ml-1'
      },
      allowOutsideClick: false
    }).then(function (result) {
      if (result.value) {
        _self._departmentService.deleteDepartment(id).subscribe((response: any) => {
          if (response?.isSuccess) {
            Swal.fire({
              icon: 'success',
              title: 'Deleted!',
              text: response?.message,
              allowOutsideClick: false
            });
          } else {
            Swal.fire({
              icon: 'error',
              title: 'Error!',
              text: response?.message,
              allowOutsideClick: false
            });
          }
          _self.getAllDepartment();
        });
      }
    });
  }
}
