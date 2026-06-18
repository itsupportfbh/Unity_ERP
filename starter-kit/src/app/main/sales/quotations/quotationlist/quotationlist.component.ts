import {
  Component,
  OnInit,
  OnDestroy,
  ViewEncapsulation,
  AfterViewInit,
  AfterViewChecked
} from '@angular/core';
import { Router } from '@angular/router';
import Swal from 'sweetalert2';
import * as feather from 'feather-icons';
import { of } from 'rxjs';
import { catchError, map } from 'rxjs/operators';

import { QuotationsService } from '../quotations.service';
import { CustomerMasterService } from 'app/main/businessPartners/customer-master/customer-master.service';
import { CurrencyService } from 'app/main/master/currency/currency.service';
import { ItemsService } from 'app/main/master/items/items.service';
import { UomService } from 'app/main/master/uom/uom.service';
import { FunctionPermission, PermissionService } from 'app/shared/permission.service';
import {
  PeriodCloseService,
  PeriodStatusDto
} from 'app/main/financial/period-close-fx/period-close-fx.service';
type QuotationRow = {
  id: number;
  number: string;
  status: number;
  customerId: number;
  customerName?: string;
  isCashSales?: boolean;
  currencyId: number;
  fxRate: number;
  paymentTermsId: number;
  paymentTermsName: string;
  validityDate: string | Date | null;
  deliveryDate?: any;
  subtotal: number;
  taxAmount: number;
  rounding: number;
  grandTotal: number;
  createdDate?: string | Date | null;
  remarks?: string | null;
  deliveryTo?: string | null;
  createdUserName: string;
  modifiedUserName: string;
};

type QuotationLineRow = {
  id: number;
  quotationId: number;
  itemId: number;
  itemCode?: string;
  uomId: number | null;
  qty: number;
  unitPrice: number;
  discountPct: number;
  taxCodeId?: number | null;
  lineNet: number;
  lineTax: number;
  lineTotal: number;
  itemName?: string;
  uomName?: string;
  description?: string;
};

@Component({
  selector: 'app-quotationlist',
  templateUrl: './quotationlist.component.html',
  styleUrls: ['./quotationlist.component.scss'],
  encapsulation: ViewEncapsulation.None
})
export class QuotationlistComponent implements OnInit, OnDestroy, AfterViewInit, AfterViewChecked {
  rows: QuotationRow[] = [];
  allRows: QuotationRow[] = [];
  selectedOption = 10;
  currentPage = 1;
  searchValue = '';

  get totalPages(): number {
    return Math.ceil((this.rows?.length || 0) / this.selectedOption);
  }
  get pageNumbers(): number[] {
    const total = this.totalPages;
    const current = this.currentPage;
    const start = Math.max(1, current - 2);
    const end = Math.min(total, current + 2);
    const pages: number[] = [];
    for (let i = start; i <= end; i++) pages.push(i);
    return pages;
  }
  onPageChange(p: number): void {
    if (p < 1 || p > this.totalPages) return;
    this.currentPage = p;
  }

  customerMap = new Map<number, string>();
  currencyMap = new Map<number, string>();
  uomMap = new Map<number, string>();
  itemNameMap = new Map<number, string>();
  itemCodeMap = new Map<number, string>();

  showLinesModal = false;
  activeQt: QuotationRow | null = null;
  modalLines: QuotationLineRow[] = [];
  modalTotals = { net: 0, tax: 0, total: 0 };

  userId: number = 0;
  functionId = 'qt-list';
  permission: FunctionPermission;
  isPermissionLoaded = false;
  isPageLoading = false;
isPeriodLocked = false;
currentPeriodName = '';
  constructor(
    private router: Router,
    private quotationSvc: QuotationsService,
    private customerSvc: CustomerMasterService,
    private currencySvc: CurrencyService,
    private itemsSvc: ItemsService,
    private uomSvc: UomService,
    private permissionService: PermissionService,
    private periodService: PeriodCloseService
  ) {
    this.userId = Number(localStorage.getItem('id') || 0);
    this.permission = this.permissionService.getEmptyPermission(this.functionId);
  }

  ngOnInit(): void {
    const today = new Date().toISOString().substring(0, 10);
  this.checkPeriodLockForDate(today);
    this.loadPermission();
  }

  ngOnDestroy(): void {}

  ngAfterViewInit(): void {
    feather.replace();
  }

  ngAfterViewChecked(): void {
    feather.replace();
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
          this.loadLookups();
          this.loadQuotations();
        } else {
          this.rows = [];
          this.allRows = [];
        }
      },
      error: (err) => {
        console.error('Permission load error:', err);

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

  private loadLookups(): void {
    this.customerSvc.getAllCustomerMaster().subscribe((res: any) => {
      const arr = res?.data ?? [];
      for (const r of arr) {
        const id = Number(r.id ?? r.Id);
        const name = String(r.customerName ?? r.CustomerName ?? '').trim();
        if (id) this.customerMap.set(id, name);
      }
    });

    this.currencySvc.getAllCurrency().subscribe((res: any) => {
      const arr = res?.data ?? res ?? [];
      for (const r of arr) {
        const id = Number(r.id ?? r.Id);
        const code = String(r.currencyName ?? r.CurrencyName ?? '').trim();
        if (id) this.currencyMap.set(id, code);
      }
    });

    this.itemsSvc.getAllItem().subscribe((res: any) => {
      const arr = res?.data ?? res ?? [];
      for (const r of arr) {
        const id = Number(r.id ?? r.itemId ?? r.ItemId ?? 0);
        const name = String(r.itemName ?? r.name ?? r.ItemName ?? '').trim();
        const code = String(r.sku ?? r.itemCode ?? r.code ?? r.ItemCode ?? '').trim();
        if (id) this.itemNameMap.set(id, name);
        if (id && code) this.itemCodeMap.set(id, code);
      }
    });

    this.uomSvc.getAllUom().subscribe((res: any) => {
      const arr = res?.data ?? res ?? [];
      for (const r of arr) {
        const id = Number(r.id ?? r.Id);
        const name = String(r.name ?? r.Name ?? '').trim();
        if (id) this.uomMap.set(id, name);
      }
    });
  }

  private loadQuotations(): void {
    this.quotationSvc.getAll().subscribe({
      next: (res: any) => {
        const data = res?.data ?? res ?? [];

        this.allRows = (data || []).map((q: any) => ({
          id: Number(q.id ?? q.Id),
          number: String(q.number ?? q.Number ?? ''),
          status: Number(q.status ?? q.Status ?? 0),

          customerId: Number(q.customerId ?? q.CustomerId ?? 0),
          customerName: q.customerName ?? q.CustomerName ?? '',
          isCashSales: q.isCashSales ?? q.IsCashSales ?? false,

          currencyId: Number(q.currencyId ?? q.CurrencyId ?? 0),
          fxRate: Number(q.fxRate ?? q.FxRate ?? 1),

          paymentTermsId: Number(q.paymentTermsId ?? q.PaymentTermsId ?? 0),
          paymentTermsName: String(q.paymentTermsName ?? q.PaymentTermsName ?? ''),

          validityDate: q.validityDate ?? q.ValidityDate ?? null,
          deliveryDate: q.deliveryDate ?? q.DeliveryDate ?? null,

          subtotal: Number(q.subtotal ?? q.Subtotal ?? 0),
          taxAmount: Number(q.taxAmount ?? q.TaxAmount ?? 0),
          rounding: Number(q.rounding ?? q.Rounding ?? 0),
          grandTotal: Number(q.grandTotal ?? q.GrandTotal ?? 0),

          createdDate: q.createdDate ?? q.CreatedDate ?? null,
          remarks: q.remarks ?? q.Remarks ?? null,
          deliveryTo: q.deliveryTo ?? q.DeliveryTo ?? null,
          createdUserName: q.createdUserName ?? q.CreatedUserName ?? '',
          modifiedUserName: q.modifiedUserName ?? q.ModifiedUserName ?? ''
        })) as QuotationRow[];

        this.rows = [...this.allRows];
      },
      error: (err) => {
        console.error('Failed to load quotations', err);
        this.allRows = [];
        this.rows = [];
      }
    });
  }

  statusLabel(v: number): string {
    return v === 0 ? 'Draft'
      : v === 1 ? 'Pending'
      : v === 2 ? 'Completed'
      : v === 3 ? 'Rejected'
      : v === 4 ? 'Posted'
      : 'Unknown';
  }

  statusClass(v: number): any {
    return {
      'badge-secondary': v === 0,
      'badge-warning': v === 1,
      'badge-success': v === 2,
      'badge-danger': v === 3 || v === 4
    };
  }

  getCustomerName(id?: number): string {
    return (id && this.customerMap.get(id)) || '';
  }

  getCurrencyCode(id?: number): string {
    return (id && this.currencyMap.get(id)) || '';
  }

  getItemName(id?: number): string {
    return (id && this.itemNameMap.get(id)) || '';
  }

  getItemCode(id?: number): string {
    return (id && this.itemCodeMap.get(id)) || '';
  }

  getUomName(id?: number | null): string {
    return id != null ? this.uomMap.get(id) || '' : '';
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
    return x.toFixed(dec);
  }

  private fmtQty(n: any): string {
    const x = +n || 0;
    return x.toFixed(3).replace(/\.?0+$/, '');
  }

  private escapeHtml(s: any): string {
    const str = String(s ?? '');
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  onLimitChange(ev: Event): void {
    const val = Number((ev.target as HTMLSelectElement).value);
    this.selectedOption = val || 10;
    this.currentPage = 1;
  }

  filterUpdate(_: any): void {
    this.currentPage = 1;
    const q = (this.searchValue || '').trim().toLowerCase();

    if (!q) {
      this.rows = [...this.allRows];
      return;
    }

    this.rows = this.allRows.filter(r => {
      const num = (r.number || '').toLowerCase();
      const cust = (
        r.isCashSales || r.customerId === 0 || r.customerId == null
          ? 'Cash Sales'
          : this.getCustomerName(r.customerId) || r.customerName || ''
      ).toLowerCase();
      const status = this.statusLabel(r.status).toLowerCase();
      const created = (r.createdUserName || '').toLowerCase();
      const modified = (r.modifiedUserName || '').toLowerCase();

      return (
        num.includes(q) ||
        cust.includes(q) ||
        status.includes(q) ||
        created.includes(q) ||
        modified.includes(q)
      );
    });
  }

  openLinesModal(row: QuotationRow): void {
    this.activeQt = row;
    this.showLinesModal = true;

    this.quotationSvc.getById(row.id).subscribe({
      next: (res: any) => {
        const dto = res?.data ?? res ?? null;
        const apiLines = dto?.lines ?? dto?.Lines ?? [];

        if (dto && this.activeQt) {
          this.activeQt.remarks = dto.remarks ?? dto.Remarks ?? this.activeQt.remarks ?? null;
          this.activeQt.deliveryTo = dto.deliveryTo ?? dto.DeliveryTo ?? this.activeQt.deliveryTo ?? null;
          this.activeQt.validityDate = dto.validityDate ?? dto.ValidityDate ?? this.activeQt.validityDate ?? null;
          this.activeQt.deliveryDate = dto.deliveryDate ?? dto.DeliveryDate ?? this.activeQt.deliveryDate ?? null;
        }

        this.modalLines = (apiLines || []).map((l: any) => {
          const itemId = Number(l.itemId ?? l.ItemId ?? 0);
          const uomId = (l.uomId ?? l.UomId) != null ? Number(l.uomId ?? l.UomId) : null;

          return {
            id: Number(l.id ?? l.Id ?? 0),
            quotationId: Number(l.quotationId ?? l.QuotationId ?? row.id),
            itemId,
            itemCode: String(l.itemCode ?? l.ItemCode ?? this.getItemCode(itemId) ?? ''),
            itemName: String(l.itemName ?? l.ItemName ?? ''),
            uomId,
            uomName: String(l.uomName ?? l.UomName ?? ''),
            qty: Number(l.qty ?? l.Qty ?? 0),
            unitPrice: Number(l.unitPrice ?? l.UnitPrice ?? 0),
            discountPct: Number(l.discountPct ?? l.DiscountPct ?? 0),
            taxCodeId: l.taxCodeId ?? l.TaxCodeId ?? null,
            lineNet: Number(l.lineNet ?? l.LineNet ?? 0),
            lineTax: Number(l.lineTax ?? l.LineTax ?? 0),
            lineTotal: Number(l.lineTotal ?? l.LineTotal ?? 0),
            description: String(l.description ?? l.Description ?? '')
          } as QuotationLineRow;
        });

        let net = 0, tax = 0, total = 0;
        for (const l of this.modalLines) {
          net += +l.lineNet || 0;
          tax += +l.lineTax || 0;
          total += +l.lineTotal || 0;
        }

        this.modalTotals = { net, tax, total };
        setTimeout(() => feather.replace(), 0);
      },
      error: () => {
        this.modalLines = [];
        this.modalTotals = { net: 0, tax: 0, total: 0 };
      }
    });
  }

  closeLinesModal(): void {
    this.showLinesModal = false;
    this.activeQt = null;
    this.modalLines = [];
    this.modalTotals = { net: 0, tax: 0, total: 0 };
  }

  private buildQtPrintHtml(): string {
    const brand = '#2E5F73';
    const dark = '#0f172a';
    const text = '#111827';
    const muted = '#6b7280';
    const line = '#d1d5db';

    const companyName = 'Continental Catering Solutions Pvt Ltd';
    const companyAddr1 = 'No: 3/8, Church Street';
    const companyAddr2 = 'Nungambakkam, Chennai - 600034';
    const companyPhone = '+91 98765 43210';
    const companyEmail = 'info@unityworks.com';

    const qtNo = this.activeQt?.number || '-';
    const status = this.statusLabel(this.activeQt?.status ?? 0);

    const customerName =
      this.activeQt?.isCashSales || this.activeQt?.customerId === 0 || this.activeQt?.customerId == null
        ? 'Cash Sales'
        : (this.getCustomerName(this.activeQt?.customerId) || this.activeQt?.customerName || '-').trim();

    const currency = (this.getCurrencyCode(this.activeQt?.currencyId) || '-').trim();
    const paymentTerms = (this.activeQt?.paymentTermsName || '-')?.trim();

    const validityDate = this.fmtDate(this.activeQt?.validityDate);
    const deliveryDate = this.fmtDate(this.activeQt?.deliveryDate);

    const deliveryTo = this.escapeHtml(this.activeQt?.deliveryTo ?? '-');
    const remarks = this.escapeHtml(this.activeQt?.remarks ?? '-');

    const rowsHtml = (this.modalLines || []).map((l, i) => {
      const itemId = Number(l.itemId ?? 0);

      return `
        <tr>
          <td class="c">${i + 1}</td>
          <td>${this.escapeHtml(l.itemCode ?? this.getItemCode(itemId) ?? '-')}</td>
          <td class="wrap">${this.escapeHtml(l.itemName ?? this.getItemName(itemId) ?? '-')}</td>
          <td class="wrap">${this.escapeHtml(l.description ?? '-')}</td>
          <td class="c">${this.escapeHtml(l.uomName || this.getUomName(l.uomId) || '-')}</td>
          <td class="r">${this.fmtQty(l.qty)}</td>
          <td class="r">${this.fmtNum(l.unitPrice, 2)}</td>
          <td class="r">${this.fmtNum(l.discountPct, 2)}</td>
          <td class="r">${this.fmtNum(l.lineNet, 2)}</td>
          <td class="r">${this.fmtNum(l.lineTax, 2)}</td>
          <td class="r b">${this.fmtNum(l.lineTotal, 2)}</td>
        </tr>
      `;
    }).join('');

    const net = this.modalTotals?.net ?? 0;
    const tax = this.modalTotals?.tax ?? 0;
    const total = this.modalTotals?.total ?? 0;

    return `
    <html>
    <head>
      <title>Quotation - ${qtNo}</title>
      <style>
        @page { margin: 8mm 10mm 14mm 10mm; }
        * { box-sizing: border-box; -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
        body { font-family: Arial, Helvetica, sans-serif; margin: 0; color: ${text}; background: #ffffff; }
        .hdr { display: flex; gap: 16px; padding-bottom: 14px; margin-bottom: 14px; border-bottom: 2px solid ${brand}; }
        .logo { width: 48px; height: 48px; border-radius: 14px; background: ${brand}; color: #fff; display: flex; align-items: center; justify-content: center; font-weight: 900; }
        .cname { font-size: 20px; font-weight: 900; }
        .doc { font-size: 14px; font-weight: 900; color: ${dark}; letter-spacing: 1px; margin-top: 2px; }
        .cmeta { font-size: 12px; color: ${muted}; margin-top: 4px; }
        .meta { display: grid; grid-template-columns: 1fr 1fr; gap: 10px 24px; padding: 14px; border: 1px solid ${line}; border-radius: 12px; margin-bottom: 12px; }
        .row { display: grid; grid-template-columns: 150px 1fr; gap: 10px; }
        .k { color: ${muted}; font-weight: 700; }
        .v { font-weight: 800; }
        .note { border: 1px solid ${line}; border-radius: 12px; padding: 10px 12px; margin-bottom: 14px; }
        .note .t { font-weight: 900; color: ${dark}; margin-bottom: 4px; }
        .tbl { width: 100%; border-collapse: collapse; font-size: 13px; }
        .tbl th, .tbl td { border: 1px solid ${line}; padding: 10px; }
        .tbl thead th { background: ${brand}; color: #fff; font-weight: 900; text-transform: uppercase; }
        .wrap { white-space: normal; word-break: break-word; }
        .c { text-align: center; }
        .r { text-align: right; }
        .b { font-weight: 900; }
        .totals { margin-top: 12px; display: flex; justify-content: flex-end; }
        .totTbl { width: 300px; border-collapse: collapse; }
        .totTbl td { border: 1px solid ${line}; padding: 10px 12px; }
        .footer { position: fixed; left: 10mm; right: 10mm; bottom: 6mm; font-size: 11px; color: ${muted}; display: flex; justify-content: space-between; }
      </style>
    </head>
    <body>
      <div class="hdr">
        <div class="logo">CC</div>
        <div>
          <div class="cname">${companyName}</div>
          <div class="doc">QUOTATION</div>
          <div class="cmeta">${companyAddr1}<br/>${companyAddr2}<br/>${companyPhone} · ${companyEmail}</div>
        </div>
      </div>

      <div class="meta">
        <div class="row"><div class="k">QT No</div><div class="v">${qtNo}</div></div>
        <div class="row"><div class="k">Status</div><div class="v">${status}</div></div>
        <div class="row"><div class="k">Customer</div><div class="v">${customerName}</div></div>
        <div class="row"><div class="k">Currency</div><div class="v">${currency}</div></div>
        <div class="row"><div class="k">Payment Terms</div><div class="v">${paymentTerms}</div></div>
        <div class="row"><div class="k">Validity Date</div><div class="v">${validityDate}</div></div>
        <div class="row"><div class="k">Delivery Date</div><div class="v">${deliveryDate}</div></div>
        <div class="row"><div class="k">Delivery To</div><div class="v">${deliveryTo}</div></div>
      </div>

      <div class="note">
        <div class="t">Remarks</div>
        <div>${remarks}</div>
      </div>

      <table class="tbl">
        <thead>
          <tr>
            <th>S.NO</th><th>ITEM CODE</th><th>ITEM</th><th>DESCRIPTION</th>
            <th>UOM</th><th>QTY</th><th>PRICE</th><th>DISC %</th>
            <th>NET</th><th>TAX</th><th>TOTAL</th>
          </tr>
        </thead>
        <tbody>${rowsHtml}</tbody>
      </table>

      <div class="totals">
        <table class="totTbl">
          <tr><td>Subtotal</td><td class="r b">${this.fmtNum(net, 2)}</td></tr>
          <tr><td>Tax</td><td class="r b">${this.fmtNum(tax, 2)}</td></tr>
          <tr><td>Grand Total</td><td class="r b">${this.fmtNum(total, 2)}</td></tr>
        </table>
      </div>

      <div class="footer">
        <div>Generated by ERP · ${this.fmtDate(new Date())}</div>
        <div>Page 1</div>
      </div>

      <script>window.onload = () => window.print();</script>
    </body>
    </html>`;
  }

  private printQuotationLines(): void {
    const html = this.buildQtPrintHtml();
    const w = window.open('', 'QT_PRINT_' + Date.now(), 'width=1200,height=780');
    if (!w) return;

    w.document.open();
    w.document.write(html);
    w.document.close();
  }

  private loadLinesForPrint(qtId: number) {
    return this.quotationSvc.getById(qtId).pipe(
      map((res: any) => res?.data ?? res),
      map((dto: any) => {
        if (dto && this.activeQt) {
          this.activeQt.remarks = dto.remarks ?? dto.Remarks ?? this.activeQt.remarks ?? null;
          this.activeQt.deliveryTo = dto.deliveryTo ?? dto.DeliveryTo ?? this.activeQt.deliveryTo ?? null;
          this.activeQt.validityDate = dto.validityDate ?? dto.ValidityDate ?? this.activeQt.validityDate ?? null;
          this.activeQt.deliveryDate = dto.deliveryDate ?? dto.DeliveryDate ?? this.activeQt.deliveryDate ?? null;
        }

        const linesRaw = dto?.lines ?? dto?.Lines ?? [];

        return (linesRaw || []).map((l: any) => {
          const itemId = Number(l.itemId ?? l.ItemId ?? 0);
          const uomId = (l.uomId ?? l.UomId) != null ? Number(l.uomId ?? l.UomId) : null;

          return {
            id: Number(l.id ?? l.Id ?? 0),
            quotationId: Number(l.quotationId ?? l.QuotationId ?? qtId),
            itemId,
            itemCode: String(l.itemCode ?? l.ItemCode ?? this.getItemCode(itemId) ?? ''),
            itemName: String(l.itemName ?? l.ItemName ?? ''),
            uomId,
            uomName: String(l.uomName ?? l.UomName ?? ''),
            qty: Number(l.qty ?? l.Qty ?? 0),
            unitPrice: Number(l.unitPrice ?? l.UnitPrice ?? 0),
            discountPct: Number(l.discountPct ?? l.DiscountPct ?? 0),
            taxCodeId: l.taxCodeId ?? l.TaxCodeId ?? null,
            lineNet: Number(l.lineNet ?? l.LineNet ?? 0),
            lineTax: Number(l.lineTax ?? l.LineTax ?? 0),
            lineTotal: Number(l.lineTotal ?? l.LineTotal ?? 0),
            description: String(l.description ?? l.Description ?? '')
          } as QuotationLineRow;
        });
      }),
      catchError(() => of([]))
    );
  }

  printFromRow(row: QuotationRow): void {
    if (this.activeQt?.id === row.id && this.modalLines?.length) {
      this.printQuotationLines();
      return;
    }

    this.activeQt = row;

    this.loadLinesForPrint(row.id).subscribe({
      next: (lines: QuotationLineRow[]) => {
        this.modalLines = lines || [];

        let net = 0, tax = 0, total = 0;
        for (const l of this.modalLines) {
          net += +l.lineNet || 0;
          tax += +l.lineTax || 0;
          total += +l.lineTotal || 0;
        }

        this.modalTotals = { net, tax, total };
        this.printQuotationLines();
      },
      error: () => {
        Swal.fire({
          icon: 'error',
          title: 'Print failed',
          text: 'Unable to load quotation lines.'
        });
      }
    });
  }

goToCreate(): void {
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
    this.showPeriodLockedSwal('create Quotation');
    return;
  }

  this.router.navigate(['/Sales/Quotation-create']);
}

  editQuotation(id: number): void {
    if (!this.canEdit()) {
      Swal.fire({
        icon: 'warning',
        title: 'Access Denied',
        text: 'You do not have edit permission.',
        confirmButtonColor: '#0e3a4c'
      });
      return;
    }
  if (this.isPeriodLocked) {
    this.showPeriodLockedSwal('edit Quotation');
    return;
  }
    this.router.navigate([`/Sales/Edit-quotation/${id}`]);
  }

  deleteQuotation(id: number): void {
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
  this.showPeriodLockedSwal('delete Quotation');
  return;
}
    Swal.fire({
      icon: 'warning',
      title: 'Delete quotation?',
      text: 'This action cannot be undone.',
      showCancelButton: true,
      confirmButtonColor: '#d33',
      cancelButtonColor: '#9ca3af',
      confirmButtonText: 'Delete'
    }).then(result => {
      if (!result.isConfirmed) return;

      this.quotationSvc.delete(id).subscribe({
        next: () => {
          this.allRows = this.allRows.filter(r => r.id !== id);
          this.filterUpdate(null);
          Swal.fire('Deleted!', 'Quotation has been deleted.', 'success');
        },
        error: () => Swal.fire({ icon: 'error', title: 'Failed to delete' })
      });
    });
  }
}
