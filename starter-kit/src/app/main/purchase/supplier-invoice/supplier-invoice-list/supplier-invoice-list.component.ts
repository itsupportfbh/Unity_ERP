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

  pinMatch: boolean;
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

  // ================= LOAD =================

loadInvoices(): void {
  this.api.getAll().subscribe({
    next: (res: any) => {
      const data = res?.data || res || [];

      const mapped = data.map((x: any) => {
        // ✅ SAFE boolean
        const raw = (x.pinMatch ?? x.PinMatch);
        const pinMatch = (raw === true || raw === 1 || raw === '1' || raw === 'true');

        return {
          id: x.id,
          invoiceNo: x.invoiceNo,
          invoiceDate: x.invoiceDate,
          amount: x.amount,
          tax: x.tax,
          currencyId: x.currencyId,
          status: Number(x.status ?? 0),

          // ✅ show GRNs
          grnNos: x.grnNos || '',

          // ✅ Match button
          pinMatch,
          matchStatus: pinMatch ? 'OK' : 'MISMATCH',
          mismatchLabel: x.mismatchLabel || null,

          linesJson: x.linesJson || '[]'
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

    this.modalTotalAmt = lines.reduce((s, l) => {
      const qty = Number(l?.qty) || 0;
      const unit = l?.unitPrice != null ? Number(l.unitPrice) : Number(l?.price || 0);
      const lineTotal = l?.lineTotal != null ? Number(l.lineTotal) : qty * unit;
      return s + lineTotal;
    }, 0);

    this.showLinesModal = true;
  }

  closeLinesModal(): void { this.showLinesModal = false; }

  // ================= 3-WAY MATCH =================

  openMatchModal(row: any): void {
    this.currentRow = row;
    this.showMatchModal = true;
    this.threeWay = null;
    this.matchIssues = [];
    this.pinMismatchLabel = null;

    this.api.getThreeWayMatch(row.id).subscribe({
      next: (res: any) => {
        const d = res?.data || res || null;
        if (!d) return;

        const match: ThreeWayMatch = { ...d, pinMatch: !!(d.pinMatch ?? d.PinMatch) };
        this.threeWay = match;

        // Issues
        const issues: string[] = [];
        const qtyDiff = Math.abs((match.pinQty || 0) - (match.poQty || 0));
        const totalDiff = Math.abs((match.pinTotal || 0) - (match.poTotal || 0));

        if (qtyDiff > 0.0001) issues.push(`Quantity mismatch: PO ${match.poQty || 0}, PIN ${match.pinQty || 0}`);
        if (totalDiff > 0.01) issues.push(`Price/Total mismatch: PO ${(match.poTotal ?? 0).toFixed(2)}, PIN ${(match.pinTotal ?? 0).toFixed(2)}`);

        this.matchIssues = issues;

        if (!match.pinMatch) {
          const tags: string[] = [];
          if (qtyDiff > 0.0001) tags.push('Qty');
          if (totalDiff > 0.01) tags.push('Total');
          this.pinMismatchLabel = tags.length ? `Mismatch (${tags.join(' & ')})` : 'Mismatch';
        } else {
          this.pinMismatchLabel = 'Match';
        }

        // Update list row for KPI + button label
        const idx = this.rows.findIndex(r => r.id === row.id);
        if (idx !== -1) {
          this.rows[idx].pinMatch = match.pinMatch;
          this.rows[idx].matchStatus = match.pinMatch ? 'OK' : 'MISMATCH';
          this.rows[idx].mismatchLabel = this.pinMismatchLabel;
        }
        this.recalcSummary();
      },
      error: () => {
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
}