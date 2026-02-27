// app/main/sales/sales-order/list/sales-order-list.component.ts
import {
  Component,
  OnInit,
  ViewChild,
  ViewEncapsulation,
  AfterViewInit,
  AfterViewChecked
} from '@angular/core';
import { Router } from '@angular/router';
import Swal from 'sweetalert2';
import { ColumnMode, DatatableComponent } from '@swimlane/ngx-datatable';
import { DatePipe } from '@angular/common';
import * as feather from 'feather-icons';

import { SalesOrderService } from '../sales-order.service';
import { PeriodCloseService } from 'app/main/financial/period-close-fx/period-close-fx.service';

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

  // procurement status fields (some APIs use different casing)
  procurementStatus?: number;
  ProcurementStatus?: number;
  status?: number;
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
    lockedQty: true,
    ProcurementStatus: 0
  };

  // period lock
  isPeriodLocked = false;
  currentPeriodName = '';

  constructor(
    private salesOrderService: SalesOrderService,
    private router: Router,
    private datePipe: DatePipe,
    private periodService: PeriodCloseService
  ) {}

  ngOnInit(): void {
    const today = new Date().toISOString().substring(0, 10);
    this.checkPeriodLockForDate(today);

    this.loadRequests();
    this.prefetchDraftsCount();
  }

  ngAfterViewInit(): void { feather.replace(); }
  ngAfterViewChecked(): void { feather.replace(); }

  getLinesColsCount(): number {
    const dynamicCols = Object.values(this.lineCols).filter(Boolean).length;
    const fixedCols = 2;
    return 1 + dynamicCols + fixedCols;
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
      Swal.fire(
        'Cannot Approve',
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
      error: (err) => {
        this.draftLoading = false;
        console.error(err);
      }
    });
  }

  closeDrafts(): void { this.showDraftsModal = false; }

  // =========================
  // ✅ PRINT (HTML like Quotation)
  // =========================
  openPrint(row: SoHeader): void {
    const lines = this.extractLinesFromRow(row);
    const html = this.buildSoPrintHtml(row, lines);

    const w = window.open('', 'SO_PRINT_' + Date.now(), 'width=1200,height=780');
    if (!w) return;

    w.document.open();
    w.document.write(html);
    w.document.close();
  }

  private extractLinesFromRow(row: SoHeader): SoLine[] {
    let lines: SoLine[] = [];

    try {
      if (Array.isArray(row?.lineItems)) {
        lines = row.lineItems as SoLine[];
      } else if (row?.lineItems) {
        lines = JSON.parse(row.lineItems as any);
      } else if ((row as any)?.poLines) {
        const poLines = (row as any).poLines;
        lines = Array.isArray(poLines) ? poLines : JSON.parse(poLines);
      }
    } catch {
      lines = [];
    }

    return lines ?? [];
  }

  // ---------- Procurement status (modal badges) ----------
  getProcStatusText(l: any): string {
    const s = +(l.procurementStatus ?? l.ProcurementStatus ?? l.status ?? 0);

    return s === 1 ? 'Pending'
      : s === 2 ? 'PO Created'
      : s === 3 ? 'Partially Received'
      : s === 4 ? 'Fully Received'
      : s === 5 ? 'Shortage Identified'
      : 'Unknown';
  }

  getProcStatusBadgeClass(l: any): any {
    const s = +(l.procurementStatus ?? l.ProcurementStatus ?? l.status ?? 0);

    return {
      'badge-secondary': s === 1,
      'badge-info':      s === 2,
      'badge-warning':   s === 3,
      'badge-success':   s === 4,
      'badge-danger':    s === 5
    };
  }



private getSoPrintStatus(h: any, lines: any[]): string {
  // 1) ✅ If header has ProcurementStatus use it first
  const headerPs =
    +(h?.procurementStatus ?? h?.ProcurementStatus ?? 0);

  if (headerPs > 0) {
    return this.mapProcToText(headerPs);
  }

  // 2) ✅ Else compute from lines
  const statuses = (lines || [])
    .map(l => +(l?.procurementStatus ?? l?.ProcurementStatus ?? 0))
    .filter(x => x > 0);

  if (!statuses.length) return this.statusToText(h?.status ?? 1); // fallback to existing status

  if (statuses.every(s => s === 4)) return 'Completed';
  if (statuses.some(s => s === 5)) return 'Shortage';
  if (statuses.some(s => s === 3)) return 'Partially Received';
  if (statuses.some(s => s === 2)) return 'PO Created';

  return 'Pending';
}

private mapProcToText(s: number): string {
  return s === 1 ? 'Pending'
    : s === 2 ? 'PO Created'
    : s === 3 ? 'Partially Received'
    : s === 4 ? 'Completed'
    : s === 5 ? 'Shortage'
    : 'Pending';
}

  // =========================
  // ✅ PRINT HTML BUILD HELPERS
  // =========================
  private escapeHtml(s: any): string {
    const str = String(s ?? '');
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  private fmtDate(d: any): string {
    if (!d) return '-';
    const dt = new Date(d);
    if (isNaN(dt.getTime())) return '-';
    const dd = String(dt.getDate()).padStart(2, '0');
    const mm = String(dt.getMonth() + 1).padStart(2, '0');
    const yy = dt.getFullYear();
    return `${dd}-${mm}-${yy}`;
  }

  private fmtNum(v: any, dec: number): string {
    const x = Number(v ?? 0);
    return (isNaN(x) ? 0 : x).toFixed(dec);
  }

  private fmtQty(n: any): string {
    const x = +n || 0;
    return x.toFixed(3).replace(/\.?0+$/, '');
  }

  private buildSoPrintHtml(h: SoHeader, lines: SoLine[]): string {
    // ✅ White theme + dark title
    const brand = '#2E5F73';
    const dark = '#0f172a';
    const text = '#111827';
    const muted = '#6b7280';
    const line = '#d1d5db';

    // ✅ Company
    const companyName = 'Continental Catering Solutions Pvt Ltd';
    const companyAddr1 = 'No: 3/8, Church Street';
    const companyAddr2 = 'Nungambakkam, Chennai - 600034';
    const companyPhone = '+91 98765 43210';
    const companyEmail = 'info@unityworks.com';

    const soNo = this.escapeHtml(h?.salesOrderNo || '-');
    const customer = this.escapeHtml(h?.customerName || '-');
    const reqDate = this.escapeHtml(this.datePipe.transform(h?.requestedDate as any, 'dd-MM-yyyy') || this.fmtDate(h?.requestedDate));
    const delDate = this.escapeHtml(this.datePipe.transform(h?.deliveryDate as any, 'dd-MM-yyyy') || this.fmtDate(h?.deliveryDate));
    const deliveryTo = this.escapeHtml(
  (h as any)?.deliveryTo ?? (h as any)?.DeliveryTo ?? '-'
);
    const status = this.escapeHtml(
  this.getSoPrintStatus(h, lines)
  
);

    const rowsHtml = (lines || []).map((l: any, i: number) => {
      const qty = Number(l?.quantity ?? l?.qty ?? 0);
      const up = Number(l?.unitPrice ?? l?.price ?? 0);
      const locked = Number(l?.lockedQty ?? 0);
      const shortage = Math.max(qty - locked, 0);
      const total = Number(l?.total ?? (qty * up));

      return `
        <tr>
          <td class="c">${i + 1}</td>
          <td class="wrap">${this.escapeHtml(l?.itemName || l?.item || '-')}</td>
          <td class="c">${this.escapeHtml(l?.uom || '-')}</td>
          <td class="r">${this.fmtQty(qty)}</td>
          <td class="r">${this.fmtNum(up, 2)}</td>
          <td class="r">${this.fmtQty(locked)}</td>
          <td class="r">${this.fmtQty(shortage)}</td>
          <td class="r b">${this.fmtNum(isNaN(total) ? 0 : total, 2)}</td>
          <td class="c">${this.escapeHtml(this.getProcStatusText(l))}</td>
        </tr>
      `;
    }).join('');

    const subTotal = (lines || []).reduce((s, l: any) => {
      const qty = Number(l?.quantity ?? l?.qty ?? 0);
      const up  = Number(l?.unitPrice ?? l?.price ?? 0);
      const t = Number(l?.total ?? (qty * up));
      return s + (isNaN(t) ? 0 : t);
    }, 0);

    const grandTotal = Number(h?.grandTotal ?? subTotal) || subTotal;

    const tableHtml = (lines && lines.length)
      ? `
        <table class="tbl">
          <thead>
            <tr>
              <th style="width:55px;">S.NO</th>
              <th>ITEM</th>
              <th style="width:80px;" class="c">UOM</th>
              <th style="width:85px;" class="r">QTY</th>
              <th style="width:95px;" class="r">UNIT PRICE</th>
              <th style="width:95px;" class="r">ALLOCATED</th>
              <th style="width:90px;" class="r">SHORTAGE</th>
              <th style="width:110px;" class="r">TOTAL</th>
              <th style="width:150px;" class="c">PROC. STATUS</th>
            </tr>
          </thead>
          <tbody>${rowsHtml}</tbody>
        </table>
      `
      : `<div class="empty">No lines</div>`;

    return `
    <html>
    <head>
      <title>Sales Order - ${soNo}</title>
      <style>
        @page { margin: 8mm 10mm 14mm 10mm; }
        * { box-sizing:border-box; -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
        body { font-family: Arial, Helvetica, sans-serif; margin:0; background:#fff; color:${text}; }

        .hdr{
          display:flex; gap:16px;
          padding-bottom:14px; margin-bottom:14px;
          border-bottom:2px solid ${brand};
        }
        .logo{
          width:48px; height:48px; border-radius:14px;
          background:${brand}; color:#fff;
          display:flex; align-items:center; justify-content:center;
          font-weight:900;
        }
        .cname{ font-size:20px; font-weight:900; }
        .doc{ font-size:14px; font-weight:900; color:${dark}; letter-spacing:1px; margin-top:2px; }
        .cmeta{ font-size:12px; color:${muted}; margin-top:4px; }

        .meta{
          display:grid; grid-template-columns: 1fr 1fr;
          gap:10px 24px;
          padding:14px;
          border:1px solid ${line};
          border-radius:12px;
          margin-bottom:12px;
        }
        .row{ display:grid; grid-template-columns: 150px 1fr; gap:10px; }
        .k{ color:${muted}; font-weight:700; }
        .v{ font-weight:800; word-break:break-word; }

        .tbl{ width:100%; border-collapse:collapse; font-size:13px; }
        .tbl th, .tbl td{ border:1px solid ${line}; padding:10px; vertical-align:top; }
        .tbl thead th{ background:${brand}; color:#fff; font-weight:900; text-transform:uppercase; }
        .wrap{ white-space:normal; word-break:break-word; }
        .c{ text-align:center; }
        .r{ text-align:right; }
        .b{ font-weight:900; }

        .totals{ margin-top:12px; display:flex; justify-content:flex-end; }
        .totTbl{ width:300px; border-collapse:collapse; }
        .totTbl td{ border:1px solid ${line}; padding:10px 12px; }

        .footer{
          position: fixed; left:10mm; right:10mm; bottom:6mm;
          font-size:11px; color:${muted};
          display:flex; justify-content:space-between;
        }
        .empty{
          border:1px dashed ${muted}; color:${muted};
          padding:18px; text-align:center; border-radius:12px; font-size:14px; margin-top:10px;
        }
      </style>
    </head>

    <body>
      <div class="hdr">
        <div class="logo">CC</div>
        <div>
          <div class="cname">${this.escapeHtml(companyName)}</div>
          <div class="doc">SALES ORDER</div>
          <div class="cmeta">
            ${this.escapeHtml(companyAddr1)}<br/>
            ${this.escapeHtml(companyAddr2)}<br/>
            ${this.escapeHtml(companyPhone)} · ${this.escapeHtml(companyEmail)}
          </div>
        </div>
      </div>

      <div class="meta">
        <div class="row"><div class="k">SO No</div><div class="v">${soNo}</div></div>
        <div class="row"><div class="k">Status</div><div class="v">${status}</div></div>

        <div class="row"><div class="k">Customer</div><div class="v">${customer}</div></div>
        <div class="row"><div class="k">Order Date</div><div class="v">${reqDate}</div></div>
         <div class="row"><div class="k">Delivery Date</div><div class="v">${delDate}</div></div>

       <div class="row"><div class="k">Delivery To</div><div class="v">${deliveryTo}</div></div>
        <div class="row"><div class="k"></div><div class="v"></div></div>
      </div>

      ${tableHtml}

      <div class="totals">
        <table class="totTbl">
          <tr><td>Sub Total</td><td class="r b">${this.fmtNum(subTotal, 2)}</td></tr>
          <tr><td>Grand Total</td><td class="r b">${this.fmtNum(grandTotal, 2)}</td></tr>
        </table>
      </div>

      <div class="footer">
        <div>Generated by ERP · ${this.escapeHtml(this.fmtDate(new Date()))}</div>
        <div>Page 1</div>
      </div>

      <script>window.onload = () => window.print();</script>
    </body>
    </html>`;
  }
}