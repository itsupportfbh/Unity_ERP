import { Component, OnInit, ViewEncapsulation } from '@angular/core';
import { ApiResponse, SalesInvoiceService } from '../sales-invoice.service';
import { Router } from '@angular/router';
import Swal from 'sweetalert2';
import { PeriodCloseService } from 'app/main/financial/period-close-fx/period-close-fx.service';
type SiListRow = {
  id: number;
  invoiceNo: string;
  invoiceDate: string | Date;
  sourceType: 1 | 2;    // 1=SO, 2=DO
  sourceRef?: string;
  total: number;
  customerName?: string;
  printCount?: number;
};

type SiLine = {
  id: number;
  siId: number;
  sourceType: number;
  sourceLineId?: number | null;
  itemId?: number | null;
  itemName?: string | null;
  uom?: string | null;
  qty: number;
  unitPrice: number;
  discountPct: number;
  taxCodeId?: number | null;
  currencyId?: number | null;
};
export interface PeriodStatusDto {
  isLocked: boolean;
  periodName?: string;
  periodCode?: string;
  startDate?: string;
  endDate?: string;
}
@Component({
  selector: 'app-salesinvoicelist',
  templateUrl: './salesinvoicelist.component.html',
  styleUrls: ['./salesinvoicelist.component.scss'],
  encapsulation:ViewEncapsulation.None
})
export class SalesinvoicelistComponent implements OnInit {
rows: SiListRow[] = [];
  temp: SiListRow[] = [];         // unfiltered copy for ngx-datatable filtering

  // paging / search
  selectedOption = 10;
  searchValue = '';

  // modal
  showLinesModal = false;
  activeSi: SiListRow | null = null;
  modalLines: SiLine[] = [];
  modalGrand = 0;

  loading = false;
isPeriodLocked = false;
  currentPeriodName = '';
  showEmailConfirmModal = false;
  emailConfirmRow: any = null;
  emailSending = false;
  private _pdfMake: any = null;
private _pdfReady = false;
  constructor(
    private si: SalesInvoiceService,
    private router: Router,
     private periodService: PeriodCloseService
  ) {}

  ngOnInit(): void {
       const today = new Date().toISOString().substring(0, 10);
    this.checkPeriodLockForDate(today);
    this.loadList();
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
  /** Calls controller: GET /salesinvoice/List */
  loadList(): void {
    this.loading = true;
    this.si.list().subscribe({
      next: (res: ApiResponse) => {
        this.loading = false;
        const payload = Array.isArray(res?.data?.items) ? res.data.items : res.data;
        const mapped: SiListRow[] = (payload || []).map((x: any) => ({
          id: x.id,
          invoiceNo: x.invoiceNo || '',
          invoiceDate: x.invoiceDate,
          sourceType: (x.sourceType || 1) as 1|2,
          sourceRef: x.sourceRef || '',
          total: Number(x.total || 0),
           customerName: x.customerName || '',
            printCount: Number(x.printCount || 0)
        }));
        this.rows = this.temp = mapped;
      },
      error: _ => { this.loading = false; this.rows = this.temp = []; }
    });
  }

  // ---- Filters / paging (same pattern as your DO list) ----
  filterUpdate(_: Event): void {
    const val = (this.searchValue || '').toLowerCase();
    // filter our data
    const filtered = this.temp.filter(d =>
      (d.invoiceNo || '').toLowerCase().includes(val) ||
      (d.sourceRef || '').toLowerCase().includes(val)
    );
    this.rows = filtered;
  }

  onLimitChange(e: Event): void {
    const t = e.target as HTMLSelectElement;
    this.selectedOption = +t.value;
  }

  // ---- Row actions ----
  goToCreate() { 
     if (this.isPeriodLocked) {
      this.showPeriodLockedSwal('create Purchase Requests');
      return;
    }
    debugger
    this.router.navigate(['/Sales/sales-Invoice-create']); }
  edit(id: number) {
     if (this.isPeriodLocked) {
      this.showPeriodLockedSwal('delete Purchase Requests');
      return;
    }
     this.router.navigate(['/Sales/sales-invoice/edit', id]); }
  print(id: number) { this.router.navigate(['/sales/sales-invoice/print', id]); }
 delete(id: number) {
   if (this.isPeriodLocked) {
      this.showPeriodLockedSwal('delete Purchase Requests');
      return;
    }
  Swal.fire({
    title: 'Delete this invoice?',
    text: 'This action cannot be undone.',
    icon: 'warning',
    showCancelButton: true,
    confirmButtonText: 'Yes, delete',
    cancelButtonText: 'Cancel',
    confirmButtonColor: '#d33',
    cancelButtonColor: '#6b7280',
    reverseButtons: true,
  }).then(result => {
    if (!result.isConfirmed) return;

    // Optional: show a small loading state
    Swal.fire({
      title: 'Deleting…',
      allowOutsideClick: false,
      didOpen: () => Swal.showLoading()
    });

    this.si.delete(id).subscribe({
      next: _ => {
        Swal.fire({
          icon: 'success',
          title: 'Deleted',
          text: 'Invoice has been deleted.'
        });
        this.loadList(); // refresh table
      },
      error: _ => {
        Swal.fire({
          icon: 'error',
          title: 'Delete failed',
          text: 'Something went wrong while deleting the invoice.'
        });
      }
    });
  });
}


  // ---- Modal for lines (uses GET /salesinvoice/{id}) ----
  openLinesModal(row: SiListRow) {
    this.activeSi = row;
    this.showLinesModal = true;
    this.modalLines = [];
    this.modalGrand = 0;

    this.si.get(row.id).subscribe((res: ApiResponse) => {
      const lines = res?.data?.lines || [];
      this.modalLines = lines;
      this.modalGrand = lines.reduce((sum: number, l: SiLine) => sum + this.lineTotal(l), 0);
    });
  }

  closeLinesModal() {
    this.showLinesModal = false;
    this.activeSi = null;
    this.modalLines = [];
    this.modalGrand = 0;
  }

  lineTotal(l: SiLine): number {
    const base = (l.qty || 0) * (l.unitPrice || 0);
    const disc = (l.discountPct || 0) / 100;
    return base * (1 - disc);
  }

  sourceLabel(st: 1|2) { return st === 1 ? 'SO' : 'DO'; }
  printInvoice(row: SiListRow) {
  this.si.get(row.id).subscribe({
    next: (res: ApiResponse) => {
      const lines: any[] = res?.data?.lines || [];
      const header = res?.data?.header || row;

      const html = this.buildSiPrintHtml(header, lines);

      // first update print count in backend
      this.si.markPrinted(row.id).subscribe({
        next: (r: any) => {
          const newCount = Number(r?.data?.printCount || 0);
          row.printCount = newCount;

          const idx = this.temp.findIndex(x => x.id === row.id);
          if (idx !== -1) {
            this.temp[idx].printCount = newCount;
          }

          const idx2 = this.rows.findIndex(x => x.id === row.id);
          if (idx2 !== -1) {
            this.rows[idx2].printCount = newCount;
          }

          const w = window.open('', 'SI_PRINT_' + Date.now(), 'width=980,height=720');
          if (!w) return;

          w.document.open();
          w.document.write(html);
          w.document.close();

          w.focus();
          setTimeout(() => {
            w.print();
            setTimeout(() => w.close(), 300);
          }, 300);
        },
        error: () => {
          Swal.fire({
            icon: 'error',
            title: 'Print count update failed',
            text: 'Invoice opened but print count was not updated.'
          });
        }
      });
    },
    error: () => {
      Swal.fire({ icon: 'error', title: 'Print failed', text: 'Unable to load invoice details.' });
    }
  });
}

private buildSiPrintHtml(hdr: any, lines: any[]): string {
  const brand = '#2E5F73';

  const companyName  = 'Continental Catering Solutions Pvt Ltd';
  const companyAddr  = 'Chennai, Tamil Nadu';
  const companyPhone = '+91 XXXXX XXXXX';

  const invNo      = hdr?.invoiceNo || '-';
  const invDate    = hdr?.invoiceDate ? this.fmtDate(hdr.invoiceDate) : '-';
  const sourceRef  = hdr?.sourceRef || '-';
  const sourceType = this.sourceLabel((hdr?.sourceType || 1) as 1 | 2);

  const customerName    = hdr?.customerName || '-';
  const currencyName    = hdr?.currencyName || '-';
  const paymentTermName = hdr?.paymentTermsName || '-';

  const fmt = (n: any, d = 2) => {
    const x = +n || 0;
    return x.toFixed(d);
  };

  const rowsHtml = (lines || []).map((l: any, i: number) => `
    <tr>
      <td class="c">${i + 1}</td>
      <td>${(l.itemName || ('#' + (l.itemId || '')))}</td>
      <td>${(l.description || '-')}</td>
      <td class="c">${(l.uom || '-')}</td>
      <td class="r">${fmt(l.qty, 3).replace(/\.?0+$/, '')}</td>
      <td class="r">${fmt(l.unitPrice, 2)}</td>
      <td class="r">${fmt(l.discountPct || 0, 2)}</td>
      <td class="r">${fmt(this.calcLineTotal(l), 2)}</td>
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
        *{
          box-sizing:border-box;
          -webkit-print-color-adjust: exact !important;
          print-color-adjust: exact !important;
        }
        body{ font-family: Arial, Helvetica, sans-serif; margin:0; color:#111827; }
        .wrap{ padding-top: 10mm; }

        .hdr{
          display:flex; justify-content:space-between; align-items:flex-start;
          gap:14px; padding-bottom:10px; margin-bottom:12px;
          border-bottom:2px solid ${brand};
        }

        /* ✅ Logo + company */
        .companyWrap{ display:flex; gap:10px; align-items:flex-start; }
        .logo{
          width:46px; height:46px; border-radius:50%;
          background:${brand};
          color:#fff;
          display:flex; align-items:center; justify-content:center;
          font-weight:900; letter-spacing:.5px;
          font-size:16px;
          box-shadow: 0 2px 8px rgba(0,0,0,.12);
          flex:0 0 46px;
        }
        .company .name{ font-size:18px; font-weight:900; color:${brand}; line-height:1.1; }
        .company .addr{ margin-top:3px; font-size:12px; color:#374151; font-weight:700; }
        .company .ph  { margin-top:2px; font-size:12px; color:#374151; font-weight:700; }

        .doc{ text-align:right; }
        .doc .docname{ font-size:18px; font-weight:900; color:${brand}; }
        .doc .docno{ margin-top:2px; font-size:12px; color:#374151; font-weight:900; }

        .metaCard{
          width: 100%;
          margin: 10px auto 14px auto;
          border: 1px solid #d1d5db;
          border-radius: 12px;
          background: #fff;
          padding: 12px 14px;
          box-shadow: 0 2px 10px rgba(0,0,0,.06);
        }
        .metaTitle{
          font-size: 12px;
          font-weight: 900;
          color: ${brand};
          margin-bottom: 8px;
          text-transform: uppercase;
          letter-spacing: .4px;
        }
        .metaGrid{
          display:grid;
          grid-template-columns: 1fr 1fr;
          gap: 8px 18px;
          font-size: 12px;
        }
        .row{ display:flex; gap:10px; }
        .k{ width:140px; font-weight:700; color:#6b7280; }
        .v{ font-weight:900; color:#111827; }

        .tbl{ width:100%; border-collapse:collapse; font-size:12px; }
        .tbl th,.tbl td{ border:1px solid #d1d5db; padding:8px; vertical-align:top; }
        .tbl thead th{
          background:${brand}!important;
          color:#fff!important;
          font-weight:900;
          text-transform:uppercase;
          letter-spacing:.3px;
          border-color:${brand}!important;
        }
        .c{ text-align:center; }
        .r{ text-align:right; }
        .b{ font-weight:900; }

        .footer{
          position: fixed;
          left: 0; right: 0; bottom: 6mm;
          font-size: 10px; color:#6b7280;
          display:flex; justify-content:space-between;
        }
      </style>
    </head>

    <body>
      <div class="wrap">

        <div class="hdr">
          <!-- ✅ LEFT: Logo + company -->
          <div class="companyWrap">
            <div class="logo">CC</div>
            <div class="company">
              <div class="name">${companyName}</div>
              <div class="addr">${companyAddr}</div>
              <div class="ph">${companyPhone}</div>
            </div>
          </div>

          <!-- ✅ RIGHT: document -->
          <div class="doc">
            <div class="docname">Sales Invoice</div>
            <div class="docno">${invNo}</div>
          </div>
        </div>

        <!-- ✅ CENTER CARD -->
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
            <div class="row"><div class="k">Remarks</div><div class="v">${hdr?.remarks || '-'}</div></div>
          </div>
        </div>

        <table class="tbl">
          <thead>
            <tr>
              <th style="width:45px;">S.No</th>
              <th>Item</th>
              <th>Description</th>
              <th style="width:80px;" class="c">UOM</th>
              <th style="width:90px;" class="r">Qty</th>
              <th style="width:110px;" class="r">Unit Price</th>
              <th style="width:85px;" class="r">Disc %</th>
              <th style="width:120px;" class="r">Line Total</th>
            </tr>
          </thead>
          <tbody>
            ${rowsHtml || `<tr><td colspan="8" class="c">No lines</td></tr>`}
          </tbody>
          <tfoot>
            <tr>
              <td colspan="7" class="r b">Grand Total</td>
              <td class="r b">${fmt(grand, 2)}</td>
            </tr>
          </tfoot>
        </table>

      </div>

      <div class="footer">
        <div>Generated by ERP</div>
        <div>Page 1</div>
      </div>
    </body>
  </html>`;
}


openEmailConfirm(row: any) {
  this.emailConfirmRow = row;
  this.showEmailConfirmModal = true;
}

closeEmailConfirmModal(force = false) {
  if (this.emailSending && !force) return;
  this.showEmailConfirmModal = false;
  this.emailConfirmRow = null;
  this.emailSending = false;
}

confirmSendEmail() {
  if (!this.emailConfirmRow) return;

  this.emailSending = true;
  this.sendSiEmail(this.emailConfirmRow);
}
async sendSiEmail(row: any) {
  try {
    const res: ApiResponse = await this.si.get(row.id).toPromise() as ApiResponse;

    const header = res?.data?.header || row;
    const lines = res?.data?.lines || [];

    const html = this.buildSiPrintHtml(header, lines);

    // convert print html to pdf using browser print window is not enough for backend email
    // so we create pdf blob from html using html2pdf or pdfmake approach
    // easiest same as PO => create HTML blob and send PDF through jsPDF/html2canvas or pdfmake
    // below is jsPDF html approach
    const pdfBlob = await this.generateSiPdfBlob(header, lines);

    const fd = new FormData();
    fd.append('pdf', pdfBlob, `${header.invoiceNo || 'SalesInvoice'}.pdf`);

    this.si.emailCustomerSi(row.id, fd).subscribe({
      next: () => {
        Swal.fire('Sent', 'Sales Invoice emailed to customer', 'success');
        this.closeEmailConfirmModal(true);
        this.emailSending = false;
      },
      error: (err) => {
        Swal.fire('Error', err?.error?.message || 'Failed to send email', 'error');
        this.emailSending = false;
      }
    });
  } catch (e) {
    this.emailSending = false;
    Swal.fire('Error', 'Failed to prepare invoice PDF', 'error');
  }
  
}
private async ensurePdfMakeReady(): Promise<any> {
  if (this._pdfReady && this._pdfMake) return this._pdfMake;

  const pdfMakeMod: any = await import('pdfmake/build/pdfmake');
  const pdfFontsMod: any = await import('pdfmake/build/vfs_fonts');

  const pdfMake = pdfMakeMod?.default || pdfMakeMod;

  const vfs =
    pdfFontsMod?.pdfMake?.vfs ||
    pdfFontsMod?.default?.pdfMake?.vfs ||
    pdfFontsMod?.vfs ||
    pdfFontsMod?.default?.vfs ||
    pdfFontsMod?.pdfMake?.vfs;

  if (!vfs) throw new Error('pdfMake vfs not found.');

  pdfMake.vfs = vfs;
  this._pdfMake = pdfMake;
  this._pdfReady = true;
  return pdfMake;
}

private fmtDate(d: any): string {
  if (!d) return '-';
  const dt = new Date(d);
  const dd = String(dt.getDate()).padStart(2, '0');
  const mm = String(dt.getMonth() + 1).padStart(2, '0');
  const yy = dt.getFullYear();
  return `${dd}-${mm}-${yy}`;
}

private calcLineTotal(l: any): number {
  const qty = +l.qty || 0;
  const unit = +l.unitPrice || 0;
  const disc = (+l.discountPct || 0) / 100;
  return (qty * unit) * (1 - disc);
}

private n(v: any, dec: number) {
  return (+v || 0).toFixed(dec);
}
private async generateSiPdfBlob(header: any, lines: any[]): Promise<Blob> {
  const pdfMake = await this.ensurePdfMakeReady();
  const brand = '#2E5F73';

  const companyName  = 'Continental Catering Solutions Pvt Ltd';
  const companyAddr  = 'Chennai, Tamil Nadu';
  const companyPhone = '+91 XXXXX XXXXX';

  const invNo      = header?.invoiceNo || '-';
  const invDate    = this.fmtDate(header?.invoiceDate);
  const sourceRef  = header?.sourceRef || '-';
  const sourceType = this.sourceLabel((header?.sourceType || 1) as 1 | 2);
  const customerName    = header?.customerName || '-';
  const currencyName    = header?.currencyName || '-';
  const paymentTermName = header?.paymentTermsName || '-';
  const remarks         = header?.remarks || '-';

  const body: any[] = [];

  body.push([
    { text: 'S.No', style: 'th', alignment: 'center' },
    { text: 'Item', style: 'th' },
    { text: 'Description', style: 'th' },
    { text: 'UOM', style: 'th', alignment: 'center' },
    { text: 'Qty', style: 'th', alignment: 'right' },
    { text: 'Unit Price', style: 'th', alignment: 'right' },
    { text: 'Disc %', style: 'th', alignment: 'right' },
    { text: 'Line Total', style: 'th', alignment: 'right' }
  ]);

  (lines || []).forEach((l: any, i: number) => {
    body.push([
      { text: String(i + 1), style: 'td', alignment: 'center' },
      { text: l.itemName || ('#' + (l.itemId || '')), style: 'td' },
      { text: l.description || '-', style: 'td' },
      { text: l.uom || '-', style: 'td', alignment: 'center' },
      { text: this.n(l.qty, 3), style: 'td', alignment: 'right' },
      { text: this.n(l.unitPrice, 2), style: 'td', alignment: 'right' },
      { text: this.n(l.discountPct || 0, 2), style: 'td', alignment: 'right' },
      { text: this.n(this.calcLineTotal(l), 2), style: 'td', alignment: 'right' }
    ]);
  });

  if (!lines?.length) {
    body.push([
      { text: 'No lines', colSpan: 8, alignment: 'center', margin: [0, 10, 0, 10] },
      {}, {}, {}, {}, {}, {}, {}
    ]);
  }

  const subtotal = (lines || []).reduce((s: number, l: any) => s + this.calcLineTotal(l), 0);
  const tax = +(header?.taxAmount ?? header?.tax ?? header?.gstAmount ?? 0);
  const grand = subtotal + tax;

  const dd: any = {
    pageSize: 'A4',
    pageMargins: [24, 20, 24, 24],
    defaultStyle: { fontSize: 10, color: '#111827' },
    content: [
      {
        columns: [
          {
            width: '*',
            stack: [
              { text: companyName, fontSize: 16, bold: true, color: brand },
              { text: companyAddr, fontSize: 10, color: '#374151' },
              { text: companyPhone, fontSize: 10, color: '#374151' }
            ]
          },
          {
            width: 180,
            stack: [
              { text: 'SALES INVOICE', alignment: 'right', fontSize: 16, bold: true, color: brand },
              { text: `Invoice No : ${invNo}`, alignment: 'right' },
              { text: `Date : ${invDate}`, alignment: 'right' }
            ]
          }
        ]
      },

      {
        margin: [0, 14, 0, 12],
        table: {
          widths: ['*', '*'],
          body: [
            [
              {
                stack: [
                  { text: 'Customer', bold: true, color: brand, margin: [0, 0, 0, 4] },
                  { text: customerName }
                ],
                margin: [8, 6, 8, 6]
              },
              {
                stack: [
                  { text: 'Invoice Details', bold: true, color: brand, margin: [0, 0, 0, 4] },
                  { text: `Currency : ${currencyName}` },
                  { text: `Payment Terms : ${paymentTermName}` },
                  { text: `Source : ${sourceType}` },
                  { text: `Source Ref : ${sourceRef}` }
                ],
                margin: [8, 6, 8, 6]
              }
            ]
          ]
        },
        layout: {
          fillColor: () => '#F6FAFC',
          hLineColor: () => '#D9E2E8',
          vLineColor: () => '#D9E2E8'
        }
      },

      {
        margin: [0, 0, 0, 10],
        table: {
          widths: ['*'],
          body: [[
            {
              stack: [
                { text: 'Remarks', bold: true, color: brand, margin: [0, 0, 0, 4] },
                { text: remarks }
              ],
              margin: [8, 6, 8, 6]
            }
          ]]
        },
        layout: {
          fillColor: () => '#F6FAFC',
          hLineColor: () => '#D9E2E8',
          vLineColor: () => '#D9E2E8'
        }
      },

      {
        table: {
          headerRows: 1,
          widths: [35, '*', '*', 50, 55, 70, 55, 75],
          body
        },
        layout: {
          fillColor: (rowIndex: number) => {
            if (rowIndex === 0) return brand;
            return rowIndex % 2 === 0 ? '#F8FAFC' : null;
          },
          hLineColor: () => '#D9E2E8',
          vLineColor: () => '#D9E2E8'
        }
      },

      {
        margin: [0, 12, 0, 0],
        columns: [
          { width: '*', text: '' },
          {
            width: 220,
            table: {
              widths: ['*', 90],
              body: [
              [
                { text: 'Subtotal', bold: true },
                { text: this.n(subtotal, 2), alignment: 'right' }
              ],
              [
                { text: 'GST', bold: true },
                { text: this.n(tax, 2), alignment: 'right' }
              ],
              [
                { text: 'Net Total', bold: true },
                { text: this.n(grand, 2), bold: true, alignment: 'right' }
              ]
            ]
            },
            layout: {
              fillColor: () => '#EEF6F2',
              hLineColor: () => '#D9E2E8',
              vLineColor: () => '#D9E2E8'
            }
          }
        ]
      }
    ],
    styles: {
      th: { color: '#fff', bold: true, fontSize: 9 },
      td: { fontSize: 9, color: '#111827' }
    }
  };

  return new Promise((resolve, reject) => {
    try {
      pdfMake.createPdf(dd).getBlob((blob: Blob) => resolve(blob));
    } catch (e) {
      reject(e);
    }
  });
}
}

