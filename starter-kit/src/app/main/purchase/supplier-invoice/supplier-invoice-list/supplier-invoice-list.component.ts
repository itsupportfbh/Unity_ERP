import {
  Component,
  OnInit,
  ViewChild,
  ViewEncapsulation,
  AfterViewInit,
  AfterViewChecked
} from '@angular/core';
import { Router } from '@angular/router';
import { ColumnMode, DatatableComponent } from '@swimlane/ngx-datatable';
import Swal from 'sweetalert2';
import { SupplierInvoiceService } from '../supplier-invoice.service';
import * as feather from 'feather-icons';
import { PeriodCloseService } from 'app/main/financial/period-close-fx/period-close-fx.service';

export interface ThreeWayMatch {
  poId: number;
  poNo: string;
  poQty: number;
  poPrice: number;
  poTotal: number;

  grnCount: number;
  grnNos: string;
  grnReceivedQty: number;
  pendingReceiveQty: number; // ✅ new
  grnStatus: string;

  pinId: number;
  pinNo: string;
  pinQty: number;
  pinTotal: number;

  totalInvoicedQty: number;
  lastPinId: number;
  isLastPinInGroup: boolean;

  pinMatch: boolean;
  mismatchLabel?: string | null;
}

export interface PeriodStatusDto {
  isLocked: boolean;
  periodName?: string;
}

@Component({
  selector: 'app-supplier-invoice-list',
  templateUrl: './supplier-invoice-list.component.html',
  styleUrls: ['./supplier-invoice-list.component.scss'],
  encapsulation: ViewEncapsulation.None
})
export class SupplierInvoiceListComponent implements OnInit, AfterViewInit, AfterViewChecked {

  @ViewChild(DatatableComponent) table!: DatatableComponent;

  rows: any[] = [];
  tempData: any[] = [];
  searchValue = '';
  ColumnMode = ColumnMode;
  selectedOption = 10;

  // KPI
  totalPending = 0;
  autoMatched = 0;
  mismatched = 0;
  awaitingApproval = 0;

  // Lines modal
  showLinesModal = false;
  modalLines: any[] = [];
  modalTotalQty = 0;
  modalTotalAmt = 0;

  // Match modal
  showMatchModal = false;
  currentRow: any = null;
  threeWay: ThreeWayMatch | null = null;
  matchIssues: string[] = [];
  pinMismatchLabel: string | null = null;
  isPosting = false;

  // Period Lock
  isPeriodLocked = false;
  currentPeriodName = '';

  constructor(
    private api: SupplierInvoiceService,
    private router: Router,
    private periodService: PeriodCloseService
  ) {}

  ngOnInit(): void {
    const today = new Date().toISOString().substring(0, 10);
    this.checkPeriodLockForDate(today);
    this.loadInvoices();
  }

  ngAfterViewInit(): void { feather.replace(); }
  ngAfterViewChecked(): void { feather.replace(); }

  private checkPeriodLockForDate(dateStr: string): void {
    if (!dateStr) return;

    this.periodService.getStatusForDateWithName(dateStr).subscribe({
      next: (res: PeriodStatusDto | null) => {
        this.isPeriodLocked = !!res?.isLocked;
        this.currentPeriodName = res?.periodName || '';
      },
      error: () => {
        this.isPeriodLocked = false;
        this.currentPeriodName = '';
      }
    });
  }

  private showPeriodLockedSwal(action: string): void {
    Swal.fire(
      'Period Locked',
      this.currentPeriodName
        ? `Period "${this.currentPeriodName}" is locked. You cannot ${action} in this period.`
        : `Selected accounting period is locked. You cannot ${action}.`,
      'warning'
    );
  }

loadInvoices(): void {
  this.api.getAll().subscribe({
    next: (res: any) => {
      const data = res?.data || res || [];

      const mapped = (data || []).map((x: any) => {
        // ✅ SAFE bool
        const rawMatch = (x.pinMatch ?? x.PinMatch);
        const pinMatch = (rawMatch === true || rawMatch === 1 || rawMatch === '1' || rawMatch === 'true');

        return {
          id: x.id,
          invoiceNo: x.invoiceNo,
          invoiceDate: x.invoiceDate,
          amount: this.toNumber(x.amount),
          tax: this.toNumber(x.tax),
          currencyId: x.currencyId,
          status: Number(x.status ?? 0),

          supplierId: x.supplierId,
          supplierName: x.supplierName,

          // ✅ GRN info
          grnNos: x.grnNos ?? '',
          grnCount: Number(x.grnCount ?? 0),

          // ✅ List status (IMPORTANT)
          listStatusCode: Number(x.listStatusCode ?? 0),
          listStatusLabel: x.listStatusLabel ?? '',
          linkedWithInvoiceNo: x.linkedWithInvoiceNo ?? null,

          // ✅ action flags (from API)
          canEdit: (x.canEdit === true || x.canEdit === 1 || x.canEdit === 'true'),
          canApproveToAp: (x.canApproveToAp === true || x.canApproveToAp === 1 || x.canApproveToAp === 'true'),

          // ✅ match ui
          pinMatch,
          matchStatus: x.matchStatus ?? (pinMatch ? 'OK' : 'MISMATCH'),
          mismatchLabel: x.mismatchLabel ?? null,

          // json
          linesJson: x.linesJson || '[]',

          // partial
          isPartialInvoice: (x.isPartialInvoice === true || x.isPartialInvoice === 1 || x.isPartialInvoice === 'true')
        };
      });

      this.rows = mapped;
      this.tempData = [...mapped];

      if (this.table) this.table.offset = 0;

      this.recalcSummary();
    },
    error: (e) => console.error(e)
  });
}

private toNumber(v: any): number {
  const n = Number(v);
  return isNaN(n) ? 0 : n;
}

private recalcSummary(): void {
  const all = this.rows || [];
  this.totalPending = all.filter(r => +r.status !== 3).length;
  this.awaitingApproval = all.filter(r => +r.status === 2).length;

  this.autoMatched = all.filter(r => +r.status !== 3 && r.pinMatch === true).length;
  this.mismatched  = all.filter(r => +r.status !== 3 && r.pinMatch === false).length;
}

 

  filterUpdate(event: any): void {
    const val = (event?.target?.value || '').toLowerCase().trim();

    if (!val) {
      this.rows = [...this.tempData];
      if (this.table) this.table.offset = 0;
      return;
    }

    this.rows = this.tempData.filter(d =>
      (d.invoiceNo || '').toLowerCase().includes(val) ||
      String(d.amount || '').toLowerCase().includes(val) ||
      this.statusText(+d.status).toLowerCase().includes(val) ||
      (d.invoiceDate ? new Date(d.invoiceDate).toLocaleDateString().toLowerCase() : '').includes(val)
    );

    if (this.table) this.table.offset = 0;
  }

  statusText(s: number): string {
    return s === 0 ? 'Draft'
      : s === 1 ? 'Hold'
      : s === 2 ? 'Debit Note Created'
      : s === 3 ? 'Posted to A/P'
      : 'Unknown';
  }

  // ================= NAV =================

  goToCreate(): void {
    if (this.isPeriodLocked) { this.showPeriodLockedSwal('create Supplier Invoice'); return; }
    this.router.navigate(['/purchase/Create-SupplierInvoice']);
  }

  editInvoice(id: number): void {
    if (this.isPeriodLocked) { this.showPeriodLockedSwal('edit Supplier Invoice'); return; }
    this.router.navigate(['/purchase/Edit-SupplierInvoice', id]);
  }

  deleteInvoice(id: number): void {
    if (this.isPeriodLocked) { this.showPeriodLockedSwal('delete Supplier Invoice'); return; }

    Swal.fire({
      title: 'Are you sure?',
      text: 'This will permanently delete the supplier invoice.',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#d33',
      cancelButtonColor: '#3085d6',
      confirmButtonText: 'Yes, delete it!'
    }).then(r => {
      if (!r.isConfirmed) return;

      this.api.delete(id).subscribe({
        next: () => {
          this.loadInvoices();
          Swal.fire('Deleted!', 'Supplier invoice has been deleted.', 'success');
        },
        error: (err) => Swal.fire('Error', err?.error?.message || err?.message || 'Delete failed', 'error')
      });
    });
  }

  // ================= LINES MODAL =================

  openLinesModal(row: any): void {
    let lines: any[] = [];
    try { lines = JSON.parse(row?.linesJson || '[]'); } catch { lines = []; }

    this.modalLines = lines;

    this.modalTotalQty = lines.reduce((s, l) => s + (Number(l?.qty) || 0), 0);

   this.modalTotalAmt = (lines || []).reduce((s: number, l: any) => {
  // ✅ prefer lineGrandTotal (with tax)
  const grand = l?.lineGrandTotal != null ? Number(l.lineGrandTotal) : null;

  if (grand != null && !isNaN(grand)) return s + grand;

  // fallback: if grand not present, fallback to lineTotal or qty*unit
  const qty = Number(l?.qty) || 0;
  const unit = l?.unitPrice != null ? Number(l.unitPrice) : Number(l?.price || 0);
  const base = l?.lineTotal != null ? Number(l.lineTotal) : (qty * unit);

  return s + (isNaN(base) ? 0 : base);
}, 0);

    this.showLinesModal = true;
  }

  closeLinesModal(): void { this.showLinesModal = false; }

  // ================= 3-WAY MATCH =================

openMatchModal(row: any): void {
  this.currentRow = row;
  this.showMatchModal = true;
  this.threeWay = null;
  this.pinMismatchLabel = null;
  this.matchIssues = [];

  this.api.getThreeWayMatch(row.id).subscribe({
    next: (res: any) => {
      const x = res?.data ?? res ?? null;
      if (!x) return;

      // normalize booleans
      const pinMatch = (x.pinMatch === true || x.pinMatch === 1 || x.pinMatch === '1' || x.pinMatch === 'true');
      const isLast = (x.isLastPinInGroup === true || x.isLastPinInGroup === 1 || x.isLastPinInGroup === '1' || x.isLastPinInGroup === 'true');

     this.threeWay = {
  poId: x.poId,
  poNo: x.poNo,
  poQty: Number(x.poQty ?? 0),
  poPrice: Number(x.poPrice ?? 0),
  poTotal: Number(x.poTotal ?? 0),

  grnCount: Number(x.grnCount ?? 0),
  grnNos: x.grnNos ?? '',
  grnReceivedQty: Number(x.grnReceivedQty ?? 0),
  pendingReceiveQty: Number(x.pendingReceiveQty ?? 0), // ✅
  grnStatus: x.grnStatus ?? 'OK',

  pinId: x.pinId,
  pinNo: x.pinNo,
  pinQty: Number(x.pinQty ?? 0),
  pinTotal: Number(x.pinTotal ?? 0),

  totalInvoicedQty: Number(x.totalInvoicedQty ?? 0),
  lastPinId: Number(x.lastPinId ?? 0),
  isLastPinInGroup: this.toBool(x.isLastPinInGroup),

  pinMatch: this.toBool(x.pinMatch),
  mismatchLabel: x.mismatchLabel ?? null
};

      // mismatch label + issues
      this.pinMismatchLabel = x.mismatchLabel ?? (pinMatch ? null : 'Mismatch');

      const issues: string[] = [];
      if (Math.abs(this.threeWay.grnReceivedQty - this.threeWay.poQty) > 0.0001) {
        issues.push(`GRN vs PO Qty mismatch (${this.threeWay.grnReceivedQty} vs ${this.threeWay.poQty})`);
      }
      if (Math.abs(this.threeWay.pinQty - this.threeWay.grnReceivedQty) > 0.0001) {
        issues.push(`PIN vs GRN Qty mismatch (${this.threeWay.pinQty} vs ${this.threeWay.grnReceivedQty})`);
      }

      // group status info
      if (!this.threeWay.isLastPinInGroup) {
        issues.push(`Linked: This is not last invoice. Last PIN ID: ${this.threeWay.lastPinId}`);
      }

      this.matchIssues = issues;

      // ✅ IMPORTANT: canApproveToAp only for last invoice and all qty invoiced equals GRN
      const canApprove =
        this.threeWay.isLastPinInGroup &&
        Math.abs(this.threeWay.totalInvoicedQty - this.threeWay.grnReceivedQty) <= 0.0001 &&
        this.threeWay.pinMatch === true;

      // row-level flag used by Approve button disable
      this.currentRow.canApproveToAp = canApprove;
    },
    error: (e) => console.error(e)
  });
}
private toBool(v: any): boolean {
  if (v === true) return true;
  if (v === false) return false;

  // number
  if (v === 1 || v === '1') return true;
  if (v === 0 || v === '0') return false;

  // string
  if (typeof v === 'string') {
    const s = v.trim().toLowerCase();
    if (s === 'true' || s === 'yes' || s === 'y') return true;
    if (s === 'false' || s === 'no' || s === 'n') return false;
  }

  return false;
}
  closeMatchModal(): void {
    this.showMatchModal = false;
    this.currentRow = null;
    this.threeWay = null;
    this.matchIssues = [];
    this.pinMismatchLabel = null;
    this.isPosting = false;
  }

  goToDebitNote(): void {
    if (!this.currentRow) return;
    this.router.navigate(['/purchase/create-debitnote'], { queryParams: { pinId: this.currentRow.id } });
    this.closeMatchModal();
  }

  approveAndPostToAp(): void {
    if (!this.currentRow) return;

    this.isPosting = true;
    this.api.postToAp(this.currentRow.id).subscribe({
      next: () => {
        this.isPosting = false;
        this.closeMatchModal();
        this.loadInvoices();
        Swal.fire('Posted', 'Invoice posted to A/P.', 'success');
      },
      error: () => {
        this.isPosting = false;
        Swal.fire('Error', 'Failed to post to A/P.', 'error');
      }
    });
  }
isPartialRow(row: any): boolean {
  const v = row?.isPartialInvoice ?? row?.IsPartialInvoice;
  return v === true || v === 'true' || v === 1 || v === '1';
}

isActionDisabled(row: any): boolean {
  const status = Number(row?.status || 0);

  if (this.isPeriodLocked) return true;     // locked => all disabled
  if (status === 3) return true;            // posted => all disabled

  // ✅ status=2 normally disabled, BUT partial should still allow edit
  if (status === 2 && this.isPartialRow(row)) return false;

  // status=2 not partial => disable
  if (status === 2) return true;

  return false; // others enabled
}

canShowEdit(row: any): boolean {
  const status = Number(row?.status || 0);

  if (this.isPeriodLocked) return false;
  if (status === 3) return false;

  // ✅ partial => always show edit (even if status=2)
  if (this.isPartialRow(row)) return true;

  // (optional) hold => show edit
  return status === 1;
}

canShowDelete(row: any): boolean {
  const status = Number(row?.status || 0);

  if (this.isPeriodLocked) return false;
  if (status === 3) return false;

  // ✅ partial => usually DON'T allow delete (safe)
  if (this.isPartialRow(row)) return false;

  // allow delete only in Hold
  return status === 1;
}

}