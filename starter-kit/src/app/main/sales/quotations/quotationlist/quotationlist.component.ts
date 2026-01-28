import { Component, OnInit, ViewEncapsulation, OnDestroy } from '@angular/core';
import { Router } from '@angular/router';
import Swal from 'sweetalert2';
import * as feather from 'feather-icons';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';

// Services
import { QuotationsService } from '../quotations.service';
import { CustomerMasterService } from 'app/main/businessPartners/customer-master/customer-master.service';
import { CurrencyService } from 'app/main/master/currency/currency.service';
import { ItemsService } from 'app/main/master/items/items.service';
import { UomService } from 'app/main/master/uom/uom.service';

type QuotationRow = {
  id: number;
  number: string;
  status: number;
  customerId: number;
  currencyId: number;
  fxRate: number;
  paymentTermsId: number;
  validityDate: string | Date | null;
  subtotal: number;
  taxAmount: number;
  rounding: number;
  grandTotal: number;
  createdDate?: string | Date | null;
  paymentTermsName: string;
  deliveryDate?: any;
};

type QuotationLineRow = {
  id: number;
  quotationId: number;
  itemId: number;
  itemCode?: string;          // ✅ added
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

type QuotationPrintDTO = {
  id: number;
  number: string;
  status: number;
  customerId: number;
  customerName?: string;
  currencyId: number;
  currencyName?: string;
  fxRate: number;
  paymentTermsId: number;
  paymentTermsName?: string;
  deliveryDate?: any;
  remarks?: string;
  deliveryTo?: string;
  subtotal: number;
  taxAmount: number;
  rounding: number;
  grandTotal: number;
  lines: Array<{
    id: number;
    quotationId: number;
    itemId: number;
    itemCode?: string;       // ✅ added
    itemName?: string;
    uomId: number | null;
    uomName?: string;
    qty: number;
    unitPrice: number;
    discountPct: number;
    lineNet: number;
    lineTax: number;
    lineTotal: number;
    description?: string;
  }>;
};

@Component({
  selector: 'app-quotationlist',
  templateUrl: './quotationlist.component.html',
  styleUrls: ['./quotationlist.component.scss'],
  encapsulation: ViewEncapsulation.None
})
export class QuotationlistComponent implements OnInit, OnDestroy {

  rows: QuotationRow[] = [];
  allRows: QuotationRow[] = [];
  selectedOption = 10;
  searchValue = '';

  customerMap = new Map<number, string>();
  currencyMap = new Map<number, string>();
  uomMap      = new Map<number, string>();
  itemNameMap = new Map<number, string>();
  itemCodeMap = new Map<number, string>(); // ✅ added

  // Lines modal
  showLinesModal = false;
  activeQt: QuotationRow | null = null;
  modalLines: QuotationLineRow[] = [];
  modalTotals = { net: 0, tax: 0, total: 0 };

  // PDF modal
  showPdfModal = false;
  pdfLoading = false;
  pdfQt: QuotationRow | null = null;
  pdfPrintDto: QuotationPrintDTO | null = null;

  pdfBlob: Blob | null = null;
  pdfObjectUrl: string | null = null;
  pdfSafeUrl: SafeResourceUrl | null = null;

private _pdfReady = false;
private _pdfMake: any = null;

  private companyInfo = {
    name: 'UnityWorks ERP',
    address1: 'No: 3/8, Church Street',
    address2: 'Nungambakkam, Chennai - 600034',
    phone: '+91 98765 43210',
    email: 'info@unityworks.com',
  };

  private _logoDataUrl: string | null = null;

  constructor(
    private router: Router,
    private quotationSvc: QuotationsService,
    private customerSvc: CustomerMasterService,
    private currencySvc: CurrencyService,
    private itemsSvc: ItemsService,
    private uomSvc: UomService,
    private sanitizer: DomSanitizer
  ) {}

  ngOnInit(): void {
    this.loadLookups();
    this.loadQuotations();
    setTimeout(() => feather.replace(), 0);
  }

  ngOnDestroy(): void {
    this.clearPdfPreview();
    this.unlockBodyScroll();
  }

  // ✅ Lock body scroll when PDF modal open
  private lockBodyScroll() {
    document.body.classList.add('modal-open-no-scroll');
  }
  private unlockBodyScroll() {
    document.body.classList.remove('modal-open-no-scroll');
  }

private async ensurePdfMakeReady(): Promise<any> {
  if (this._pdfReady && this._pdfMake) return this._pdfMake;

  // 1) Load pdfMake
  const pdfMakeMod: any = await import('pdfmake/build/pdfmake');
  const pdfMake: any = pdfMakeMod?.default ?? pdfMakeMod;

  // 2) Load vfs_fonts
  const pdfFontsMod: any = await import('pdfmake/build/vfs_fonts');

  // Your build exports VFS directly (font file keys), so use:
  const vfs: any =
    pdfFontsMod?.default ||          // ✅ your console shows "default"
    pdfFontsMod?.vfs ||              // other possible shapes
    pdfFontsMod;                     // last fallback: module itself

  // If module wrapper, unwrap again
  const resolvedVfs =
    (vfs && typeof vfs === 'object' && (vfs.default || vfs)) || vfs;

  // Basic validation: should contain Roboto font keys
  if (!resolvedVfs || !resolvedVfs['Roboto-Regular.ttf']) {
    console.error('vfs_fonts exports:', Object.keys(pdfFontsMod), pdfFontsMod);
    throw new Error('pdfMake VFS not found/invalid. vfs_fonts did not provide Roboto VFS.');
  }

  // 3) Assign
  pdfMake.vfs = resolvedVfs;

  // (Optional) ensure font mapping exists
  pdfMake.fonts = pdfMake.fonts || {
    Roboto: {
      normal: 'Roboto-Regular.ttf',
      bold: 'Roboto-Medium.ttf',
      italics: 'Roboto-Italic.ttf',
      bolditalics: 'Roboto-MediumItalic.ttf'
    }
  };

  this._pdfMake = pdfMake;
  this._pdfReady = true;
  return pdfMake;
}

  // ✅ generate a PNG logo via canvas (always valid for pdfMake)
  private async getCanvasLogoDataUrl(): Promise<string> {
    if (this._logoDataUrl) return this._logoDataUrl;

    const canvas = document.createElement('canvas');
    canvas.width = 520;
    canvas.height = 140;
    const ctx = canvas.getContext('2d');
    if (!ctx) return 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMB/6X8kKkAAAAASUVORK5CYII=';

    ctx.fillStyle = '#2E5F73';
    this.roundRect(ctx, 0, 0, canvas.width, canvas.height, 28, true, false);

    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 56px Arial';
    ctx.fillText('UnityWorks', 36, 82);

    ctx.fillStyle = '#DDEFF6';
    ctx.font = '24px Arial';
    ctx.fillText('ERP • Finance • Inventory', 38, 118);

    this._logoDataUrl = canvas.toDataURL('image/png');
    return this._logoDataUrl;
  }

  private roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number, fill: boolean, stroke: boolean) {
    const radius = Math.min(r, w / 2, h / 2);
    ctx.beginPath();
    ctx.moveTo(x + radius, y);
    ctx.arcTo(x + w, y, x + w, y + h, radius);
    ctx.arcTo(x + w, y + h, x, y + h, radius);
    ctx.arcTo(x, y + h, x, y, radius);
    ctx.arcTo(x, y, x + w, y, radius);
    ctx.closePath();
    if (fill) ctx.fill();
    if (stroke) ctx.stroke();
  }

  private async getCompanyLogoDataUrl(): Promise<string> {
    return await this.getCanvasLogoDataUrl();
  }

  // ---------- Load Lookups ----------
  loadLookups() {
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
      const arr = res?.data ?? [];
      for (const r of arr) {
        const id = Number(r.id ?? r.itemId ?? 0);
        const name = String(r.itemName ?? r.name ?? '').trim();
        const code = String(r.sku ?? r.itemCode ?? r.code ?? '').trim(); // ✅ try common fields
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

  // ---------- Load Quotations ----------
  loadQuotations() {
    this.quotationSvc.getAll().subscribe((res: any) => {
      const data = res?.data ?? res ?? [];
      this.allRows = data.map((q: any) => ({
        id: Number(q.id ?? q.Id),
        number: String(q.number ?? q.Number ?? ''),
        status: Number(q.status ?? q.Status ?? 0),
        customerId: Number(q.customerId ?? q.CustomerId ?? 0),
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
         createdUserName: q.createdUserName ?? q.createdByName ?? q.createdBy ?? '-',
      modifiedUserName: q.modifiedUserName ?? q.modifiedByName ?? q.modifiedBy ?? '-',
      }));
      this.rows = [...this.allRows];
    });
  }

  // ---------- Helpers ----------
  statusLabel(v: number) {
    return v === 0 ? 'Draft'
      : v === 1 ? 'Pending'
      : v === 2 ? 'Approved'
      : v === 3 ? 'Rejected'
      : v === 4 ? 'Posted'
      : 'Unknown';
  }

  statusClass(v: number) {
    return {
      'badge-secondary': v === 0,
      'badge-warning' : v === 1,
      'badge-success' : v === 2,
      'badge-danger'  : v === 3 || v === 4
    };
  }

  getCustomerName(id?: number) { return (id && this.customerMap.get(id)) || ''; }
  getCurrencyCode(id?: number) { return (id && this.currencyMap.get(id)) || ''; }
  getItemName(id?: number)     { return (id && this.itemNameMap.get(id)) || ''; }
  getItemCode(id?: number)     { return (id && this.itemCodeMap.get(id)) || ''; }
  getUomName(id?: number | null) { return (id != null ? (this.uomMap.get(id) || '') : ''); }

  private formatDate(d: any) {
    if (!d) return '-';
    const dt = new Date(d);
    if (isNaN(dt.getTime())) return '-';
    const dd = String(dt.getDate()).padStart(2, '0');
    const mm = String(dt.getMonth() + 1).padStart(2, '0');
    const yy = dt.getFullYear();
    return `${dd}-${mm}-${yy}`;
  }

  private n(v: any, dec: number) {
    const x = Number(v ?? 0);
    return x.toFixed(dec);
  }

  // ---------- Paging + Search ----------
  onLimitChange(ev: Event) {
    const val = Number((ev.target as HTMLSelectElement).value);
    this.selectedOption = val || 10;
  }

  filterUpdate(_: any) {
    const q = (this.searchValue || '').trim().toLowerCase();
    if (!q) { this.rows = [...this.allRows]; return; }

    this.rows = this.allRows.filter(r => {
      const num = (r.number || '').toLowerCase();
      const cust = (this.getCustomerName(r.customerId) || '').toLowerCase();
      const status = this.statusLabel(r.status).toLowerCase();
      return num.includes(q) || cust.includes(q) || status.includes(q);
    });
  }

  // ---------- Lines modal ----------
  openLinesModal(row: QuotationRow) {
    this.activeQt = row;
    this.showLinesModal = true;

    this.quotationSvc.getById(row.id).subscribe((res: any) => {
      const dto = res?.data ?? res ?? null;
      const apiLines = dto?.lines ?? [];

      this.modalLines = apiLines.map((l: any) => {
        const itemId = Number(l.itemId ?? l.ItemId ?? 0);
        return ({
          id: Number(l.id ?? l.Id ?? 0),
          quotationId: Number(l.quotationId ?? l.QuotationId ?? row.id),
          itemId,
          itemCode: String(l.itemCode ?? l.ItemCode ?? this.getItemCode(itemId) ?? ''),
          itemName: String(l.itemName ?? l.ItemName ?? ''),
          uomId: (l.uomId ?? l.UomId) != null ? Number(l.uomId ?? l.UomId) : null,
          uomName: String(l.uomName ?? l.UomName ?? ''),
          qty: Number(l.qty ?? l.Qty ?? 0),
          unitPrice: Number(l.unitPrice ?? l.UnitPrice ?? 0),
          discountPct: Number(l.discountPct ?? l.DiscountPct ?? 0),
          taxCodeId: l.taxCodeId ?? l.TaxCodeId ?? null,
          lineNet: Number(l.lineNet ?? l.LineNet ?? 0),
          lineTax: Number(l.lineTax ?? l.LineTax ?? 0),
          lineTotal: Number(l.lineTotal ?? l.LineTotal ?? 0),
          description: String(l.description ?? l.Description ?? '')
        });
      });

      let net = 0, tax = 0, total = 0;
      for (const l of this.modalLines) {
        net += +l.lineNet || 0;
        tax += +l.lineTax || 0;
        total += +l.lineTotal || 0;
      }
      this.modalTotals = { net, tax, total };
    });
  }

  closeLinesModal() {
    this.showLinesModal = false;
    this.activeQt = null;
    this.modalLines = [];
    this.modalTotals = { net: 0, tax: 0, total: 0 };
  }

  // ---------- ✅ PDF preview ----------
  openPdfPreview(row: QuotationRow) {
    this.pdfQt = row;
    this.showPdfModal = true;
    this.lockBodyScroll();

    this.pdfLoading = true;
    this.clearPdfPreview();
    this.pdfPrintDto = null;

    this.quotationSvc.getById(row.id).subscribe({
      next: async (res: any) => {
        try {
          const dto = res?.data ?? res ?? null;
          if (!dto) {
            this.pdfLoading = false;
            Swal.fire({ icon: 'error', title: 'No data to print' });
            return;
          }

          const printDto: QuotationPrintDTO = {
            id: Number(dto.id ?? dto.Id ?? row.id),
            number: String(dto.number ?? dto.Number ?? row.number ?? ''),
            status: Number(dto.status ?? dto.Status ?? row.status ?? 0),
            customerId: Number(dto.customerId ?? dto.CustomerId ?? row.customerId ?? 0),
            customerName: String(dto.customerName ?? dto.CustomerName ?? ''),
            currencyId: Number(dto.currencyId ?? dto.CurrencyId ?? row.currencyId ?? 0),
            currencyName: String(dto.currencyName ?? dto.CurrencyName ?? ''),
            fxRate: Number(dto.fxRate ?? dto.FxRate ?? row.fxRate ?? 1),
            paymentTermsId: Number(dto.paymentTermsId ?? dto.PaymentTermsId ?? row.paymentTermsId ?? 0),
            paymentTermsName: String(dto.paymentTermsName ?? dto.PaymentTermsName ?? row.paymentTermsName ?? ''),
            deliveryDate: dto.deliveryDate ?? dto.DeliveryDate ?? row.deliveryDate ?? null,
            remarks: String(dto.remarks ?? dto.Remarks ?? ''),
            deliveryTo: String(dto.deliveryTo ?? dto.DeliveryTo ?? ''),
            subtotal: Number(dto.subtotal ?? dto.Subtotal ?? row.subtotal ?? 0),
            taxAmount: Number(dto.taxAmount ?? dto.TaxAmount ?? row.taxAmount ?? 0),
            rounding: Number(dto.rounding ?? dto.Rounding ?? row.rounding ?? 0),
            grandTotal: Number(dto.grandTotal ?? dto.GrandTotal ?? row.grandTotal ?? 0),
            lines: []
          };

          printDto.lines = (dto.lines ?? dto.Lines ?? []).map((l: any) => {
            const itemId = Number(l.itemId ?? l.ItemId ?? 0);
            return ({
              id: Number(l.id ?? l.Id ?? 0),
              quotationId: Number(l.quotationId ?? l.QuotationId ?? printDto.id),
              itemId,
              itemCode: String(l.itemCode ?? l.ItemCode ?? this.getItemCode(itemId) ?? ''), // ✅
              itemName: String(l.itemName ?? l.ItemName ?? ''),
              uomId: (l.uomId ?? l.UomId) != null ? Number(l.uomId ?? l.UomId) : null,
              uomName: String(l.uomName ?? l.UomName ?? ''),
              qty: Number(l.qty ?? l.Qty ?? 0),
              unitPrice: Number(l.unitPrice ?? l.UnitPrice ?? 0),
              discountPct: Number(l.discountPct ?? l.DiscountPct ?? 0),
              lineNet: Number(l.lineNet ?? l.LineNet ?? 0),
              lineTax: Number(l.lineTax ?? l.LineTax ?? 0),
              lineTotal: Number(l.lineTotal ?? l.LineTotal ?? 0),
              description: String(l.description ?? l.Description ?? '')
            });
          });

          this.pdfPrintDto = printDto;

          const blob = await this.generatePdfBlob(printDto);
          this.pdfBlob = blob;

          // ✅ iframe black screen avoid => set url after small delay
          const url = URL.createObjectURL(blob);
          this.pdfObjectUrl = url;

          // ✅ FitH + zoom + scrollbar
          const hash = '#toolbar=1&navpanes=0&scrollbar=1&view=FitH&zoom=110';

          this.pdfSafeUrl = null;
          setTimeout(() => {
            this.pdfSafeUrl = this.sanitizer.bypassSecurityTrustResourceUrl(url + hash);
          }, 30);

          this.pdfLoading = false;
          setTimeout(() => feather.replace(), 0);
        } catch (e: any) {
          this.pdfLoading = false;
          Swal.fire({ icon: 'error', title: 'PDF generate failed', text: String(e?.message || e) });
        }
      },
      error: () => {
        this.pdfLoading = false;
        Swal.fire({ icon: 'error', title: 'Unable to load quotation' });
      }
    });
  }

  closePdfModal() {
    this.showPdfModal = false;
    this.pdfQt = null;
    this.pdfLoading = false;
    this.pdfPrintDto = null;
    this.clearPdfPreview();
    this.unlockBodyScroll();
  }

  downloadCurrentPdf() {
    if (!this.pdfBlob) return;

    const fileNo = (this.pdfQt?.number || 'Quotation').replace(/[^\w\-]+/g, '_');
    const filename = `${fileNo}.pdf`;

    const url = URL.createObjectURL(this.pdfBlob);

    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();

    URL.revokeObjectURL(url); // ✅ correct
  }

  printCurrentPdf() {
    if (!this.pdfBlob) return;

    const url = URL.createObjectURL(this.pdfBlob);
    const w = window.open(url, '_blank');
    if (!w) {
      Swal.fire({ icon: 'info', title: 'Popup blocked', text: 'Allow popups to print.' });
      URL.revokeObjectURL(url);
      return;
    }
    w.onload = () => {
      w.focus();
      w.print();
    };
    setTimeout(() => URL.revokeObjectURL(url), 30000);
  }

  private clearPdfPreview() {
    if (this.pdfObjectUrl) {
      URL.revokeObjectURL(this.pdfObjectUrl);
      this.pdfObjectUrl = null;
    }
    this.pdfSafeUrl = null;
    this.pdfBlob = null;
  }

  // ✅ PDF generator
  private async generatePdfBlob(dto: QuotationPrintDTO): Promise<Blob> {
    const pdfMake: any = await this.ensurePdfMakeReady();

    const currency = dto.currencyName || this.getCurrencyCode(dto.currencyId) || '';
    const customerName = (dto.customerName || this.getCustomerName(dto.customerId) || '-').trim();
    const deliveryTo = (dto.deliveryTo || '-').trim();
    const remarks = (dto.remarks || '-').trim();

    const logoDataUrl = await this.getCompanyLogoDataUrl();

    // ✅ table body
    const body: any[] = [];
    body.push([
      { text: 'No', style: 'th', alignment: 'center' },
      { text: 'Item Code', style: 'th' },
      { text: 'Item', style: 'th' },
      { text: 'Description', style: 'th' },
      { text: 'UOM', style: 'th', alignment: 'center' },
      { text: 'Qty', style: 'th', alignment: 'right' },
      { text: 'Price', style: 'th', alignment: 'right' },
      { text: 'Disc %', style: 'th', alignment: 'right' },
      { text: 'Net', style: 'th', alignment: 'right' },
      { text: 'Tax', style: 'th', alignment: 'right' },
      { text: 'Total', style: 'th', alignment: 'right' }
    ]);

    const lines = dto.lines || [];
    for (let idx = 0; idx < lines.length; idx++) {
      const l = lines[idx];
      const itemName = (l.itemName || this.getItemName(l.itemId) || `${l.itemId}`).trim();
      const itemCode = (l.itemCode || this.getItemCode(l.itemId) || '-').trim();
      const desc = (l.description || '').trim();

      body.push([
        { text: String(idx + 1), style: 'td', alignment: 'center' },
        { text: itemCode || '-', style: 'td' },
        { text: itemName || '-', style: 'td' },
        { text: desc || '-', style: 'td' },
        { text: (l.uomName || this.getUomName(l.uomId) || '-'), style: 'td', alignment: 'center' },
        { text: this.n(l.qty, 3), style: 'td', alignment: 'right' },
        { text: this.n(l.unitPrice, 2), style: 'td', alignment: 'right' },
        { text: this.n(l.discountPct, 2), style: 'td', alignment: 'right' },
        { text: this.n(l.lineNet, 2), style: 'td', alignment: 'right' },
        { text: this.n(l.lineTax, 2), style: 'td', alignment: 'right' },
        { text: this.n(l.lineTotal, 2), style: 'td', alignment: 'right' }
      ]);
    }

    if (!lines.length) {
      body.push([{ text: 'No line items', colSpan: 11, alignment: 'center', margin: [0, 12, 0, 12] }, {}, {}, {}, {}, {}, {}, {}, {}, {}, {}]);
    }

    const totalsBody = [
      [{ text: 'Subtotal', style: 'totLabel' }, { text: this.n(dto.subtotal, 2), style: 'totVal' }],
      [{ text: 'Tax', style: 'totLabel' }, { text: this.n(dto.taxAmount, 2), style: 'totVal' }],
      [{ text: 'Rounding', style: 'totLabel' }, { text: this.n(dto.rounding, 2), style: 'totVal' }],
      [{ text: 'Grand Total', style: 'totLabelBold' }, { text: this.n(dto.grandTotal, 2), style: 'totValBold' }]
    ];

    const dd: any = {
      pageSize: 'A4',
      pageOrientation: 'landscape', // ✅ IMPORTANT: wide columns fit better
      pageMargins: [20, 18, 20, 30],
      defaultStyle: { fontSize: 9, color: '#111827' },

      content: [
        {
          columns: [
            {
              width: 170,
              stack: [
                { image: logoDataUrl, width: 150, height: 42, margin: [0, 0, 0, 6] },
                { text: 'QUOTATION', style: 'docTitle' }
              ]
            },
            {
              width: '*',
              stack: [
                { text: this.companyInfo.name, style: 'compName' },
                { text: this.companyInfo.address1, style: 'compText' },
                { text: this.companyInfo.address2, style: 'compText' },
                { text: `${this.companyInfo.phone}  |  ${this.companyInfo.email}`, style: 'compText' },
              ],
              margin: [0, 4, 0, 0]
            },
            {
              width: 190,
              stack: [
                { text: `QT No: ${dto.number}`, style: 'meta' },
                { text: `Status: ${this.statusLabel(dto.status)}`, style: 'meta' },
                { text: `Date: ${this.formatDate(new Date())}`, style: 'meta' }
              ],
              alignment: 'right',
              margin: [0, 6, 0, 0]
            }
          ],
          columnGap: 10
        },

        {
          margin: [0, 10, 0, 8],
          columns: [
            this.makeInfoBox('Customer', customerName),
            this.makeInfoBox('Delivery To', deliveryTo),
            this.makeInfoBox('Remarks', remarks)
          ],
          columnGap: 10
        },

        {
          margin: [0, 0, 0, 8],
          columns: [
            { text: `Currency: ${currency || '-'}`, style: 'chip' },
            { text: `Payment Terms: ${dto.paymentTermsName || '-'}`, style: 'chip' },
            { text: `Delivery Date: ${this.formatDate(dto.deliveryDate)}`, style: 'chip' }
          ],
          columnGap: 10
        },

        { text: 'Line Items', style: 'sectionTitle', margin: [0, 4, 0, 6] },

        {
          table: {
            headerRows: 1,
            // ✅ widths tuned for landscape
            widths: [18, 55, 70, '*', 32, 34, 36, 36, 40, 36, 42],
            body
          },
          layout: {
            fillColor: (rowIndex: number) => {
              if (rowIndex === 0) return '#2E5F73';
              return rowIndex % 2 === 0 ? '#F3F6F8' : null;
            },
            hLineColor: () => '#D9E2E8',
            vLineColor: () => '#D9E2E8',
            paddingLeft: () => 5,
            paddingRight: () => 5,
            paddingTop: () => 4,
            paddingBottom: () => 4
          }
        },

        {
          margin: [0, 10, 0, 0],
          columns: [
            { width: '*', text: '' },
            {
              width: 260,
              table: { widths: ['*', 92], body: totalsBody },
              layout: {
                fillColor: (row: number) => (row === 3 ? '#EEF6F2' : null),
                hLineColor: () => '#D9E2E8',
                vLineColor: () => '#D9E2E8',
                paddingLeft: () => 8,
                paddingRight: () => 8,
                paddingTop: () => 6,
                paddingBottom: () => 6
              }
            }
          ]
        }
      ],

      footer: (currentPage: number, pageCount: number) => ({
        margin: [20, 0, 20, 0],
        columns: [
          { text: `Generated: ${this.formatDate(new Date())}`, fontSize: 8, color: '#6b7280' },
          { text: `Page ${currentPage} / ${pageCount}`, alignment: 'right', fontSize: 8, color: '#6b7280' }
        ]
      }),

      styles: {
        docTitle: { fontSize: 14, bold: true, color: '#111827' },
        compName: { fontSize: 12, bold: true, color: '#0f172a' },
        compText: { fontSize: 9, color: '#334155' },
        meta: { fontSize: 9, color: '#334155' },

        chip: { fillColor: '#EEF4F7', color: '#0f172a', margin: [6, 5, 6, 5] },

        sectionTitle: { fontSize: 12, bold: true, color: '#111827' },

        th: { color: '#ffffff', bold: true, fontSize: 9 },
        td: { fontSize: 9, color: '#111827' },

        totLabel: { fontSize: 10, color: '#111827' },
        totVal: { fontSize: 10, alignment: 'right', color: '#111827' },
        totLabelBold: { fontSize: 10, bold: true, color: '#111827' },
        totValBold: { fontSize: 10, bold: true, alignment: 'right', color: '#111827' },

        boxHead: { fontSize: 9, bold: true, color: '#2E5F73' },
        boxText: { fontSize: 10, color: '#111827' }
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

  private makeInfoBox(title: string, value: string) {
    return {
      width: '*',
      table: {
        widths: ['*'],
        body: [[{
          stack: [
            { text: title, style: 'boxHead' },
            { text: value || '-', style: 'boxText' }
          ],
          margin: [6, 6, 6, 6]
        }]]
      },
      layout: {
        fillColor: () => '#F6FAFC',
        hLineColor: () => '#D9E2E8',
        vLineColor: () => '#D9E2E8'
      }
    };
  }

  // ---------- Actions ----------
  goToCreate() { this.router.navigate(['/Sales/Quotation-create']); }
  editQuotation(id: number) { this.router.navigate([`/Sales/Edit-quotation/${id}`]); }

  deleteQuotation(id: number) {
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

  ngAfterViewInit(): void { feather.replace(); }
  ngAfterViewChecked(): void { feather.replace(); }
}
