import { Component, OnInit } from '@angular/core';
import {
  ArInvoiceListItem,
  ArInvoiceService,
  ArCustomerGroup
} from '../invoice-service';
import { Router } from '@angular/router';
import feather from 'feather-icons';
import Swal from 'sweetalert2';
import {
  ApiResponse,
  SalesInvoiceService
} from 'app/main/sales/sales-invoicecreate/sales-invoice.service';

@Component({
  selector: 'app-invoice-create',
  templateUrl: './invoice-create.component.html',
  styleUrls: ['./invoice-create.component.scss']
})
export class InvoiceCreateComponent implements OnInit {
  // groups by customer
  groups: ArCustomerGroup[] = [];
  filteredGroups: ArCustomerGroup[] = [];

  searchTerm = '';
  loading = false;

  // header totals
  totalInvoiceAmount = 0;
  totalPaid = 0;
  totalCreditNote = 0;
  netOutstanding = 0;

  constructor(
    private arService: ArInvoiceService,
    private router: Router,
    private salesInvoiceService: SalesInvoiceService
  ) { }

  ngOnInit(): void {
    this.loadInvoices();
  }
  ngAfterViewInit() {
    feather.replace();
}


  loadInvoices(): void {
    this.loading = true;
    this.arService.getInvoices().subscribe({
      next: data => {
        this.buildGroups(data);
        this.computeHeaderTotals();
        this.filteredGroups = [...this.groups];
        this.loading = false;
      },
      error: _ => {
        this.loading = false;
      }
    });
  }
private buildGroups(rows: ArInvoiceListItem[]): void {
  const map = new Map<number, ArCustomerGroup>();

  for (const r of rows) {
    if (!map.has(r.customerId)) {
      map.set(r.customerId, {
        customerId:       r.customerId,
        customerName:     r.customerName,
        invoiceCount:     0,
        totalAmount:      0,
        totalPaid:        0,
        totalCreditNote:  0,
        totalAdvance:     0,
        totalOutstanding: 0,
        netOutstanding:   0,
        invoices:         [],
        creditNotes:      [],
        expanded:         false,
        creditNoteNo:     undefined,
        creditNoteDate:   undefined,
        creditNoteStatus: undefined
      });
    }

    const g = map.get(r.customerId)!;

    if (r.rowType === 'CN') {
      g.creditNotes.push(r);
      g.totalCreditNote += Math.abs(r.customerCreditNoteAmount || r.amount || 0);
   } else {
  r.fxRate              = Number(r.fxRate              ?? 1);
  r.currencyId          = Number(r.currencyId          ?? 0);
  r.currencyName        = r.currencyName               ?? 'SGD';
  r.advanceAmount       = Number(r.advanceAmount       ?? 0);
  // ✅ Receipt fields
  r.paidAmountFC        = Number(r.paidAmountFC        ?? r.paid ?? 0);
  r.receiptCurrencyName = r.receiptCurrencyName        ?? 'SGD';

  g.invoices.push(r);
  g.totalAmount      += r.amount       || 0;
  g.totalPaid        += r.paid         || 0;
  g.totalAdvance     += r.advanceAmount || 0;
  g.totalOutstanding += r.outstanding  || 0;
}
  }

  this.groups = Array.from(map.values()).map(g => {
    g.invoiceCount = g.invoices.length;

    const unappliedCn = g.creditNotes
      .filter(cn => !cn.invoiceId || cn.invoiceId <= 0)
      .reduce((sum, cn) =>
        sum + Math.abs(cn.customerCreditNoteAmount || cn.amount || 0), 0);

    g.netOutstanding = g.totalOutstanding - unappliedCn;
    return g;
  });
}



 private computeHeaderTotals(): void {
  this.totalInvoiceAmount = 0;
  this.totalPaid = 0;
  this.totalCreditNote = 0;
  this.netOutstanding = 0;

  for (const g of this.groups) {
    this.totalInvoiceAmount += g.totalAmount;
    this.totalPaid          += g.totalPaid;
    this.totalCreditNote    += g.totalCreditNote;
    this.netOutstanding     += g.netOutstanding;   // << use net, not totalOutstanding
  }
}


  onSearchChange(term: string): void {
    this.searchTerm = term || '';
    const t = this.searchTerm.toLowerCase();

    if (!t) {
      this.filteredGroups = [...this.groups];
      return;
    }

    this.filteredGroups = this.groups.filter(g =>
      (g.customerName || '').toLowerCase().includes(t)
    );
  }

  toggleExpand(group: ArCustomerGroup): void {
    group.expanded = !group.expanded;
  }

  getInvoiceStatus(row: ArInvoiceListItem): string {
    if ((row.outstanding || 0) === 0) {
      return 'Paid';
    }
    if ((row.paid || 0) > 0 || (row.creditNote || 0) > 0) {
      return 'Partial';
    }
    return 'Unpaid';
  }

  getStatusClassFromString(status: string): string {
    const s = (status || '').toLowerCase();
    if (s === 'paid') return 'status-pill status-paid';
    if (s === 'partial') return 'status-pill status-partial';
    if (s === 'unpaid') return 'status-pill status-unpaid';
    return 'status-pill';
  }

  printInvoice(row: ArInvoiceListItem): void {
    const invoiceId = Number(row.invoiceId || 0);
    if (!invoiceId) {
      Swal.fire('Print failed', 'Sales Invoice id missing.', 'warning');
      return;
    }

    this.salesInvoiceService.get(invoiceId).subscribe({
      next: (res: ApiResponse) => {
        const header = res?.data?.header || row;
        const lines = res?.data?.lines || [];
        const html = this.buildSiPrintHtml(header, lines);

        this.salesInvoiceService.markPrinted(invoiceId).subscribe({
          next: () => this.openPrintWindow(html),
          error: () => {
            this.openPrintWindow(html);
            Swal.fire('Print count update failed', 'Invoice opened, but print count was not updated.', 'warning');
          }
        });
      },
      error: () => {
        Swal.fire('Print failed', 'Unable to load Sales Invoice details.', 'error');
      }
    });
  }

  private openPrintWindow(html: string): void {
    const w = window.open('', 'SI_PRINT_' + Date.now(), 'width=980,height=720');
    if (!w) {
      Swal.fire('Popup blocked', 'Allow popups to print Sales Invoice.', 'warning');
      return;
    }

    w.document.open();
    w.document.write(html);
    w.document.close();
    w.focus();
    setTimeout(() => {
      w.print();
      setTimeout(() => w.close(), 300);
    }, 300);
  }

  private buildSiPrintHtml(hdr: any, lines: any[]): string {
    const brand = '#2E5F73';
    const invNo = this.escapeHtml(hdr?.invoiceNo || '-');
    const invDate = hdr?.invoiceDate ? this.fmtDate(hdr.invoiceDate) : '-';
    const customerName = this.escapeHtml(hdr?.customerName || '-');
    const currencyName = this.escapeHtml(hdr?.currencyName || 'SGD');
    const paymentTermName = this.escapeHtml(hdr?.paymentTermsName || '-');
    const sourceRef = this.escapeHtml(hdr?.sourceRef || '-');
    const sourceType = Number(hdr?.sourceType || 1) === 1 ? 'SO' : 'DO';
    const remarks = this.escapeHtml(hdr?.remarks || '-');

    const rowsHtml = (lines || []).map((l: any, i: number) => `
      <tr>
        <td class="c">${i + 1}</td>
        <td>${this.escapeHtml(l.itemName || ('#' + (l.itemId || '')))}</td>
        <td>${this.escapeHtml(l.description || '-')}</td>
        <td class="c">${this.escapeHtml(l.uom || '-')}</td>
        <td class="r">${this.n(l.qty, 3).replace(/\.?0+$/, '')}</td>
        <td class="r">${this.n(l.unitPrice, 2)}</td>
        <td class="r">${this.n(l.discountPct || 0, 2)}</td>
        <td class="r">${this.n(this.calcLineTotal(l), 2)}</td>
      </tr>
    `).join('');

    const subtotal = (lines || []).reduce((s: number, l: any) => s + this.calcLineTotal(l), 0);
    const tax = +(hdr?.taxAmount ?? hdr?.tax ?? hdr?.gstAmount ?? 0);
    const grand = subtotal + tax;

    return `
<html>
<head>
  <title>Sales Invoice - ${invNo}</title>
  <style>
    @page { margin: 12mm; }
    * { box-sizing:border-box; -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
    body { font-family: Arial, Helvetica, sans-serif; margin:0; color:#111827; }
    .wrap { padding-top: 10mm; }
    .hdr { display:flex; justify-content:space-between; gap:14px; padding-bottom:10px; margin-bottom:12px; border-bottom:2px solid ${brand}; }
    .companyWrap { display:flex; gap:10px; align-items:flex-start; }
    .logo { width:46px; height:46px; border-radius:50%; background:${brand}; color:#fff; display:flex; align-items:center; justify-content:center; font-weight:900; }
    .company .name { font-size:18px; font-weight:900; color:${brand}; line-height:1.1; }
    .company .addr,.company .ph { margin-top:3px; font-size:12px; color:#374151; font-weight:700; }
    .doc { text-align:right; }
    .doc .docname { font-size:18px; font-weight:900; color:${brand}; }
    .doc .docno { margin-top:2px; font-size:12px; color:#374151; font-weight:900; }
    .metaCard { width:100%; margin:10px auto 14px auto; border:1px solid #d1d5db; border-radius:12px; background:#fff; padding:12px 14px; box-shadow:0 2px 10px rgba(0,0,0,.06); }
    .metaTitle { font-size:12px; font-weight:900; color:${brand}; margin-bottom:8px; text-transform:uppercase; letter-spacing:.4px; }
    .metaGrid { display:grid; grid-template-columns:1fr 1fr; gap:8px 18px; font-size:12px; }
    .row { display:flex; gap:10px; }
    .k { width:140px; font-weight:700; color:#6b7280; }
    .v { font-weight:900; color:#111827; }
    .tbl { width:100%; border-collapse:collapse; font-size:12px; }
    .tbl th,.tbl td { border:1px solid #d1d5db; padding:8px; vertical-align:top; }
    .tbl thead th { background:${brand}!important; color:#fff!important; font-weight:900; text-transform:uppercase; border-color:${brand}!important; }
    .c { text-align:center; }
    .r { text-align:right; }
    .b { font-weight:900; }
    .footer { position:fixed; left:0; right:0; bottom:6mm; font-size:10px; color:#6b7280; display:flex; justify-content:space-between; }
  </style>
</head>
<body>
  <div class="wrap">
    <div class="hdr">
      <div class="companyWrap">
        <div class="logo">CC</div>
        <div class="company">
          <div class="name">Continental Catering Solutions Pvt Ltd</div>
          <div class="addr">Chennai, Tamil Nadu</div>
          <div class="ph">+91 XXXXX XXXXX</div>
        </div>
      </div>
      <div class="doc">
        <div class="docname">Sales Invoice</div>
        <div class="docno">${invNo}</div>
      </div>
    </div>

    <div class="metaCard">
      <div class="metaTitle">Invoice Details</div>
      <div class="metaGrid">
        <div class="row"><div class="k">Invoice No</div><div class="v">${invNo}</div></div>
        <div class="row"><div class="k">Invoice Date</div><div class="v">${invDate}</div></div>
        <div class="row"><div class="k">Customer</div><div class="v">${customerName}</div></div>
        <div class="row"><div class="k">Currency</div><div class="v">${currencyName}</div></div>
        <div class="row"><div class="k">Payment Terms</div><div class="v">${paymentTermName}</div></div>
        <div class="row"><div class="k">Source</div><div class="v">${sourceType}</div></div>
        <div class="row"><div class="k">Source Ref</div><div class="v">${sourceRef}</div></div>
        <div class="row"><div class="k">Remarks</div><div class="v">${remarks}</div></div>
      </div>
    </div>

    <table class="tbl">
      <thead>
        <tr>
          <th style="width:45px;">S.No</th><th>Item</th><th>Description</th>
          <th style="width:80px;" class="c">UOM</th><th style="width:90px;" class="r">Qty</th>
          <th style="width:110px;" class="r">Unit Price</th><th style="width:85px;" class="r">Disc %</th>
          <th style="width:120px;" class="r">Line Total</th>
        </tr>
      </thead>
      <tbody>${rowsHtml || `<tr><td colspan="8" class="c">No lines</td></tr>`}</tbody>
      <tfoot>
        <tr><td colspan="7" class="r b">Subtotal</td><td class="r b">${this.n(subtotal, 2)}</td></tr>
        <tr><td colspan="7" class="r b">Tax</td><td class="r b">${this.n(tax, 2)}</td></tr>
        <tr><td colspan="7" class="r b">Grand Total</td><td class="r b">${this.n(grand, 2)}</td></tr>
      </tfoot>
    </table>
  </div>
  <div class="footer"><div>Generated by ERP</div><div>Page 1</div></div>
</body>
</html>`;
  }

  private fmtDate(d: any): string {
    const dt = new Date(d);
    return [
      String(dt.getDate()).padStart(2, '0'),
      String(dt.getMonth() + 1).padStart(2, '0'),
      dt.getFullYear()
    ].join('-');
  }

  private calcLineTotal(l: any): number {
    const qty = +l.qty || 0;
    const unit = +l.unitPrice || 0;
    const disc = (+l.discountPct || 0) / 100;
    return (qty * unit) * (1 - disc);
  }

  private n(v: any, dec: number): string {
    return (+v || 0).toFixed(dec);
  }

  private escapeHtml(v: any): string {
    return String(v ?? '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }
    openCreditNote(cn: ArInvoiceListItem): void {
    const cnNo = cn.customerCreditNoteNo || cn.invoiceNo;
    if (!cnNo) { return; }

    this.router.navigate(
      ['/Sales/Return-credit-list'],
      { queryParams: { cn: cnNo } }   // e.g. ?cn=CN-000002
    );
  }
}
