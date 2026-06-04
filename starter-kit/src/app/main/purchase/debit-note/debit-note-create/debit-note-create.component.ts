import { Component, HostListener, OnInit, ViewEncapsulation } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import Swal from 'sweetalert2';

import { SupplierInvoiceService } from '../../supplier-invoice/supplier-invoice.service';
import { DebitNoteService, DebitNoteDto } from '../debit-note.service';
import { GstLockService } from 'app/main/financial/tax-gst/gst-lock.service';

interface SupplierInvoiceOption {
  id: number;
  invoiceNo: string;
  grnInvoiceNos?: string;
  supplierId?: number;
  supplierName?: string;
  fxRate?: number;       // ✅
  currencyName?: string; // ✅
  currencyId?: number;   // ✅
}

type LineRow = {
  itemId?: number;
  warehouseId?: number;
  binId?: number;
  item?: string;
  totalQty?: number;
  varianceQty?: number;
  qty?: number;
  price?: number;
  remarks?: string;
  taxPct?: number;
  lineAmount?: number;
  taxAmount?: number;
  lineTotal?: number;
};

@Component({
  selector: 'app-debit-note-create',
  templateUrl: './debit-note-create.component.html',
  styleUrls: ['./debit-note-create.component.scss'],
  encapsulation: ViewEncapsulation.None
})
export class DebitNoteCreateComponent implements OnInit {

  dnId?: number;
  isEdit = false;

  pinId = 0;
  grnId: number | null = null;

  supplierId: number | null = null;
  supplierName = '';

  referenceNo = '';
  reason = 'Short supply';
  noteDate = '';
  userId: string;

  retRows: LineRow[] = [];

  invoiceOpen = false;
  invoiceSearch = '';
  invoiceList: SupplierInvoiceOption[] = [];
  invoiceFiltered: SupplierInvoiceOption[] = [];
  selectedInvoiceNo = '';

  isGstLocked = false;
  gstLockMessage = '';
  isGlPosted = false;

  // ✅ FxRate properties
  fxRate: number = 1;
  currencyName: string = '';
  invoiceCurrencyId: number = 0;

  constructor(
    private router: Router,
    private route: ActivatedRoute,
    private pinSvc: SupplierInvoiceService,
    private dnSvc: DebitNoteService,
    private gstLockService: GstLockService
  ) {
    this.userId = localStorage.getItem('id') ?? 'System';
  }

  ngOnInit(): void {
    this.setToday();
    this.checkGstLock();
    this.loadInvoices();

    this.route.paramMap.subscribe(pm => {
      const idStr = pm.get('id');
      if (idStr) {
        this.isEdit = true;
        this.dnId = Number(idStr);
        this.loadDebitNote(this.dnId);
      }
    });

    this.route.queryParamMap.subscribe(p => {
      if (this.isEdit) return;
      this.pinId = Number(p.get('pinId') || 0);
      if (this.pinId > 0) {
        this.loadFromPin(this.pinId);
      } else if (!this.retRows.length) {
        this.retRows = [{}];
      }
    });
  }

  checkGstLock(): void {
    if (!this.noteDate) {
      this.isGstLocked = false;
      this.gstLockMessage = '';
      return;
    }

    this.gstLockService.check(this.noteDate).subscribe({
      next: (res: any) => {
        this.isGstLocked  = !!res?.locked;
        this.gstLockMessage = res?.message || '';
      },
      error: () => {
        this.isGstLocked  = false;
        this.gstLockMessage = '';
      }
    });
  }

  private loadInvoices(): void {
    this.pinSvc.getAll().subscribe({
      next: (res: any) => {
        const raw = res?.data ?? res ?? [];
        this.invoiceList     = raw.map((x: any) => this.mapInvoice(x));
        this.invoiceFiltered = [...this.invoiceList];

        if (this.pinId > 0) {
          const invoice = this.invoiceList.find(x => Number(x.id) === Number(this.pinId));
          if (invoice) this.applySelectedInvoice(invoice, true);
        }
      },
      error: (err) => console.error('Error loading supplier invoices', err)
    });
  }

  private mapInvoice(x: any): SupplierInvoiceOption {
    return {
      id:            Number(x.id            ?? x.Id            ?? 0),
      invoiceNo:     x.invoiceNo            ?? x.InvoiceNo     ?? '',
      grnInvoiceNos: x.grnInvoiceNos        ?? x.GrnInvoiceNos ?? x.grnNos ?? x.GrnNos ?? '',
      supplierId:    x.supplierId != null     ? Number(x.supplierId ?? x.SupplierId) : undefined,
      supplierName:  x.supplierName          ?? x.SupplierName  ?? '',
      fxRate:        Number(x.fxRate         ?? x.FxRate        ?? 1),   // ✅
      currencyName:  x.currencyName          ?? x.CurrencyName  ?? '',   // ✅
      currencyId:    Number(x.currencyId     ?? x.CurrencyId    ?? 0)    // ✅
    };
  }

  onInvoiceFocus(): void {
    this.invoiceFiltered = [...this.invoiceList];
    this.invoiceOpen = true;
  }

  onInvoiceSearch(e: any): void {
    const text = e?.target?.value || '';
    const q    = text.toLowerCase();
    this.invoiceSearch   = text;
    this.invoiceFiltered = (this.invoiceList || []).filter(inv =>
      (inv.invoiceNo    || '').toLowerCase().includes(q) ||
      (inv.grnInvoiceNos || '').toLowerCase().includes(q) ||
      (inv.supplierName  || '').toLowerCase().includes(q)
    );
    this.invoiceOpen = true;
  }

  isInvoiceSelected(invoiceId: number): boolean {
    return Number(this.pinId || 0) === Number(invoiceId || 0);
  }

  toggleInvoice(invoice: SupplierInvoiceOption): void {
    if (!invoice?.id) return;
    if (this.isInvoiceSelected(invoice.id)) {
      this.clearSelectedInvoice();
      return;
    }
    this.applySelectedInvoice(invoice, false);
  }

  private applySelectedInvoice(invoice: SupplierInvoiceOption, keepExistingLines = false): void {
    this.pinId         = Number(invoice.id);
    this.grnId         = null;
    this.referenceNo   = invoice.invoiceNo   || '';
    this.supplierId    = invoice.supplierId  != null ? Number(invoice.supplierId) : null;
    this.supplierName  = invoice.supplierName || '';
    this.invoiceSearch      = invoice.invoiceNo || '';
    this.selectedInvoiceNo  = invoice.invoiceNo || '';
    this.invoiceOpen        = false;

    // ✅ FxRate set from invoice
    this.fxRate            = Number(invoice.fxRate    || 1);
    this.currencyName      = invoice.currencyName     || '';
    this.invoiceCurrencyId = Number(invoice.currencyId || 0);

    if (!keepExistingLines) {
      this.loadFromPin(this.pinId);
    }
  }

  private clearSelectedInvoice(): void {
    this.pinId              = 0;
    this.grnId              = null;
    this.referenceNo        = '';
    this.invoiceSearch      = '';
    this.selectedInvoiceNo  = '';
    this.supplierId         = null;
    this.supplierName       = '';
    this.retRows            = [{}];
    // ✅ reset
    this.fxRate             = 1;
    this.currencyName       = '';
    this.invoiceCurrencyId  = 0;
  }

  @HostListener('document:click', ['$event'])
  onDocClick(ev: MouseEvent): void {
    if (!(ev.target as HTMLElement).closest('.invoice-combobox')) {
      this.invoiceOpen = false;
    }
  }

  private loadFromPin(pinId: number): void {
    this.pinSvc.getById(pinId).subscribe({
      next: (res: any) => {
        const d = res?.data ?? res;
        if (!d) { this.retRows = [{}]; return; }

        this.pinId    = Number(d.pinId    ?? d.PinId    ?? pinId);
        this.grnId    = d.grnId           ?? d.GrnId    ?? null;
        this.referenceNo = d.pinNo        ?? d.PinNo    ?? d.invoiceNo ?? d.InvoiceNo ?? this.referenceNo;
        this.supplierId  = d.supplierId   ?? d.SupplierId ?? this.supplierId;
        this.supplierName = d.supplierName ?? d.SupplierName ?? d.name ?? d.Name ?? this.supplierName;
        this.invoiceSearch     = this.referenceNo;
        this.selectedInvoiceNo = this.referenceNo;

        // ✅ FxRate from PIN
        this.fxRate            = Number(d.fxRate       ?? d.FxRate       ?? this.fxRate);
        this.currencyName      = d.currencyName         ?? d.CurrencyName  ?? this.currencyName;
        this.invoiceCurrencyId = Number(d.currencyId   ?? d.CurrencyId   ?? this.invoiceCurrencyId);

        const invoiceAmount = this.toNumber(d.amount ?? d.Amount ?? 0);
        const invoiceTax    = this.toNumber(d.tax    ?? d.Tax    ?? 0);
        const headerTaxPct  = invoiceAmount > 0 && invoiceTax > 0
          ? (invoiceTax / (invoiceAmount - invoiceTax)) * 100
          : 0;

        const lines = this.extractLines(d);
        this.applySourceLines(lines, headerTaxPct);
      },
      error: (err) => {
        console.error('Error loading PIN source', err);
        Swal.fire('Error', 'Unable to load invoice items.', 'error');
        this.retRows = [{}];
      }
    });
  }

  private loadDebitNote(id: number): void {
    this.dnSvc.getById(id).subscribe({
      next: (res: any) => {
        const d = res?.data || res;
        if (!d) return;

        this.isGlPosted = !!(d.glPosted ?? d.GlPosted ?? d.isGlPosted ?? d.IsGlPosted ?? false);

        this.dnId         = d.id          ?? d.Id          ?? id;
        this.pinId        = d.pinId       ?? d.PinId       ?? 0;
        this.grnId        = null;
        this.referenceNo  = d.referenceNo ?? d.ReferenceNo ?? '';
        this.supplierId   = d.supplierId  ?? d.SupplierId  ?? null;
        this.supplierName = d.supplierName ?? d.SupplierName ?? d.name ?? d.Name ?? '';
        this.reason       = d.reason      ?? d.Reason      ?? this.reason;

        // ✅ FxRate load
        this.fxRate            = Number(d.fxRate      ?? d.FxRate      ?? 1);
        this.currencyName      = d.currencyName        ?? d.CurrencyName ?? '';
        this.invoiceCurrencyId = Number(d.currencyId  ?? d.CurrencyId  ?? 0);

        const rawDate = d.noteDate ?? d.NoteDate ?? d.createdDate ?? d.CreatedDate;
        if (rawDate) {
          const dt = new Date(rawDate);
          const mm = String(dt.getMonth() + 1).padStart(2, '0');
          const dd = String(dt.getDate()).padStart(2, '0');
          this.noteDate = `${dt.getFullYear()}-${mm}-${dd}`;
        }

        if (this.referenceNo) {
          this.invoiceSearch     = this.referenceNo;
          this.selectedInvoiceNo = this.referenceNo;
        }

        let lines: any[] = [];
        try {
          lines = JSON.parse(d.linesJson ?? d.LinesJson ?? '[]');
        } catch { lines = []; }

        this.retRows = (lines || []).map((l: any) => {
          const qty      = this.toNumber(l.varianceQty ?? l.VarianceQty ?? l.qty ?? l.Qty ?? 0);
          const totalQty = this.toNumber(l.totalQty    ?? l.TotalQty    ?? l.invoiceQty ?? l.InvoiceQty ?? qty);
          const price    = this.toNumber(l.price       ?? l.Price       ?? l.unitPrice ?? l.UnitPrice ?? 0);
          const taxPct   = this.toNumber(l.taxPct      ?? l.TaxPct      ?? l.taxPercentage ?? l.TaxPercentage ?? 0);
          const lineAmount = qty * price;
          const taxAmount  = lineAmount * taxPct / 100;
          const lineTotal  = lineAmount + taxAmount;

          return {
            item: l.item ?? l.Item ?? l.itemName ?? l.ItemName ?? '',
            totalQty, varianceQty: qty, qty, price, taxPct,
            lineAmount, taxAmount, lineTotal,
            remarks: l.remarks ?? l.Remarks ?? ''
          };
        });

        if (!this.retRows.length) this.retRows = [{}];
        this.loadInvoices();
      },
      error: (err) => {
        console.error('Error loading debit note for edit', err);
        Swal.fire('Error', 'Unable to load debit note.', 'error');
      }
    });
  }

  retAddRow(): void { this.retRows = [...this.retRows, {}]; }

  retRemoveRow(i: number): void {
    this.retRows = this.retRows.filter((_, idx) => idx !== i);
  }

  trackByIndex(index: number): number { return index; }

  onRowValueChange(row: LineRow): void { this.recalculateRow(row); }

  private recalculateRow(row: LineRow): void {
    const qty    = this.toNumber(row.varianceQty ?? row.qty);
    const price  = this.toNumber(row.price);
    const taxPct = this.toNumber(row.taxPct);
    row.qty = qty; row.varianceQty = qty; row.price = price; row.taxPct = taxPct;
    row.lineAmount = qty * price;
    row.taxAmount  = row.lineAmount * taxPct / 100;
    row.lineTotal  = row.lineAmount + row.taxAmount;
  }

  getLineAmount(r: LineRow): number {
    return this.toNumber(r.varianceQty ?? r.qty) * this.toNumber(r.price);
  }

  getLineTax(r: LineRow): number {
    return this.getLineAmount(r) * this.toNumber(r.taxPct) / 100;
  }

  getLineTotal(r: LineRow): number {
    return this.getLineAmount(r) + this.getLineTax(r);
  }

  get totalAmount(): number {
    return (this.retRows || []).reduce((s, r) => s + this.getLineAmount(r), 0);
  }

  get totalTaxAmount(): number {
    return (this.retRows || []).reduce((s, r) => s + this.getLineTax(r), 0);
  }

  get totalNetAmount(): number {
    return this.totalAmount + this.totalTaxAmount;
  }

  // ✅ Base SGD amount
  get totalAmountBase(): number {
    return +(this.totalAmount * this.fxRate).toFixed(2);
  }

  get totalNetAmountBase(): number {
    return +(this.totalNetAmount * this.fxRate).toFixed(2);
  }

  save(post: boolean = false): void {
    if (!this.supplierId) {
      Swal.fire('Validation', 'Please select supplier invoice.', 'warning');
      return;
    }

    const linesJson = JSON.stringify((this.retRows || []).map(r => {
      const qty        = this.toNumber(r.varianceQty ?? r.qty);
      const price      = this.toNumber(r.price);
      const taxPct     = this.toNumber(r.taxPct);
      const lineAmount = qty * price;
      const taxAmount  = lineAmount * taxPct / 100;
      const lineTotal  = lineAmount + taxAmount;

      return {
        itemId:      Number(r.itemId      ?? 0),
        warehouseId: Number(r.warehouseId ?? 0),
        binId:       Number(r.binId       ?? 0),
        item:        r.item               ?? '',
        totalQty:    this.toNumber(r.totalQty),
        qty, varianceQty: qty, price, taxPct,
        lineAmount, taxAmount, lineTotal,
        remarks: r.remarks ?? ''
      };
    }));

    const payload: DebitNoteDto = {
      id:          this.dnId,
      supplierId:  this.supplierId,
      pinId:       this.pinId   || undefined,
      grnId:       null,
      referenceNo: this.referenceNo,
      reason:      this.reason,
      noteDate:    this.noteDate,
      amount:      this.totalNetAmount,
      linesJson,
      status:      post ? 2 : 0,
      createdBy:   this.userId,
      updatedBy:   this.userId,
      countryId:   localStorage.getItem('countryId') || 1,
      createdDate: new Date(),
     
      fxRate:       this.fxRate,
      amountBase:   this.totalNetAmountBase,
      currencyId:   this.invoiceCurrencyId || undefined,
      currencyName: this.currencyName
    };

    const request$ = this.isEdit && this.dnId
      ? this.dnSvc.update(this.dnId, payload)
      : this.dnSvc.create(payload);

    request$.subscribe({
      next: (res: any) => {
        const isSuccess = res?.isSuccess !== false;
        if (!isSuccess) {
          Swal.fire('Error', res?.message || 'Failed to save debit note.', 'error');
          return;
        }

        const finish = (warn = false) => {
          Swal.fire(
            this.isEdit ? 'Updated' : 'Saved',
            post ? 'Debit Note posted.' : 'Debit Note saved as draft.',
            warn ? 'warning' : 'success'
          ).then(() => this.router.navigate(['/purchase/list-debitnote']));
        };

        if (post && this.pinId > 0) {
          this.dnSvc.getMarkDebitNote(this.pinId).subscribe({
            next: () => finish(false),
            error: () => finish(true)
          });
        } else {
          finish(false);
        }
      },
      error: (err) => {
        console.error('Save debit note failed', err);
        Swal.fire('Error', 'Failed to save debit note.', 'error');
      }
    });
  }

  goToDebitNoteList(): void {
    this.router.navigate(['/purchase/list-debitnote']);
  }

  get supplierDisplay(): string {
    return this.supplierName || 'Select supplier';
  }

  private setToday(): void {
    const d  = new Date();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    this.noteDate = `${d.getFullYear()}-${mm}-${dd}`;
  }

  private extractLines(source: any): any[] {
    if (!source) return [];
    if (Array.isArray(source.lines)) return source.lines;
    if (Array.isArray(source.Lines)) return source.Lines;
    const raw = source.LinesJson ?? source.linesJson ?? source.lines ?? source.Lines ?? '[]';
    return this.safeJsonArray(raw);
  }

  private applySourceLines(lines: any[], headerTaxPct: number = 0): void {
    this.retRows = (lines || []).map((l: any) => {
      const price  = this.toNumber(l.price ?? l.Price ?? l.unitPrice ?? l.UnitPrice ?? l.rate ?? l.Rate ?? 0);
      let taxPct   = this.toNumber(l.taxPct ?? l.TaxPct ?? l.taxPercentage ?? l.TaxPercentage ??
        l.taxRate ?? l.TaxRate ?? l.gstPct ?? l.GstPct ?? l.gstRate ?? l.GstRate ?? 0);
      if (taxPct <= 0) taxPct = this.toNumber(headerTaxPct);

      return {
        itemId:      Number(l.itemId ?? l.ItemId ?? l.itemMasterId ?? l.ItemMasterId ?? 0),
        warehouseId: Number(l.warehouseId ?? l.WarehouseId ?? 0),
        binId:       Number(l.binId       ?? l.BinId       ?? 0),
        item:        l.item ?? l.Item ?? l.itemName ?? l.ItemName ?? l.name ?? l.Name ??
                     l.description ?? l.Description ?? '',
        totalQty:    this.toNumber(l.qty ?? l.Qty ?? l.quantity ?? l.Quantity ??
                     l.invoiceQty ?? l.InvoiceQty ?? 0),
        varianceQty: 0, qty: 0, price, taxPct,
        lineAmount:  0, taxAmount: 0, lineTotal: 0,
        remarks:     l.remarks ?? l.Remarks ?? ''
      };
    });

    if (!this.retRows.length) this.retRows = [{}];
  }

  private toNumber(v: any): number {
    if (v === null || v === undefined) return 0;
    const n = Number(String(v).replace(/[,]/g, '').trim());
    return isNaN(n) ? 0 : n;
  }

  private safeJsonArray(raw: any): any[] {
    if (!raw) return [];
    if (Array.isArray(raw)) return raw;
    let val = raw;
    for (let i = 0; i < 3; i++) {
      if (Array.isArray(val)) return val;
      if (typeof val === 'string') {
        const s = val.trim();
        if (!s) return [];
        try { val = JSON.parse(s); continue; } catch { return []; }
      }
      return Array.isArray(val) ? val : [];
    }
    return Array.isArray(val) ? val : [];
  }
}