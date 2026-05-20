import { Component, OnInit, ViewEncapsulation } from '@angular/core';
import { Router } from '@angular/router';
import Swal from 'sweetalert2';
import { SupplierInvoiceService } from '../supplier-invoice.service';
import { FunctionPermission, PermissionService } from 'app/shared/permission.service';
import { GstLockService } from 'app/main/financial/tax-gst/gst-lock.service';

@Component({
  selector: 'app-supplier-invoice-list',
  templateUrl: './supplier-invoice-list.component.html',
  styleUrls: ['./supplier-invoice-list.component.scss'],
  encapsulation: ViewEncapsulation.None
})
export class SupplierInvoiceListComponent implements OnInit {

  rows: any[] = [];
  temp: any[] = [];

  selectedOption = 10;
  searchValue = '';

  totalPending = 0;
  autoMatched = 0;
  mismatched = 0;
  awaitingApproval = 0;

  showLinesModal = false;
  modalLines: any[] = [];
  modalTotalQty = 0;
  modalTotalAmt = 0;

  showMatchModal = false;
  threeWay: any = null;
  currentRow: any = null;
  isPosting = false;

  lockedRowMap: { [key: number]: boolean } = {};

  userId = 0;
  functionId = 'pin-list';

  permission: FunctionPermission;
  isPermissionLoaded = false;
  isPageLoading = false;

  constructor(
    private api: SupplierInvoiceService,
    private router: Router,
    private permissionService: PermissionService,
    private gstLockService: GstLockService
  ) {
    this.userId = Number(localStorage.getItem('id') || 0);
    this.permission = this.permissionService.getEmptyPermission(this.functionId);
  }

  ngOnInit(): void {
    this.loadPermission();
  }

  get hasLockedRows(): boolean {
    return Object.values(this.lockedRowMap || {}).some(x => x === true);
  }

  checkRowsGstLock(rows: any[], dateField: string, idField: string = 'id'): void {
    this.lockedRowMap = {};

    if (!rows || !rows.length) {
      return;
    }

    rows.forEach(row => {
      const id = row[idField];
      const docDate = row[dateField];

      if (!id || !docDate) {
        this.lockedRowMap[id] = false;
        return;
      }

      this.gstLockService.check(docDate).subscribe({
        next: (res: any) => {
          this.lockedRowMap[id] = !!res?.locked;
        },
        error: () => {
          this.lockedRowMap[id] = false;
        }
      });
    });
  }

  isRowLocked(row: any): boolean {
    if (!row) {
      return false;
    }

    return !!this.lockedRowMap[row.id];
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
          this.loadList();
        } else {
          this.rows = [];
          this.temp = [];
          this.lockedRowMap = {};
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

  canApprove(): boolean {
    return this.permissionService.hasApprove(this.permission);
  }

  loadList(): void {
    this.api.getAll().subscribe({
      next: (res: any) => {
        const list = res?.data ?? res ?? [];

        this.rows = (list || []).map((x: any) => ({
          ...x,
          id: Number(x.id ?? x.Id ?? 0),
          invoiceNo: x.invoiceNo ?? x.InvoiceNo ?? '',
          grnInvoiceNos: x.grnInvoiceNos ?? x.GrnInvoiceNos ?? '',
          grnNos: x.grnNos ?? x.GrnNos ?? '',
          invoiceDate: x.invoiceDate ?? x.InvoiceDate ?? null,
          amount: Number(x.amount ?? x.Amount ?? 0),
          tax: Number(x.tax ?? x.Tax ?? 0),
          status: Number(x.status ?? x.Status ?? 0),
          listStatusCode: Number(x.listStatusCode ?? x.ListStatusCode ?? x.status ?? 0),
          listStatusLabel: x.listStatusLabel ?? x.ListStatusLabel ?? '',
          statusLabel: x.statusLabel ?? x.StatusLabel ?? '',
          linkedWithInvoiceNo: x.linkedWithInvoiceNo ?? x.LinkedWithInvoiceNo ?? '',
          canEdit: x.canEdit !== false,
          canApproveToAp: x.canApproveToAp === true || x.canApproveToAp === 1,
          glPosted: x.glPosted === true || x.GlPosted === true || x.glPosted === 1 || x.GlPosted === 1,
glPostedDate: x.glPostedDate ?? x.GlPostedDate ?? null,
glJournalId: x.glJournalId ?? x.GlJournalId ?? null,
        }));

        this.temp = [...this.rows];

        this.calculateKpis();
        this.checkRowsGstLock(this.rows, 'invoiceDate');
      },
      error: () => {
        this.rows = [];
        this.temp = [];
        this.lockedRowMap = {};
        this.calculateKpis();

        Swal.fire({
          icon: 'error',
          title: 'Failed',
          text: 'Unable to load supplier invoices.'
        });
      }
    });
  }
isGlPosted(row: any): boolean {
  return row?.glPosted === true;
}

isActionDisabled(row: any): boolean {
  if (!row) return true;

  if (this.isGlPosted(row)) return true;

  if (this.isRowLocked(row)) return true;

  if (Number(row.status) === 3) return true;

  if (Number(row.listStatusCode) === 3 && row.linkedWithInvoiceNo) return true;

  return false;
}

canShowDelete(row: any): boolean {
  if (!row) return false;

  if (this.isGlPosted(row)) return false;

  if (this.isRowLocked(row)) return false;

  if (Number(row.status) === 3) return false;

  return true;
}
  calculateKpis(): void {
    const list = this.temp || [];

    this.totalPending = list.filter(x => Number(x.status) !== 3).length;
    this.autoMatched = list.filter(x =>
      Number(x.listStatusCode) === 3 ||
      String(x.listStatusLabel || '').toLowerCase().includes('matched')
    ).length;

    this.mismatched = list.filter(x =>
      String(x.listStatusLabel || '').toLowerCase().includes('mismatch')
    ).length;

    this.awaitingApproval = list.filter(x =>
      Number(x.status) === 0 ||
      Number(x.status) === 1
    ).length;
  }

  filterUpdate(event: any): void {
    const val = (event?.target?.value ?? this.searchValue ?? '').toString().toLowerCase().trim();

    this.rows = this.temp.filter(d =>
      !val ||
      (d.invoiceNo || '').toLowerCase().includes(val) ||
      (d.grnInvoiceNos || '').toLowerCase().includes(val) ||
      (d.grnNos || '').toLowerCase().includes(val) ||
      (d.listStatusLabel || '').toLowerCase().includes(val)
    );

    this.checkRowsGstLock(this.rows, 'invoiceDate');
  }

 goToCreate(): void {
  if (this.hasGlPostedRows) {
    Swal.fire({
      icon: 'warning',
      title: 'GL Posted',
      text: 'Already one Supplier Invoice is GL posted. New invoice creation is disabled.'
    });
    return;
  }

  this.router.navigate(['/purchase/supplier-invoice']);
}

  editInvoice(id: number): void {
    if (!this.canEdit()) {
      Swal.fire({
        icon: 'warning',
        title: 'Access Denied',
        text: 'You do not have edit permission.',
        confirmButtonColor: '#0e3a4c'
      });
      return;
    }

    const row =
      this.rows.find(x => x.id === id) ||
      this.temp.find(x => x.id === id);

    if (row && this.isRowLocked(row)) {
      Swal.fire({
        icon: 'warning',
        title: 'GST Locked',
        text: 'This supplier invoice belongs to locked GST period.'
      });
      return;
    }
if (row && this.isGlPosted(row)) {
  Swal.fire({
    icon: 'warning',
    title: 'GL Posted',
    text: 'This supplier invoice is already posted to GL.'
  });
  return;
}
    this.router.navigate(['/purchase/Edit-SupplierInvoice', id]);
  }

  deleteInvoice(id: number): void {
    if (!this.canDelete()) {
      Swal.fire({
        icon: 'warning',
        title: 'Access Denied',
        text: 'You do not have delete permission.',
        confirmButtonColor: '#0e3a4c'
      });
      return;
    }

    const row =
      this.rows.find(x => x.id === id) ||
      this.temp.find(x => x.id === id);

    if (row && this.isRowLocked(row)) {
      Swal.fire({
        icon: 'warning',
        title: 'GST Locked',
        text: 'This supplier invoice belongs to locked GST period.'
      });
      return;
    }
if (row && this.isGlPosted(row)) {
  Swal.fire({
    icon: 'warning',
    title: 'GL Posted',
    text: 'This supplier invoice is already posted to GL.'
  });
  return;
}
    Swal.fire({
      title: 'Delete this supplier invoice?',
      text: 'This action cannot be undone.',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Yes, delete',
      cancelButtonText: 'Cancel',
      confirmButtonColor: '#d33',
      cancelButtonColor: '#6b7280'
    }).then(result => {
      if (!result.isConfirmed) {
        return;
      }

      this.api.delete(id).subscribe({
        next: () => {
          Swal.fire('Deleted', 'Supplier invoice deleted successfully.', 'success');
          this.loadList();
        },
        error: (err) => {
          Swal.fire({
            icon: 'error',
            title: 'Delete failed',
            text: err?.error?.message || 'Unable to delete supplier invoice.'
          });
        }
      });
    });
  }

 

  openLinesModal(row: any): void {
    this.showLinesModal = true;
    this.modalLines = [];
    this.modalTotalQty = 0;
    this.modalTotalAmt = 0;

    let lines: any[] = [];

    try {
      if (Array.isArray(row.lines)) {
        lines = row.lines;
      } else if (row.linesJson) {
        lines = JSON.parse(row.linesJson || '[]');
      } else if (row.LinesJson) {
        lines = JSON.parse(row.LinesJson || '[]');
      }
    } catch {
      lines = [];
    }

    this.modalLines = (lines || []).map((l: any) => ({
      item: l.item ?? l.itemName ?? l.ItemName ?? '-',
      location: l.location ?? l.Location ?? '-',
      qty: Number(l.qty ?? l.Qty ?? 0),
      unitPrice: Number(l.unitPrice ?? l.price ?? l.UnitPrice ?? l.Price ?? 0),
      discountPct: Number(l.discountPct ?? l.DiscountPct ?? 0),
      taxAmt: Number(l.taxAmt ?? l.taxAmount ?? l.TaxAmount ?? 0),
      lineGrandTotal: Number(
        l.lineGrandTotal ??
        l.lineTotal ??
        l.amount ??
        ((Number(l.qty ?? 0) * Number(l.unitPrice ?? l.price ?? 0)))
      )
    }));

    this.modalTotalQty = this.modalLines.reduce((s, l) => s + Number(l.qty || 0), 0);
    this.modalTotalAmt = this.modalLines.reduce((s, l) => s + Number(l.lineGrandTotal || 0), 0);
  }

  closeLinesModal(): void {
    this.showLinesModal = false;
    this.modalLines = [];
    this.modalTotalQty = 0;
    this.modalTotalAmt = 0;
  }

  openMatchModal(row: any): void {
    debugger
    if (this.isRowLocked(row)) {
      Swal.fire({
        icon: 'warning',
        title: 'GST Locked',
        text: 'This supplier invoice belongs to locked GST period.'
      });
      return;
    }
if (this.isGlPosted(row)) {
  Swal.fire({
    icon: 'warning',
    title: 'GL Posted',
    text: 'This supplier invoice is already posted to GL.'
  });
  return;
}
    this.currentRow = row;
    this.threeWay = null;
    this.showMatchModal = true;

    this.api.getThreeWayMatch(row.id).subscribe({
      next: (res: any) => {
        this.threeWay = res?.data ?? res ?? null;
      },
      error: () => {
        this.threeWay = null;
        Swal.fire({
          icon: 'error',
          title: 'Failed',
          text: 'Unable to load 3-way match.'
        });
      }
    });
  }

  closeMatchModal(): void {
    this.showMatchModal = false;
    this.threeWay = null;
    this.currentRow = null;
  }

  approveAndPostToAp(): void {
    if (!this.currentRow) {
      return;
    }

    if (this.isRowLocked(this.currentRow)) {
      Swal.fire({
        icon: 'warning',
        title: 'GST Locked',
        text: 'This supplier invoice belongs to locked GST period.'
      });
      return;
    }

    if (!this.canApprove()) {
      Swal.fire({
        icon: 'warning',
        title: 'Access Denied',
        text: 'You do not have approve permission.'
      });
      return;
    }

    this.isPosting = true;

    this.api.postToAp(this.currentRow.id).subscribe({
      next: () => {
        this.isPosting = false;
        Swal.fire('Posted', 'Supplier invoice posted to A/P successfully.', 'success');
        this.closeMatchModal();
        this.loadList();
      },
      error: (err) => {
        this.isPosting = false;
        Swal.fire({
          icon: 'error',
          title: 'Posting failed',
          text: err?.error?.message || 'Unable to post supplier invoice to A/P.'
        });
      }
    });
  }
  get hasGlPostedRows(): boolean {
  return (this.rows || []).some((x: any) =>
    x.glPosted === true ||
    x.GlPosted === true ||
    x.glPosted === 1 ||
    x.GlPosted === 1
  );
}
}