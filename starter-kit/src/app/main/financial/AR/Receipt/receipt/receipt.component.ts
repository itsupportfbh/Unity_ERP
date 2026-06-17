import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import Swal from 'sweetalert2';

import { ReceiptService } from '../receipt-service';
import { PeriodCloseService } from 'app/main/financial/period-close-fx/period-close-fx.service';
import { FunctionPermission, PermissionService } from 'app/shared/permission.service';

@Component({
  selector: 'app-receipt',
  templateUrl: './receipt.component.html',
  styleUrls: ['./receipt.component.scss']
})
export class ReceiptComponent implements OnInit {

  receipts: any[] = [];
  filtered: any[] = [];
  searchValue = '';

  // 🔒 period lock
  isPeriodLocked = false;
  periodName = '';

  userId: any;
  functionId = 'ar';
    
  permission: FunctionPermission;
  isPermissionLoaded = false;
  isPageLoading = false;

  constructor(
    private router: Router,
    private receiptService: ReceiptService,
    private periodLock: PeriodCloseService,
    private permissionService: PermissionService
  ) {this.userId = localStorage.getItem('id');
    this.permission = this.permissionService.getEmptyPermission(this.functionId);}

  ngOnInit(): void {
    this.loadPermission();
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
           this.loadReceipts();
           this.checkPeriodLockForToday();
          } else {
            
            // this.isDisplay = false;
          }
        },
        error: () => {
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
  canExport(): boolean {
    return this.permissionService.hasExport(this.permission);
  }

  // ---------- Period lock ----------
 private checkPeriodLockForToday(): void {
  const today = new Date().toISOString().substring(0, 10); // yyyy-MM-dd

  this.periodLock.getStatusForDateWithName(today).subscribe({
    next: status => {
      this.isPeriodLocked = !!status?.isLocked;
      this.periodName = status?.periodName || '';
    },
    error: () => {
      this.isPeriodLocked = false;
      this.periodName = '';
    }
  });
}

loadReceipts(): void {
  this.receiptService.getReceipt().subscribe({
    next: (res: any) => {
      const data = Array.isArray(res)
        ? res
        : (res?.data?.items ?? res?.data ?? res ?? []);
      this.receipts = data;
      this.filtered = [...this.receipts];
    },
    error: (err) => {
      this.receipts = [];
      this.filtered = [];
      Swal.fire('Error', err?.error?.message || err?.message || 'Unable to load receipts.', 'error');
    }
  });
}

  onSearch(value: string): void {
    this.searchValue = (value || '').toLowerCase();
    this.filtered = this.receipts.filter(r =>
      (r.receiptNo || '').toLowerCase().includes(this.searchValue) ||
      (r.customerName || '').toLowerCase().includes(this.searchValue)
    );
  }

  // ---------- Actions ----------
  goCreate(): void {
    if (this.isPeriodLocked) {
      Swal.fire(
        'Period Locked',
        this.periodName
          ? `Period "${this.periodName}" is locked. You cannot create new receipts in this period.`
          : 'Selected period is locked. You cannot create new receipts.',
        'warning'
      );
      return;
    }

    this.router.navigate(['/financial/AR-receipt-create']);
  }

  edit(id: any): void {
    this.router.navigate(['/financial/AR-receipt-edit', id]);
  }

  delete(id: number): void {
    Swal.fire({
      title: 'Delete this receipt?',
      text: 'This action cannot be undone.',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Yes, delete',
      cancelButtonText: 'Cancel',
      confirmButtonColor: '#d33',
      cancelButtonColor: '#6b7280',
      reverseButtons: true
    }).then(result => {
      if (!result.isConfirmed) return;

      Swal.fire({
        title: 'Deleting…',
        allowOutsideClick: false,
        didOpen: () => Swal.showLoading()
      });

      this.receiptService.deleteReceipt(id).subscribe({
        next: _ => {
          Swal.fire({
            icon: 'success',
            title: 'Deleted',
            text: 'Receipt has been deleted.'
          });
          this.loadReceipts();
        },
        error: err => {
          Swal.fire({
            icon: 'error',
            title: 'Delete failed',
            text: err?.error?.message || err?.message || 'Something went wrong while deleting the receipt.'
          });
        }
      });
    });
  }
}
