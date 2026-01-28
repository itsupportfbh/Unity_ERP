import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import Swal from 'sweetalert2';

import { ReceiptService } from '../receipt-service';
import { PeriodCloseService } from 'app/main/financial/period-close-fx/period-close-fx.service';

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

  constructor(
    private router: Router,
    private receiptService: ReceiptService,
    private periodLock: PeriodCloseService
  ) {}

  ngOnInit(): void {
    this.loadReceipts();
    this.checkPeriodLockForToday();
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


  // ---------- List / search ----------
  loadReceipts(): void {
    this.receiptService.getReceipt().subscribe((res: any) => {
      this.receipts = res.data || [];
      this.filtered = [...this.receipts];
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
        error: _ => {
          Swal.fire({
            icon: 'error',
            title: 'Delete failed',
            text: 'Something went wrong while deleting the receipt.'
          });
        }
      });
    });
  }
}
