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

  public ColumnMode = ColumnMode;
  public selectedOption = 10;
  public searchValue = '';

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

  userId: number = 0;
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
    private permissionService: PermissionService
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

  loadList(): void {
    this.api.getCreditNote().subscribe({
      next: (res: any) => {
        const list = res?.data ?? [];

        this.rows = list.map((r: any) => ({
          id: +r.id,
          creditNoteNo: r.creditNoteNo,
          doNumber: r.doNumber ?? r.DoNumber ?? '',
          siNumber: r.siNumber ?? r.SiNumber ?? '',
          customerName: r.customerName ?? '',
          creditNoteDate: r.creditNoteDate,
          status: r.status ?? 1,
          subtotal: +r.subtotal || 0,
          lineItems: r.lines ?? []
        }));

        this.tempData = [...this.rows];

        if (this.initialCnParam) {
          this.searchValue = this.initialCnParam;
          this.filterUpdate(null);
        }
      },
      error: () => {
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

      return (
        !val ||
        (d.creditNoteNo || '').toLowerCase().includes(val) ||
        (d.doNumber || '').toLowerCase().includes(val) ||
        (d.siNumber || '').toLowerCase().includes(val) ||
        (d.customerName || '').toLowerCase().includes(val) ||
        cnDate.includes(val)
      );
    });

    if (this.table) {
      this.table.offset = 0;
    }
  }

  statusText(v: any): string {
    const code = Number(v);
    if (code === 2) return 'Approved';
    if (code === 3) return 'Posted';
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
      itemName: l.itemName,
      uom: l.uom,
      deliveredQty: l.deliveredQty,
      returnedQty: l.returnedQty,
      reasonName: l.reasonName,
      reasonId: l.reasonId,
      restockDispositionId: l.restockDispositionId
    }));

    this.showLinesModal = true;
  }

  closeLinesModal(): void {
    this.showLinesModal = false;
  }

  reasonName(id?: number | null): string | null {
    if (!id) return null;

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

    this.router.navigate(['/Sales/Return-credit-edit', row.id]);
  }

  delete(id: number): void {
    if (!this.canDelete()) {
      Swal.fire({
        icon: 'warning',
        title: 'Access Denied',
        text: 'You do not have delete permission.',
        confirmButtonColor: '#0e3a4c'
      });
      return;
    }

    if (this.isPeriodLocked) {
      this.showPeriodLockedSwal('delete Credit Notes');
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
      if (!result.isConfirmed) return;

      this.api.deleteCreditNote(id).subscribe({
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
}