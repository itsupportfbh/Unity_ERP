// app/main/sales/sales-order/list/sales-order-list.component.ts
import { Component, OnInit, ViewChild, ViewEncapsulation, AfterViewInit, AfterViewChecked } from '@angular/core';
import { Router } from '@angular/router';
import Swal from 'sweetalert2';
import { ColumnMode, DatatableComponent } from '@swimlane/ngx-datatable';
import { DatePipe } from '@angular/common';
import * as feather from 'feather-icons';
import { SalesOrderService } from '../sales-order.service';
import { PeriodCloseService } from 'app/main/financial/period-close-fx/period-close-fx.service';

import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';

// pdfmake
// pdfmake
import * as pdfMake from 'pdfmake/build/pdfmake';
import * as pdfFonts from 'pdfmake/build/vfs_fonts';

// ✅ SAFE: supports BOTH export shapes
const vfs =
  (pdfFonts as any)?.pdfMake?.vfs ||   // common
  (pdfFonts as any)?.vfs;              // some builds

if (vfs) {
  (pdfMake as any).vfs = vfs;
} else {
  console.warn('pdfMake vfs not found. Check vfs_fonts import shape:', pdfFonts);
}


type SoLine = {
  id?: number;
  salesOrderId?: number;
  itemId?: number;
  itemName?: string;
  item?: string;
  uom?: string;
  quantity?: number;
  qty?: number;
  unitPrice?: number;
  price?: number;
  discount?: number;
  tax?: string | number;
  total?: number;
  warehouseId?: number | null;
  binId?: number | null;
  supplierId?: number | null;
  lockedQty?: number | null;
};

type SoHeader = {
  id: number;
  salesOrderNo: string;
  customerName: string;
  requestedDate: string | Date;
  deliveryDate: string | Date;
  status: number | string;
  approvalStatus?: number | string;
  isActive?: boolean | number;
  lineItems?: SoLine[] | string;
  approvedBy?: number | null;
  subtotal?: number;
  grandTotal?: number;
};

export interface PeriodStatusDto {
  isLocked: boolean;
  periodName?: string;
  periodCode?: string;
  startDate?: string;
  endDate?: string;
}

@Component({
  selector: 'app-sales-order-list',
  templateUrl: './sales-order-list.component.html',
  styleUrls: ['./sales-order-list.component.scss'],
  encapsulation: ViewEncapsulation.None,
  providers: [DatePipe]
})
export class SalesOrderListComponent implements OnInit, AfterViewInit, AfterViewChecked {
  @ViewChild(DatatableComponent) table!: DatatableComponent;

  // list data
  rows: SoHeader[] = [];
  tempData: SoHeader[] = [];
  searchValue = '';
  ColumnMode = ColumnMode;
  selectedOption = 10;

  // drafts modal
  showDraftsModal = false;
  draftRows: any[] = [];
  draftLoading = false;
  get draftCount(): number { return this.draftRows?.length || 0; }

  // SO ids which have shortage / drafts -> approve disabled
  private blockedSoIds = new Set<number>();

  // SO Lines modal (dynamic columns)
  showLinesModal = false;
  modalLines: SoLine[] = [];
  modalTotal = 0;
  lineCols = {
    uom: true,
    qty: true,
    unitPrice: true,
    discount: false,
    tax: false,
    total: true,
    lockedQty: true
  };

  // period lock
  isPeriodLocked = false;
  currentPeriodName = '';

  // ✅ PDF modal (toolbar preview)
  showPdfModal = false;
  pdfUrl: SafeResourceUrl | null = null;
  private pdfBlobUrl: string | null = null;
  private lastPdfBlob: Blob | null = null;
  pdfSoNo = '';
  private pdfDocDef: any = null;

  getLinesColsCount(): number {
    return 1 + Object.values(this.lineCols).filter(Boolean).length;
  }

  constructor(
    private salesOrderService: SalesOrderService,
    private router: Router,
    private datePipe: DatePipe,
    private periodService: PeriodCloseService,
    private sanitizer: DomSanitizer
  ) {}

  ngOnInit(): void {
    const today = new Date().toISOString().substring(0, 10);
    this.checkPeriodLockForDate(today);

    this.loadRequests();
    this.prefetchDraftsCount();
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

  // shortage = ordered - allocated
  getShortageQty(r: any): number {
    const qty = Number(r?.quantity ?? r?.qty ?? 0);
    const locked = Number(r?.lockedQty ?? 0);
    const s = qty - locked;
    return s > 0 ? s : 0;
  }

  private rebuildBlockedSoIds(): void {
    const set = new Set<number>();

    for (const r of (this.draftRows ?? [])) {
      const soId = Number(r?.salesOrderId ?? 0);
      if (!soId) continue;

      const shortage = this.getShortageQty(r);
      const missingAlloc =
        (r?.warehouseId == null || r?.warehouseId === 0) ||
        (r?.supplierId == null || r?.supplierId === 0) ||
        (r?.binId == null || r?.binId === 0);

      if (shortage > 0 || missingAlloc) set.add(soId);
    }

    this.blockedSoIds = set;
  }

  hasInsufficientQty(row: SoHeader): boolean {
    const id = Number(row?.id ?? 0);
    return id > 0 && this.blockedSoIds.has(id);
  }

  // ---------- Data load ----------
  loadRequests(): void {
    this.salesOrderService.getSO().subscribe({
      next: (res: any) => {
        const list: SoHeader[] = (res?.data ?? []).map((r: any) => ({ ...r }));
        this.rows = list;
        this.tempData = list;
        this.filterUpdate({ target: { value: this.searchValue } });
      },
      error: (err) => console.error('Error loading SO list', err)
    });
  }

  // ---------- Search ----------
  filterUpdate(event: any): void {
    const val = (event?.target?.value ?? this.searchValue ?? '').toString().toLowerCase().trim();
    const temp = this.tempData.filter((d: SoHeader) => {
      const soNo = (d.salesOrderNo || '').toString().toLowerCase();
      const cust = (d.customerName || '').toString().toLowerCase();
      const reqDateStr = this.datePipe.transform(d.requestedDate, 'dd-MM-yyyy')?.toLowerCase() || '';
      const delDateStr = this.datePipe.transform(d.deliveryDate, 'dd-MM-yyyy')?.toLowerCase() || '';
      const statusCode = (d.approvalStatus ?? d.status);
      const statusStr = this.statusToText(statusCode).toLowerCase();

      return (
        !val ||
        soNo.includes(val) ||
        cust.includes(val) ||
        reqDateStr.includes(val) ||
        delDateStr.includes(val) ||
        statusStr.includes(val)
      );
    });

    this.rows = temp;
    if (this.table) this.table.offset = 0;
  }

  // ---------- Status helpers ----------
  statusToText(v: any): string {
    const code = Number(v);
    switch (code) {
      case 0: return 'Draft';
      case 1: return 'Pending';
      case 2: return 'Approved';
      case 3: return 'Rejected';
      default: return (v ?? '').toString();
    }
  }

  isRowLocked(row: SoHeader): boolean {
    const v = row?.approvalStatus ?? row?.status;
    if (v == null) return false;
    if (typeof v === 'string') {
      const s = v.trim().toLowerCase();
      return s === 'approved' || s === 'rejected';
    }
    const code = Number(v);
    return [2, 3].includes(code);
  }

  // ---------- Routing / CRUD ----------
  openCreate(): void {
    if (this.isPeriodLocked) {
      this.showPeriodLockedSwal('create Sales Orders');
      return;
    }
    this.router.navigate(['/Sales/Sales-Order-create']);
  }

  editSO(row: SoHeader): void {
    if (this.isPeriodLocked) {
      this.showPeriodLockedSwal('edit Sales Orders');
      return;
    }
    this.router.navigateByUrl(`/Sales/Sales-Order-edit/${row.id}`);
  }

  deleteSO(id: number): void {
    if (this.isPeriodLocked) {
      this.showPeriodLockedSwal('delete Sales Orders');
      return;
    }

    Swal.fire({
      title: 'Are you sure?',
      text: 'This will delete the Sales Order (soft delete).',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#d33',
      cancelButtonColor: '#3085d6',
      confirmButtonText: 'Yes, delete it!'
    }).then(res => {
      if (!res.isConfirmed) return;
      this.salesOrderService.deleteSO(id, 1).subscribe({
        next: () => {
          this.loadRequests();
          this.prefetchDraftsCount();
          Swal.fire('Deleted!', 'Sales Order has been deleted.', 'success');
        },
        error: (err) => { console.error(err); Swal.fire('Error', 'Delete failed.', 'error'); }
      });
    });
  }

  // ---------- Approve / Reject ----------
  onApprove(row: SoHeader): void {
    if (this.hasInsufficientQty(row)) {
      Swal.fire('Cannot Approve',
        'This Sales Order has Insufficient stock / allocation incomplete. Please resolve Draft lines first.',
        'warning'
      );
      return;
    }

    Swal.fire({
      title: 'Approve this Sales Order?',
      text: `SO #${row.salesOrderNo} will be marked as Approved.`,
      icon: 'question',
      showCancelButton: true,
      confirmButtonText: 'Yes, approve',
      confirmButtonColor: '#2E5F73'
    }).then(res => {
      if (!res.isConfirmed) return;
      this.salesOrderService.approveSO(row.id, 1).subscribe({
        next: () => {
          row.status = 2;
          row.approvalStatus = 2;
          row.approvedBy = 1;
          Swal.fire('Approved', 'Sales Order approved successfully.', 'success');
          this.prefetchDraftsCount();
        },
        error: (err) => { console.error(err); Swal.fire('Error', 'Failed to approve Sales Order.', 'error'); }
      });
    });
  }

  onReject(row: SoHeader): void {
    Swal.fire({
      title: 'Reject this Sales Order?',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Yes, reject',
      confirmButtonColor: '#b91c1c'
    }).then(res => {
      if (!res.isConfirmed) return;
      this.salesOrderService.rejectSO(row.id).subscribe({
        next: () => {
          row.status = 3;
          row.approvalStatus = 3;
          row.isActive = false;
          Swal.fire('Rejected', 'Sales Order rejected and lines unlocked.', 'success');
          this.prefetchDraftsCount();
        },
        error: (err) => { console.error(err); Swal.fire('Error', 'Failed to reject Sales Order.', 'error'); }
      });
    });
  }

  // ---------- Lines modal ----------
  openLinesModal(row: SoHeader): void {
    const lines = this.extractLinesFromRow(row);

    const total = (lines || []).reduce((sum, l: any) => {
      const t = Number(l?.total ?? 0);
      return sum + (isNaN(t) ? 0 : t);
    }, 0);

    this.modalLines = lines ?? [];
    this.modalTotal = total;
    this.showLinesModal = true;
  }

  closeLinesModal(): void { this.showLinesModal = false; }

  // ---------- Drafts ----------
  prefetchDraftsCount(): void {
    this.salesOrderService.getDrafts().subscribe({
      next: (res) => {
        this.draftRows = (res?.data ?? []);
        this.rebuildBlockedSoIds();
      },
      error: (err) => console.error('draft count error', err)
    });
  }

  openDrafts(): void {
    this.draftLoading = true;
    this.salesOrderService.getDrafts().subscribe({
      next: (res) => {
        this.draftRows = (res?.data ?? []).map((x: any) => ({
          ...x,
          reason: this.getShortageQty(x) > 0
            ? 'Insufficient stock / allocation incomplete'
            : 'Allocation missing (WH/SUP/BIN)'
        }));

        this.rebuildBlockedSoIds();
        this.draftLoading = false;
        this.showDraftsModal = true;
      },
      error: (err) => { this.draftLoading = false; console.error(err); }
    });
  }

  closeDrafts(): void { this.showDraftsModal = false; }

  // =========================
  // ✅ PRINT / PDF PREVIEW
  // =========================
  openPrint(row: SoHeader): void {
    const lines = this.extractLinesFromRow(row);

    this.pdfSoNo = row?.salesOrderNo || '';
    this.showPdfModal = true;
    this.pdfUrl = null;
    this.lastPdfBlob = null;

    this.pdfDocDef = this.buildSoPdfDoc(row, lines);

    (pdfMake as any).createPdf(this.pdfDocDef).getBlob((blob: Blob) => {
      this.lastPdfBlob = blob;

      if (this.pdfBlobUrl) URL.revokeObjectURL(this.pdfBlobUrl);
      this.pdfBlobUrl = URL.createObjectURL(blob);

      // ✅ Force toolbar like screenshot
      const viewerUrl = this.pdfBlobUrl + '#toolbar=1&navpanes=0&scrollbar=1';
      this.pdfUrl = this.sanitizer.bypassSecurityTrustResourceUrl(viewerUrl);
    });
  }

  closePdf(): void {
    this.showPdfModal = false;
    this.pdfUrl = null;
    this.pdfSoNo = '';
    this.pdfDocDef = null;
    this.lastPdfBlob = null;

    if (this.pdfBlobUrl) {
      URL.revokeObjectURL(this.pdfBlobUrl);
      this.pdfBlobUrl = null;
    }
  }

  printPdf(): void {
    // ✅ Best print: open blob in new tab then print (same like your screenshot behavior)
    if (this.lastPdfBlob) {
      const url = URL.createObjectURL(this.lastPdfBlob);
      const w = window.open(url, '_blank');
      if (!w) return;

      const timer = setInterval(() => {
        try {
          if (w.document.readyState === 'complete') {
            clearInterval(timer);
            w.focus();
            w.print();
          }
        } catch {}
      }, 300);

      // cleanup url later
      setTimeout(() => URL.revokeObjectURL(url), 5000);
      return;
    }

    // fallback
    if (this.pdfDocDef) (pdfMake as any).createPdf(this.pdfDocDef).print();
  }

  downloadPdf(): void {
    // ✅ Download from blob (fast)
    if (this.lastPdfBlob) {
      const fileName = (this.pdfSoNo ? this.pdfSoNo : 'SalesOrder') + '.pdf';
      const url = URL.createObjectURL(this.lastPdfBlob);

      const a = document.createElement('a');
      a.href = url;
      a.download = fileName;
      a.click();

      setTimeout(() => URL.revokeObjectURL(url), 800);
      return;
    }

    // fallback
    if (this.pdfDocDef) {
      const fileName = (this.pdfSoNo ? this.pdfSoNo : 'SalesOrder') + '.pdf';
      (pdfMake as any).createPdf(this.pdfDocDef).download(fileName);
    }
  }

  private extractLinesFromRow(row: SoHeader): SoLine[] {
    let lines: SoLine[] = [];
    try {
      if (Array.isArray(row?.lineItems)) lines = row.lineItems as SoLine[];
      else if (row?.lineItems) lines = JSON.parse(row.lineItems as any);
      else if ((row as any)?.poLines) {
        const poLines = (row as any).poLines;
        lines = Array.isArray(poLines) ? poLines : JSON.parse(poLines);
      }
    } catch {
      lines = [];
    }
    return lines ?? [];
  }

  private buildSoPdfDoc(h: SoHeader, lines: SoLine[]): any {
    const req = this.datePipe.transform(h?.requestedDate, 'dd-MM-yyyy') || '-';
    const del = this.datePipe.transform(h?.deliveryDate, 'dd-MM-yyyy') || '-';
    const status = this.statusToText(h?.approvalStatus ?? h?.status);

    // ✅ clean subtotal (no TS 2881 warnings)
    const subTotal = (lines || []).reduce((s, l: any) => {
      const qty = Number(l?.quantity ?? l?.qty ?? 0);
      const up  = Number(l?.unitPrice ?? l?.price ?? 0);
      const total = Number(l?.total ?? (qty * up));
      return s + (isNaN(total) ? 0 : total);
    }, 0);

    const grandTotal = Number(h?.grandTotal ?? subTotal) || subTotal;

    const tableBody: any[] = [
      [
        { text: 'Item', style: 'th' },
        { text: 'UOM', style: 'th' },
        { text: 'Qty', style: 'th', alignment: 'right' },
        { text: 'Unit Price', style: 'th', alignment: 'right' },
        { text: 'Allocated', style: 'th', alignment: 'right' },
        { text: 'Shortage', style: 'th', alignment: 'right' },
        { text: 'Total', style: 'th', alignment: 'right' }
      ]
    ];

    for (const l of (lines || [])) {
      const qty = Number(l?.quantity ?? l?.qty ?? 0);
      const up = Number(l?.unitPrice ?? l?.price ?? 0);
      const locked = Number(l?.lockedQty ?? 0);
      const shortage = Math.max(qty - locked, 0);
      const total = Number(l?.total ?? (qty * up));

      tableBody.push([
        (l?.itemName || l?.item || '-'),
        (l?.uom || '-'),
        { text: qty.toString(), alignment: 'right' },
        { text: up.toFixed(2), alignment: 'right' },
        { text: locked.toString(), alignment: 'right' },
        { text: shortage.toString(), alignment: 'right' },
        { text: (isNaN(total) ? 0 : total).toFixed(2), alignment: 'right' }
      ]);
    }

    return {
      pageSize: 'A4',
      pageMargins: [30, 30, 30, 30],
      content: [
        { text: 'SALES ORDER', style: 'title' },

        {
          columns: [
            [
              { text: `SO No: ${h?.salesOrderNo || '-'}`, style: 'kv' },
              { text: `Customer: ${h?.customerName || '-'}`, style: 'kv' }
            ],
            [
              { text: `Requested Date: ${req}`, style: 'kv' },
              { text: `Delivery Date: ${del}`, style: 'kv' },
              { text: `Status: ${status}`, style: 'kv' }
            ]
          ],
          columnGap: 20,
          margin: [0, 10, 0, 12]
        },

        {
          table: {
            headerRows: 1,
            widths: ['*', 45, 35, 55, 55, 55, 55],
            body: tableBody
          },
          layout: 'lightHorizontalLines'
        },

        {
          columns: [
            { text: '' },
            {
              width: 240,
              table: {
                widths: ['*', 90],
                body: [
                  [{ text: 'Sub Total', bold: true }, { text: subTotal.toFixed(2), alignment: 'right' }],
                  [{ text: 'Grand Total', bold: true }, { text: grandTotal.toFixed(2), alignment: 'right' }]
                ]
              },
              layout: 'lightHorizontalLines',
              margin: [0, 12, 0, 0]
            }
          ]
        }
      ],
      styles: {
        title: { fontSize: 16, bold: true, alignment: 'center' },
        kv: { fontSize: 10, margin: [0, 2, 0, 2] },
        th: { fontSize: 10, bold: true, fillColor: '#f3f4f6' }
      }
    };
  }
}
