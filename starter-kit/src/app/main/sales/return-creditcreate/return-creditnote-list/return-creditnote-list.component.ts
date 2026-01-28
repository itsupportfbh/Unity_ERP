import { Component, OnInit, ViewChild, ViewEncapsulation } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { ColumnMode, DatatableComponent } from '@swimlane/ngx-datatable';
import { DatePipe } from '@angular/common';
import Swal from 'sweetalert2';
import * as feather from 'feather-icons';
import { CreditNoteService } from '../return-credit.service';
import { StockIssueService } from 'app/main/master/stock-issue/stock-issue.service';
import { PeriodCloseService } from 'app/main/financial/period-close-fx/period-close-fx.service';

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
export class ReturnCreditnoteListComponent implements OnInit {

  @ViewChild(DatatableComponent) table: DatatableComponent;

  rows: any[] = [];
  tempData: any[] = [];

  public ColumnMode = ColumnMode;
  public selectedOption = 10;
  public searchValue = '';

  showLinesModal = false;
  modalLines: any[] = [];

  // if you load reason master to resolve name in modal (optional)

  dispositionMap = new Map<number, string>([
    [1, 'RESTOCK'],
    [2, 'SCRAP']
  ]);
  reasonList: any;
  initialCnParam: string | null = null;
isPeriodLocked = false;
  currentPeriodName = '';
  constructor(
    private api: CreditNoteService,
    private router: Router,
    private datePipe: DatePipe,
    private StockissueService: StockIssueService,
    private route: ActivatedRoute,
    private periodService: PeriodCloseService
  ) { }

  ngOnInit(): void {
      const today = new Date().toISOString().substring(0, 10);
    this.checkPeriodLockForDate(today);
    this.route.queryParamMap.subscribe(params => {
      const cn = params.get('cn');
      if (cn) {
        this.initialCnParam = cn;
      }
    });
    this.loadList();
    this.StockissueService.getAllStockissue().subscribe((res: any) => {
      this.reasonList = res
    })
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
  // Load all CNs
  loadList(): void {
    this.api.getCreditNote().subscribe({
      next: (res: any) => {
        const list = res?.data ?? [];
        // normalize rows
        this.rows = list.map((r: any) => ({
          id: +r.id,
          creditNoteNo: r.creditNoteNo,
          doNumber: r.doNumber ?? r.DoNumber ?? '',
          siNumber: r.siNumber ?? r.SiNumber ?? '',
          customerName: r.customerName ?? '',
          creditNoteDate: r.creditNoteDate,
          status: r.status ?? 1,
          subtotal: +r.subtotal || 0,
          // keep raw lines for modal; allow either embedded array or fetch by id later
          lineItems: r.lines ?? []
        }));
        this.tempData = [...this.rows];

        if (this.initialCnParam) {
          this.searchValue = this.initialCnParam;
          this.filterUpdate(null);        // event can be null – see below
        }
      },
      error: _ => Swal.fire({ icon: 'error', title: 'Failed', text: 'Load credit notes' })
    });


  }


  filterUpdate(event: any) {
    const val = (event?.target?.value ?? this.searchValue ?? '').toString().toLowerCase();

    const temp = this.tempData.filter(d => {
      const cnDate = this.datePipe.transform(d.creditNoteDate, 'dd-MM-yyyy')?.toLowerCase() || '';


      return (
        (d.creditNoteNo?.toLowerCase().includes(val)) ||
        (d.doNumber?.toLowerCase().includes(val)) ||
        (d.siNumber?.toLowerCase().includes(val)) ||
        (d.customerName?.toLowerCase().includes(val)) ||
        cnDate.includes(val) ||
        val === ''
      );
    });

    this.rows = temp;
    if (this.table) this.table.offset = 0;
  }

  // Status helpers
  statusText(v: any): string {
    const code = Number(v);
    if (code === 2) return 'Approved';
    if (code === 3) return 'Posted';
    return 'Draft';
  }
  statusStyle(v: any) {
    const code = Number(v);
    if (code === 2) return { background: '#e6f4ea', color: '#127c39' };
    if (code === 3) return { background: '#e7f0ff', color: '#1d4ed8' };
    return { background: '#fff7e6', color: '#b45309' }; // Draft
  }

  // Modal
  openLinesModal(row: any) {
    // if lines not attached, you can fetch by id:
    // this.api.getCreditNoteById(row.id).subscribe(r => this.modalLines = r.data?.lines ?? []);
    let lines: any[] = [];
    try {
      lines = Array.isArray(row?.lineItems) ? row.lineItems : JSON.parse(row?.lineItems || '[]');
    } catch { lines = []; }
    this.modalLines = (lines || []).map(l => ({
      itemName: l.itemName,
      uom: l.uom,
      deliveredQty: l.deliveredQty,
      returnedQty: l.returnedQty,
      reasonId: l.reasonId,
      restockDispositionId: l.restockDispositionId
    }));
    this.showLinesModal = true;
  }
  closeLinesModal() { this.showLinesModal = false; }

  reasonName(id?: number | null) {
    debugger
    if (!id) return null;
    return this.reasonList.data.find(x => x.id == id).stockIssuesNames;
  }
  dispositionName(id?: number | null) {
    const key = id != null ? +id : 0;
    return this.dispositionMap.get(key) ?? '-';
    // 1=RESTOCK, 2=SCRAP (matches your create UI)
  }

  // Actions
  openCreate() {
      if (this.isPeriodLocked) {
      this.showPeriodLockedSwal('create Purchase Requests');
      return;
    }
    this.router.navigate(['/Sales/Return-credit-create']); }
  edit(row: any) { 
      if (this.isPeriodLocked) {
      this.showPeriodLockedSwal('edit Purchase Requests');
      return;
    }
    this.router.navigate(['/Sales/Return-credit-edit', row.id]); }

  delete(id: number) {
      if (this.isPeriodLocked) {
      this.showPeriodLockedSwal('delete Purchase Requests');
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
        next: _ => { this.loadList(); Swal.fire('Deleted!', 'Credit Note has been deleted.', 'success'); },
        error: _ => Swal.fire({ icon: 'error', title: 'Delete failed' })
      });
    });
  }

  // refresh feather icons
  ngAfterViewInit(): void { feather.replace(); }
  ngAfterViewChecked(): void { feather.replace(); }

}




