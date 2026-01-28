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

interface ThreeWayMatch {
  poId: number;
  poNo: string;
  poQty: number;
  poPrice: number;
  poTotal: number;

  grnId: number;
  grnNo: string;
  grnReceivedQty: number;
  grnVarianceQty: number;
  grnStatus: string;

  pinId: number;
  pinNo: string;
  pinQty: number;
  pinTotal: number;

  pinMatch: boolean; // true = match, false = mismatch
}
export interface PeriodStatusDto {
  isLocked: boolean;
  periodName?: string;
  periodCode?: string;
  startDate?: string;
  endDate?: string;
}

// this matches what you showed
export interface PeriodStatusResponseRaw {
  isSuccess?: boolean;
  isLocked?: boolean;
  periodName?: string;
  startDate?: string;
  endDate?: string;
  // in case backend later wraps in data
  data?: PeriodStatusDto | null;
}
@Component({
  selector: 'app-supplier-invoice-list',
  templateUrl: './supplier-invoice-list.component.html',
  styleUrls: ['./supplier-invoice-list.component.scss'],
  encapsulation: ViewEncapsulation.None
})
export class SupplierInvoiceListComponent
  implements OnInit, AfterViewInit, AfterViewChecked {

  @ViewChild(DatatableComponent) table!: DatatableComponent;

  rows: any[] = [];
  tempData: any[] = [];
  searchValue = '';
  ColumnMode = ColumnMode;
  selectedOption = 10;

  // KPI counters
  totalPending = 0;
  autoMatched = 0;
  mismatched = 0;
  awaitingApproval = 0;

  // lines modal
  showLinesModal = false;
  modalLines: any[] = [];
  modalTotalQty = 0;
  modalTotalAmt = 0;

  // 3-way match modal
  showMatchModal = false;
  currentRow: any = null;
  threeWay: ThreeWayMatch | null = null;
  matchIssues: string[] = [];
   pinMismatchLabel: string | null = null;
  isPosting = false;
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

  ngAfterViewInit(): void {
    feather.replace();
  }

  ngAfterViewChecked(): void {
    feather.replace();
  }
    private checkPeriodLockForDate(dateStr: string): void {
      if (!dateStr) { return; }
  
      this.periodService.getStatusForDateWithName(dateStr).subscribe({
        next: (res: PeriodStatusDto | null) => {
          this.isPeriodLocked = !!res?.isLocked;
          this.currentPeriodName = res?.periodName || '';
        },
        error: () => {
          // if fails, UI side don’t hard-lock; backend will still protect
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
  // ================= LOAD & SUMMARY =================

  loadInvoices(): void {
    this.api.getAll().subscribe({
      next: (res: any) => {
        const data = res?.data || res || [];
        const mapped = data.map((x: any) => ({
          id: x.id,
          invoiceNo: x.invoiceNo,
          invoiceDate: x.invoiceDate,
          amount: x.amount,
          tax: x.tax,
          currency: x.currency || 'SGD',
          status: Number(x.status ?? 0),
          linesJson: x.linesJson || '[]',
          // optional fields from backend, if you later add them
          pinMatch: x.pinMatch ?? null,
          matchStatus: x.matchStatus ?? null  // 'OK' | 'MISMATCH'
        }));

        this.rows = mapped;
        this.tempData = [...mapped];
        if (this.table) this.table.offset = 0;

        // compute KPIs from statuses and any existing match flags
        this.recalcSummary();
      },
      error: (e) => console.error(e)
    });
  }

  private recalcSummary(): void {
    const all = this.rows || [];

    // Not posted to AP
    this.totalPending = all.filter(r => r.status !== 3).length;

    // Awaiting approval: here using status=2 (Debit Note Created)
    this.awaitingApproval = all.filter(r => r.status === 2).length;

    // If some rows already have matchStatus / pinMatch info, count them
    this.autoMatched = all.filter(r => r.status !== 3 && r.pinMatch === true).length;
    this.mismatched = all.filter(r => r.status !== 3 && r.pinMatch === false).length;
  }

  // recompute KPIs when one row's match result is known
  private updateMatchSummaryForRow(rowId: number, pinMatch: boolean): void {
    const idx = this.rows.findIndex(r => r.id === rowId);
    if (idx !== -1) {
      this.rows[idx].pinMatch = pinMatch;
      this.rows[idx].matchStatus = pinMatch ? 'OK' : 'MISMATCH';
    }
    this.recalcSummary();
  }

  // =============== FILTER / SEARCH ===============

  filterUpdate(event: any): void {
    const val = (event?.target?.value || '').toLowerCase();

    if (!val) {
      this.rows = [...this.tempData];
      if (this.table) this.table.offset = 0;
      return;
    }

    const matches = (d: any) =>
      (d.invoiceNo || '').toLowerCase().includes(val) ||
      (d.currency || '').toLowerCase().includes(val) ||
      String(d.amount || '').toLowerCase().includes(val) ||
      this.statusText(d.status).toLowerCase().includes(val) ||
      (d.invoiceDate
        ? new Date(d.invoiceDate).toLocaleDateString().toLowerCase()
        : ''
      ).includes(val);

    this.rows = this.tempData.filter(matches);
    if (this.table) this.table.offset = 0;
  }

  // 0=Draft, 1=Hold, 2=Debit Note, 3=Posted to A/P
  statusText(s: number): string {
    return s === 0
      ? 'Draft'
      : s === 1
      ? 'Hold'
      : s === 2
      ? 'Debit Note Created'
      : s === 3
      ? 'Posted to A/P'
      : 'Unknown';
  }

  // =============== NAVIGATION / CRUD ===============

  goToCreate(): void {
     if (this.isPeriodLocked) {
      this.showPeriodLockedSwal('Create Purchase Requests');
      return;
    }
    this.router.navigate(['/purchase/Create-SupplierInvoice']);
  }

  editInvoice(id: number): void {
     if (this.isPeriodLocked) {
      this.showPeriodLockedSwal('edit Purchase Requests');
      return;
    }
    this.router.navigate(['/purchase/Edit-SupplierInvoice', id]);
  }

  deleteInvoice(id: number): void {
     if (this.isPeriodLocked) {
      this.showPeriodLockedSwal('edit Purchase Requests');
      return;
    }
    Swal.fire({
      title: 'Are you sure?',
      text: 'This will permanently delete the supplier invoice.',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#d33',
      cancelButtonColor: '#3085d6',
      confirmButtonText: 'Yes, delete it!',
      customClass: {
        confirmButton:
          'px-2 py-1 text-xs rounded-md text-white bg-red-600 hover:bg-red-700 mx-1',
        cancelButton:
          'px-2 py-1 text-xs rounded-md text-white bg-blue-600 hover:bg-blue-700 mx-1'
      }
    }).then((result) => {
      if (result.isConfirmed) {
        this.api.delete(id).subscribe({
          next: () => {
            this.loadInvoices();
            Swal.fire(
              'Deleted!',
              'Supplier invoice has been deleted.',
              'success'
            );
          },
          error: (err) => console.error('Error deleting invoice', err)
        });
      }
    });
  }

openLinesModal(row: any): void {
  let lines: any[] = [];
  try {
    lines = JSON.parse(row?.linesJson || '[]');
  } catch {
    lines = [];
  }

  this.modalLines = lines;

  // total qty
  this.modalTotalQty = lines.reduce(
    (s, l) => s + (Number(l?.qty) || 0),
    0
  );

  // total amount = Σ lineTotal (fallback to qty * unitPrice/price)
  this.modalTotalAmt = lines.reduce((s, l) => {
    const qty = Number(l?.qty) || 0;
    const unit = l?.unitPrice != null ? Number(l.unitPrice) : Number(l?.price || 0);
    const lineTotal =
      l?.lineTotal != null ? Number(l.lineTotal) : qty * unit;

    return s + lineTotal;
  }, 0);

  this.showLinesModal = true;
}


  closeLinesModal(): void {
    this.showLinesModal = false;
  }

  // =============== 3-WAY MATCH MODAL ===============

  openMatchModal(row: any): void {
    this.currentRow = row;
    this.showMatchModal = true;
    this.threeWay = null;
    this.matchIssues = [];

    this.api.getThreeWayMatch(row.id).subscribe({
      next: (res: any) => {
        const d = res?.data || res || null;
        if (!d) {
          this.threeWay = null;
          return;
        }

        const match: ThreeWayMatch = {
          ...d,
          pinMatch: !!(d.pinMatch ?? d.PinMatch)
        };
        this.threeWay = match;

       const issues: string[] = [];
const qtyDiff = Math.abs((match.pinQty || 0) - (match.poQty || 0));
const totalDiff = Math.abs((match.pinTotal || 0) - (match.poTotal || 0));

// qty issue
if (qtyDiff > 0.0001) {
  issues.push(`Quantity mismatch: PO ${match.poQty || 0}, PIN ${match.pinQty || 0}`);
}

// price/total issue
if (totalDiff > 0.01) {
  const poTotal = (match.poTotal ?? 0).toFixed(2);
  const pinTotal = (match.pinTotal ?? 0).toFixed(2);
  issues.push(`Price/Total mismatch: PO ${poTotal}, PIN ${pinTotal}`);
}

this.matchIssues = issues;

// 👉 short label near "Mismatch"
if (!match.pinMatch) {
  const tags: string[] = [];
  if (qtyDiff > 0.0001) tags.push('Qty');
  if (totalDiff > 0.01) tags.push('Total');

  this.pinMismatchLabel = tags.length
    ? `Mismatch (${tags.join(' & ')})`
    : 'Mismatch';
} else {
  this.pinMismatchLabel = 'Match';
}

// update row + KPI
this.updateMatchSummaryForRow(row.id, match.pinMatch);
      },
      error: (err) => {
        console.error('Error loading 3-way match', err);
        this.showMatchModal = false;
        Swal.fire('Error', 'Unable to load 3-way match details.', 'error');
      }
    });
  }

  closeMatchModal(): void {
    this.showMatchModal = false;
    this.currentRow = null;
    this.threeWay = null;
    this.matchIssues = [];
    this.isPosting = false;
  }

  // NEW: navigate to Debit Note create screen with this PIN
  goToDebitNote(): void {
    if (!this.currentRow) { return; }

    this.router.navigate(['/purchase/create-debitnote'], {
      queryParams: {
        pinId: this.currentRow.id
      }
    });

    this.closeMatchModal();
  }

  // =============== STATUS ACTIONS ===============

  // Status 3 = Posted to A/P
  approveAndPostToAp(): void {
    if (!this.currentRow) return;

    this.isPosting = true;
    this.api.postToAp(this.currentRow.id).subscribe({
      next: () => {
        this.currentRow.status = 3;
        this.isPosting = false;
        this.closeMatchModal();
        this.loadInvoices();
        Swal.fire('Posted', 'Invoice posted to A/P.', 'success');
      },
      error: (err) => {
        console.error('Post to A/P failed', err);
        this.isPosting = false;
        Swal.fire('Error', 'Failed to post to A/P.', 'error');
      }
    });
  }
}
