import { Component, OnInit, ViewChild, ViewEncapsulation } from '@angular/core';
import { Router } from '@angular/router';
import { DatePipe } from '@angular/common';
import Swal from 'sweetalert2';
import { ColumnMode, DatatableComponent } from '@swimlane/ngx-datatable';
import * as feather from 'feather-icons';

import { DebitNoteService } from '../debit-note.service';
import { PeriodCloseService } from 'app/main/financial/period-close-fx/period-close-fx.service';
import { GstLockService } from 'app/main/financial/tax-gst/gst-lock.service';
import { FunctionPermission, PermissionService } from 'app/shared/permission.service';

export interface PeriodStatusDto {
  isLocked: boolean;
  periodName?: string;
  periodCode?: string;
  startDate?: string;
  endDate?: string;
}

@Component({
  selector: 'app-debit-note-list',
  templateUrl: './debit-note-list.component.html',
  styleUrls: ['./debit-note-list.component.scss'],
  encapsulation: ViewEncapsulation.None,
  providers: [DatePipe]
})
export class DebitNoteListComponent implements OnInit {
  @ViewChild(DatatableComponent) table!: DatatableComponent;

  rows: any[]     = [];
  tempData: any[] = [];

  searchValue    = '';
  selectedOption = 10;
  ColumnMode     = ColumnMode;

  showLinesModal    = false;
  modalLines: any[] = [];
  modalTotal        = 0;
  // ✅ Modal currency
  modalCurrencyName = '';
  modalFxRate       = 1;
  modalIsOverseas   = false;
  modalIncotermsName = '';

  isPeriodLocked    = false;
  currentPeriodName = '';

  lockedRowMap: { [key: number]: boolean } = {};

  userId     = 0;
  functionId = 'dn-list';

  permission:         FunctionPermission;
  isPermissionLoaded  = false;
  isPageLoading       = false;

  constructor(
    private debitNoteService: DebitNoteService,
    private router: Router,
    private datePipe: DatePipe,
    private periodService: PeriodCloseService,
    private permissionService: PermissionService,
    private gstLockService: GstLockService
  ) {
    this.userId     = Number(localStorage.getItem('id') || 0);
    this.permission = this.permissionService.getEmptyPermission(this.functionId);
  }

  ngOnInit(): void {
    const today = new Date().toISOString().substring(0, 10);
    this.checkPeriodLockForDate(today);
    this.loadPermission();
  }

  ngAfterViewInit(): void  { feather.replace(); }
  ngAfterViewChecked(): void { feather.replace(); }

  get hasLockedRows(): boolean {
    return Object.values(this.lockedRowMap || {}).some(x => x === true);
  }

  get hasGlPostedRows(): boolean {
    return (this.rows || []).some((x: any) =>
      x.glPosted === true || x.GlPosted === true ||
      x.glPosted === 1    || x.GlPosted === 1
    );
  }

  private checkPeriodLockForDate(dateStr: string): void {
    if (!dateStr) return;
    this.periodService.getStatusForDateWithName(dateStr).subscribe({
      next: (res: PeriodStatusDto | null) => {
        this.isPeriodLocked    = !!res?.isLocked;
        this.currentPeriodName = res?.periodName || '';
      },
      error: () => {
        this.isPeriodLocked    = false;
        this.currentPeriodName = '';
      }
    });
  }

  checkRowsGstLock(rows: any[], dateField: string, idField: string = 'id'): void {
    this.lockedRowMap = {};
    if (!rows || !rows.length) return;

    rows.forEach(row => {
      const id      = Number(row[idField] ?? 0);
      const docDate = row[dateField];
      if (!id || !docDate) { this.lockedRowMap[id] = false; return; }

      this.gstLockService.check(docDate).subscribe({
        next: (res: any) => { this.lockedRowMap[id] = !!res?.locked; },
        error: ()         => { this.lockedRowMap[id] = false; }
      });
    });
  }

  isRowLocked(row: any): boolean {
    if (!row) return false;
    return !!this.lockedRowMap[Number(row.id)];
  }

  loadPermission(): void {
    if (!this.userId || this.userId <= 0) {
      this.permission         = this.permissionService.getEmptyPermission(this.functionId);
      this.isPermissionLoaded = true;
      Swal.fire({ icon: 'warning', title: 'Access Denied',
        text: 'User not found. Please login again.', confirmButtonColor: '#0e3a4c' });
      return;
    }

    this.isPageLoading = true;
    this.permissionService.getFunctionPermission(this.userId, this.functionId).subscribe({
      next: (res: FunctionPermission) => {
        this.permission         = res || this.permissionService.getEmptyPermission(this.functionId);
        this.isPermissionLoaded = true;
        this.isPageLoading      = false;

        if (this.canView()) {
          this.loadRequests();
        } else {
          this.rows = []; this.tempData = []; this.lockedRowMap = {};
        }
      },
      error: () => {
        this.permission         = this.permissionService.getEmptyPermission(this.functionId);
        this.isPermissionLoaded = true;
        this.isPageLoading      = false;
        Swal.fire({ icon: 'error', title: 'Error',
          text: 'Unable to load permission.', confirmButtonColor: '#d33' });
      }
    });
  }

  canView():    boolean { return this.permissionService.hasView(this.permission); }
  canCreate():  boolean { return this.permissionService.hasCreate(this.permission); }
  canEdit():    boolean { return this.permissionService.hasEdit(this.permission); }
  canDelete():  boolean { return this.permissionService.hasDelete(this.permission); }
  canApprove(): boolean { return this.permissionService.hasApprove(this.permission); }

  loadRequests(): void {
    this.debitNoteService.getAll().subscribe({
      next: (res: any) => {
        const data = res?.data || res || [];

        this.rows = (data || []).map((x: any) => ({
          ...x,
          id:           Number(x.id           ?? x.Id           ?? 0),
          debitNoteNo:  x.debitNoteNo          ?? x.DebitNoteNo  ?? '',
          name:         x.name                 ?? x.supplierName ?? x.SupplierName ?? x.Name ?? '',
          supplierName: x.supplierName          ?? x.SupplierName ?? x.name        ?? x.Name ?? '',
          reason:       x.reason               ?? x.Reason       ?? '',
          status:       Number(x.status        ?? x.Status       ?? 0),
          poDate:       x.poDate               ?? x.noteDate     ?? x.NoteDate     ??
                        x.invoiceDate           ?? x.InvoiceDate  ?? x.createdDate  ?? x.CreatedDate ?? null,
          linesJson:    x.linesJson             ?? x.LinesJson    ?? '[]',
          glPosted:     x.glPosted === true     || x.GlPosted === true ||
                        x.glPosted === 1        || x.GlPosted === 1,
          glPostedDate: x.glPostedDate          ?? x.GlPostedDate ?? null,
          glJournalId:  x.glJournalId           ?? x.GlJournalId  ?? null,
          // ✅ FxRate fields
          amount:       Number(x.amount        ?? x.Amount       ?? 0),
          fxRate:       Number(x.fxRate        ?? x.FxRate       ?? 1),
          amountBase:   Number(x.amountBase    ?? x.AmountBase   ?? 0),
          currencyName: x.currencyName          ?? x.CurrencyName ?? '',
          isOverseas:   this.toBool(x.isOverseas ?? x.IsOverseas),
          incotermsName: x.incotermsName         ?? x.IncotermsName ?? ''
        }));

        this.tempData = [...this.rows];
        this.checkRowsGstLock(this.rows, 'poDate');
        if (this.table) this.table.offset = 0;
      },
      error: () => {
        this.rows = []; this.tempData = []; this.lockedRowMap = {};
        Swal.fire({ icon: 'error', title: 'Failed', text: 'Unable to load debit notes.' });
      }
    });
  }

  isGlPosted(row: any): boolean {
    return row?.glPosted === true;
  }

  filterUpdate(event: any): void {
    const val = (event?.target?.value ?? this.searchValue ?? '').toString().toLowerCase().trim();

    this.rows = this.tempData.filter(d => {
      const poDate = this.datePipe.transform(d.poDate, 'dd-MM-yyyy')?.toLowerCase() || '';
      return !val ||
        (d.debitNoteNo   || '').toLowerCase().includes(val) ||
        (d.name          || '').toLowerCase().includes(val) ||
        (d.supplierName  || '').toLowerCase().includes(val) ||
        (d.reason        || '').toLowerCase().includes(val) ||
        (d.incotermsName || '').toLowerCase().includes(val) ||
        (d.isOverseas ? 'overseas import' : 'local').includes(val) ||
        poDate.includes(val);
    });

    this.checkRowsGstLock(this.rows, 'poDate');
    if (this.table) this.table.offset = 0;
  }

  private showPeriodLockedSwal(action: string): void {
    Swal.fire({
      icon: 'warning',
      title: 'Period Locked',
      text: this.currentPeriodName
        ? `Period "${this.currentPeriodName}" is locked. You cannot ${action}.`
        : `Selected accounting period is locked. You cannot ${action}.`
    });
  }

  private showGstLockedSwal(): void {
    Swal.fire({ icon: 'warning', title: 'GST Locked',
      text: 'This debit note belongs to locked GST period.' });
  }

  openCreate(): void {
    if (this.hasGlPostedRows) {
      Swal.fire({ icon: 'warning', title: 'GL Posted',
        text: 'Already one Debit Note is GL posted. New Debit Note creation is disabled.' });
      return;
    }

    if (!this.canCreate()) {
      Swal.fire({ icon: 'warning', title: 'Access Denied',
        text: 'You do not have create permission.', confirmButtonColor: '#0e3a4c' });
      return;
    }

    if (this.isPeriodLocked) {
      this.showPeriodLockedSwal('create debit note');
      return;
    }

    this.router.navigate(['/purchase/create-debitnote']);
  }

  editDetails(row: any): void {
    if (!this.canEdit()) {
      Swal.fire({ icon: 'warning', title: 'Access Denied',
        text: 'You do not have edit permission.', confirmButtonColor: '#0e3a4c' });
      return;
    }

    if (this.isPeriodLocked) { this.showPeriodLockedSwal('edit debit note'); return; }
    if (this.isGlPosted(row)) {
      Swal.fire({ icon: 'warning', title: 'GL Posted',
        text: 'This debit note is already posted to GL.' });
      return;
    }
    if (this.isRowLocked(row)) { this.showGstLockedSwal(); return; }

    this.router.navigate(['/purchase/edit-debitnote', row.id]);
  }

  deleteDetails(row: any): void {
    if (!this.canDelete()) {
      Swal.fire({ icon: 'warning', title: 'Access Denied',
        text: 'You do not have delete permission.', confirmButtonColor: '#0e3a4c' });
      return;
    }

    if (this.isPeriodLocked) { this.showPeriodLockedSwal('delete debit note'); return; }
    if (this.isGlPosted(row)) {
      Swal.fire({ icon: 'warning', title: 'GL Posted',
        text: 'This debit note is already posted to GL.' });
      return;
    }
    if (this.isRowLocked(row)) { this.showGstLockedSwal(); return; }

    Swal.fire({
      title: 'Delete this debit note?',
      text: 'This action cannot be undone.',
      icon: 'warning',
      showCancelButton:    true,
      confirmButtonColor:  '#d33',
      cancelButtonColor:   '#6b7280',
      confirmButtonText:   'Yes, delete',
      cancelButtonText:    'Cancel'
    }).then(result => {
      if (!result.isConfirmed) return;

      this.debitNoteService.delete(row.id).subscribe({
        next: () => {
          Swal.fire('Deleted', 'Debit note deleted successfully.', 'success');
          this.loadRequests();
        },
        error: (err: any) => {
          Swal.fire({ icon: 'error', title: 'Delete failed',
            text: err?.error?.message || 'Unable to delete debit note.' });
        }
      });
    });
  }

  isActionDisabled(row: any): boolean {
    if (!row) return true;
    if (this.isGlPosted(row)) return true;
    if (this.isPeriodLocked || this.isRowLocked(row)) return true;
    if (+row.status === 2 || +row.status === 3 || +row.status === 4) return true;
    return false;
  }

  // ✅ Modal — currency + fxRate include
  openLinesModal(row: any): void {
    let lines: any[] = [];

    try {
      const raw = row.linesJson || row.LinesJson || '[]';
      lines = Array.isArray(raw) ? raw : JSON.parse(raw);
    } catch { lines = []; }

    this.modalLines = (lines || []).map((l: any) => ({
      item:    l.item     ?? l.itemName ?? l.ItemName ?? '-',
      qty:     Number(l.qty      ?? l.Qty      ?? l.varianceQty ?? l.VarianceQty ?? 0),
      price:   Number(l.price    ?? l.unitPrice ?? l.Price      ?? l.UnitPrice   ?? 0),
      remarks: l.remarks  ?? l.Remarks  ?? '',
      dcNoteNo: l.dcNoteNo ?? l.DcNoteNo ?? ''
    }));

    this.modalTotal = this.modalLines.reduce(
      (sum, l) => sum + (Number(l.qty) || 0) * (Number(l.price) || 0), 0);

    // ✅ Currency from row
    this.modalCurrencyName = row.currencyName || '';
    this.modalFxRate       = Number(row.fxRate || 1);
    this.modalIsOverseas   = this.toBool(row.isOverseas ?? row.IsOverseas);
    this.modalIncotermsName = row.incotermsName ?? row.IncotermsName ?? '';

    this.showLinesModal = true;
  }

  closeLinesModal(): void {
    this.showLinesModal    = false;
    this.modalLines        = [];
    this.modalTotal        = 0;
    this.modalCurrencyName = '';
    this.modalFxRate       = 1;
    this.modalIsOverseas   = false;
    this.modalIncotermsName = '';
  }

  private toBool(v: any): boolean {
    if (v === true || v === 1 || v === '1') return true;
    return String(v ?? '').toLowerCase() === 'true';
  }
}
