import { Component, OnInit, ViewChild, ViewEncapsulation, AfterViewInit, AfterViewChecked } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { ColumnMode, DatatableComponent } from '@swimlane/ngx-datatable';
import { DatePipe } from '@angular/common';
import Swal from 'sweetalert2';
import * as feather from 'feather-icons';

import { CreditNoteService } from '../return-credit.service';
import { StockIssueService } from 'app/main/master/stock-issue/stock-issue.service';
import { PeriodCloseService } from 'app/main/financial/period-close-fx/period-close-fx.service';
import { FunctionPermission, PermissionService } from 'app/shared/permission.service';
import { GstLockService } from 'app/main/financial/tax-gst/gst-lock.service';

export interface PeriodStatusDto {
  isLocked: boolean;
  periodName?: string;
  periodCode?: string;
  startDate?: string;
  endDate?: string;
}

@Component({
  selector: 'app-return-creditnote-list',
  templateUrl: './return-creditnote-list.component.html',
  styleUrls: ['./return-creditnote-list.component.scss'],
  encapsulation: ViewEncapsulation.None,
  providers: [DatePipe]
})
export class ReturnCreditnoteListComponent implements OnInit, AfterViewInit, AfterViewChecked {
  @ViewChild(DatatableComponent) table!: DatatableComponent;

  rows: any[] = [];
  tempData: any[] = [];

  ColumnMode = ColumnMode;
  selectedOption = 10;
  searchValue = '';

  showLinesModal = false;
  modalLines: any[] = [];

  dispositionMap = new Map<number, string>([
    [1, 'RESTOCK'],
    [2, 'SCRAP']
  ]);

  reasonList: any = { data: [] };
  initialCnParam: string | null = null;

  isPeriodLocked = false;
  currentPeriodName = '';

  lockedRowMap: { [key: number]: boolean } = {};

  userId = 0;
  functionId = 'cn-list';

  permission: FunctionPermission;
  isPermissionLoaded = false;
  isPageLoading = false;

  constructor(
    private api: CreditNoteService,
    private router: Router,
    private datePipe: DatePipe,
    private stockissueService: StockIssueService,
    private route: ActivatedRoute,
    private periodService: PeriodCloseService,
    private permissionService: PermissionService,
    private gstLockService: GstLockService
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

  get hasLockedRows(): boolean {
    return Object.values(this.lockedRowMap || {}).some(x => x === true);
  }

  checkRowsGstLock(rows: any[], dateField: string, idField: string = 'id'): void {
    this.lockedRowMap = {};

    if (!rows || !rows.length) {
      return;
    }

    rows.forEach(row => {
      const id = Number(row[idField] ?? 0);
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

    return !!this.lockedRowMap[Number(row.id)];
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
          const today = new Date().toISOString().substring(0, 10);
          this.checkPeriodLockForDate(today);

          this.route.queryParamMap.subscribe(params => {
            const cn = params.get('cn');
            if (cn) {
              this.initialCnParam = cn;
            }
          });

          this.loadList();
          this.loadReasons();
        } else {
          this.rows = [];
          this.tempData = [];
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

  private loadReasons(): void {
    this.stockissueService.getAllStockissue().subscribe({
      next: (res: any) => {
        this.reasonList = res || { data: [] };
      },
      error: () => {
        this.reasonList = { data: [] };
      }
    });
  }

  private checkPeriodLockForDate(dateStr: string): void {
    if (!dateStr) {
      return;
    }

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

  private showGstLockedSwal(): void {
    Swal.fire({
      icon: 'warning',
      title: 'GST Locked',
      text: 'This credit note belongs to locked GST period.'
    });
  }

  loadList(): void {
    this.api.getCreditNote().subscribe({
      next: (res: any) => {
        const list = res?.data ?? res ?? [];

        this.rows = (list || []).map((r: any) => ({
          id: Number(r.id ?? r.Id ?? 0),
          creditNoteNo: r.creditNoteNo ?? r.CreditNoteNo ?? '',
          doNumber: r.doNumber ?? r.DoNumber ?? '',
          siNumber: r.siNumber ?? r.SiNumber ?? '',
          customerName: r.customerName ?? r.CustomerName ?? '',
          creditNoteDate: r.creditNoteDate ?? r.CreditNoteDate ?? null,
          status: Number(r.status ?? r.Status ?? 1),
          subtotal: Number(r.subtotal ?? r.Subtotal ?? 0),
          lineItems: r.lines ?? r.Lines ?? r.lineItems ?? r.LineItems ?? [],
          glPosted: r.glPosted === true || r.GlPosted === true || r.glPosted === 1 || r.GlPosted === 1
        }));

        this.tempData = [...this.rows];
        this.checkRowsGstLock(this.rows, 'creditNoteDate');

        if (this.initialCnParam) {
          this.searchValue = this.initialCnParam;
          this.filterUpdate(null);
        }

        if (this.table) {
          this.table.offset = 0;
        }
      },
      error: () => {
        this.rows = [];
        this.tempData = [];
        this.lockedRowMap = {};

        Swal.fire({
          icon: 'error',
          title: 'Failed',
          text: 'Load credit notes'
        });
      }
    });
  }

  filterUpdate(event: any): void {
    const val = (event?.target?.value ?? this.searchValue ?? '').toString().toLowerCase().trim();

    this.rows = this.tempData.filter(d => {
      const cnDate = this.datePipe.transform(d.creditNoteDate, 'dd-MM-yyyy')?.toLowerCase() || '';

      return !val ||
        (d.creditNoteNo || '').toLowerCase().includes(val) ||
        (d.doNumber || '').toLowerCase().includes(val) ||
        (d.siNumber || '').toLowerCase().includes(val) ||
        (d.customerName || '').toLowerCase().includes(val) ||
        cnDate.includes(val);
    });

    this.checkRowsGstLock(this.rows, 'creditNoteDate');

    if (this.table) {
      this.table.offset = 0;
    }
  }

  statusText(v: any): string {
    const code = Number(v);

    if (code === 2) {
      return 'Approved';
    }

    if (code === 3) {
      return 'Posted';
    }

    return 'Draft';
  }

  statusStyle(v: any): any {
    const code = Number(v);

    if (code === 2) {
      return { background: '#e6f4ea', color: '#127c39' };
    }

    if (code === 3) {
      return { background: '#e7f0ff', color: '#1d4ed8' };
    }

    return { background: '#fff7e6', color: '#b45309' };
  }

isActionDisabled(row: any): boolean {
  if (!row) {
    return true;
  }

  if (this.isPeriodLocked || this.isRowLocked(row) || this.isGlPosted(row)) {
    return true;
  }

  if (+row.status === 2 || +row.status === 3) {
    return true;
  }

  return false;
}

  openLinesModal(row: any): void {
    let lines: any[] = [];

    try {
      lines = Array.isArray(row?.lineItems)
        ? row.lineItems
        : JSON.parse(row?.lineItems || '[]');
    } catch {
      lines = [];
    }

    this.modalLines = (lines || []).map(l => ({
      itemName: l.itemName ?? l.ItemName ?? '-',
      uom: l.uom ?? l.Uom ?? l.UOM ?? '-',
      deliveredQty: Number(l.deliveredQty ?? l.DeliveredQty ?? 0),
      returnedQty: Number(l.returnedQty ?? l.ReturnedQty ?? 0),
      reasonName: l.reasonName ?? l.ReasonName ?? '',
      reasonId: l.reasonId ?? l.ReasonId ?? null,
      restockDispositionId: l.restockDispositionId ?? l.RestockDispositionId ?? null
    }));

    this.showLinesModal = true;
  }

  closeLinesModal(): void {
    this.showLinesModal = false;
    this.modalLines = [];
  }

  reasonName(id?: number | null): string | null {
    if (!id) {
      return null;
    }

    const list = this.reasonList?.data ?? [];
    const found = list.find((x: any) => +x.id === +id);

    return found?.stockIssuesNames || null;
  }

  dispositionName(id?: number | null): string {
    const key = id != null ? +id : 0;
    return this.dispositionMap.get(key) ?? '-';
  }

openCreate(): void {
  if (!this.canCreate()) {
    Swal.fire({
      icon: 'warning',
      title: 'Access Denied',
      text: 'You do not have create permission.',
      confirmButtonColor: '#0e3a4c'
    });
    return;
  }

  if (this.hasGlPostedRows) {
    Swal.fire({
      icon: 'warning',
      title: 'GL Posted',
      text: 'GL posted Credit Note exists. Add button disabled.'
    });
    return;
  }

  if (this.isPeriodLocked) {
    this.showPeriodLockedSwal('create Credit Notes');
    return;
  }

  this.router.navigate(['/Sales/Return-credit-create']);
}

  edit(row: any): void {
    if (!this.canEdit()) {
      Swal.fire({
        icon: 'warning',
        title: 'Access Denied',
        text: 'You do not have edit permission.',
        confirmButtonColor: '#0e3a4c'
      });
      return;
    }

    if (+row?.status === 2 || +row?.status === 3) {
      Swal.fire({
        icon: 'warning',
        title: 'Cannot Edit',
        text: 'Approved/Posted credit note cannot be edited.',
        confirmButtonColor: '#0e3a4c'
      });
      return;
    }

    if (this.isPeriodLocked) {
      this.showPeriodLockedSwal('edit Credit Notes');
      return;
    }

    if (this.isRowLocked(row)) {
      this.showGstLockedSwal();
      return;
    }

    this.router.navigate(['/Sales/Return-credit-edit', row.id]);
  }

  delete(row: any): void {
    if (!this.canDelete()) {
      Swal.fire({
        icon: 'warning',
        title: 'Access Denied',
        text: 'You do not have delete permission.',
        confirmButtonColor: '#0e3a4c'
      });
      return;
    }

    if (+row?.status === 2 || +row?.status === 3) {
      Swal.fire({
        icon: 'warning',
        title: 'Cannot Delete',
        text: 'Approved/Posted credit note cannot be deleted.',
        confirmButtonColor: '#0e3a4c'
      });
      return;
    }

    if (this.isPeriodLocked) {
      this.showPeriodLockedSwal('delete Credit Notes');
      return;
    }

    if (this.isRowLocked(row)) {
      this.showGstLockedSwal();
      return;
    }

    Swal.fire({
      title: 'Are you sure?',
      text: 'This will permanently delete the Credit Note.',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#d33',
      cancelButtonColor: '#3085d6',
      confirmButtonText: 'Yes, delete it!'
    }).then(result => {
      if (!result.isConfirmed) {
        return;
      }

      this.api.deleteCreditNote(row.id).subscribe({
        next: () => {
          this.loadList();
          Swal.fire('Deleted!', 'Credit Note has been deleted.', 'success');
        },
        error: () => {
          Swal.fire({
            icon: 'error',
            title: 'Delete failed'
          });
        }
      });
    });
  }
  isGlPosted(row: any): boolean {
  return row?.glPosted === true;
}

// isActionDisabled(row: any): boolean {
//   return this.isRowLocked(row) || this.isGlPosted(row);
// }
get hasGlPostedRows(): boolean {
  return (this.rows || []).some((x: any) =>
    x.glPosted === true ||
    x.GlPosted === true ||
    x.glPosted === 1 ||
    x.GlPosted === 1
  );
}
}