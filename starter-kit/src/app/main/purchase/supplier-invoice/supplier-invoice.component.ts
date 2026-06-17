import {
  Component,
  HostListener,
  OnDestroy,
  OnInit,
  ViewEncapsulation,
  ChangeDetectorRef
} from '@angular/core';
import { FormArray, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import Swal from 'sweetalert2';

import { SupplierInvoiceService } from './supplier-invoice.service';
import { PurchaseGoodreceiptService } from '../purchase-goodreceipt/purchase-goodreceipt.service';
import { ChartofaccountService } from 'app/main/financial/chartofaccount/chartofaccount.service';
import { GstLockService } from 'app/main/financial/tax-gst/gst-lock.service';
import { OcrResponse } from 'app/main/ocrmodule/ocrservice.service';

interface GRNHeader {
  id: number;
  grnNo: string;
  poid: number;
  poNo?: string | number;
  supplierId?: number;
  supplierName?: string;
  grnJson?: any;
  poLines?: any;
  poLinesJson?: any;
  currencyId?: number;
  currencyName?: string; // ✅ add
  fxRate?: number;       // ✅ add
  tax?: number;
  previousPinPending?: boolean;
  previousPinNo?: string;
  previousGrnNo?: string;
  isOverseas?: boolean;
  incotermsName?: string;
}

type TaxMode = 'EXCLUSIVE' | 'INCLUSIVE' | 'ZERO';

type PinLine = {
  item: string;
  qty: number;
  unitPrice: number;
  discountPct: number;
  location?: string;
  budgetLineId?: number | null;
  taxMode?: TaxMode;
};

@Component({
  selector: 'app-supplier-invoice',
  templateUrl: './supplier-invoice.component.html',
  styleUrls: ['./supplier-invoice.component.scss'],
  encapsulation: ViewEncapsulation.None
})
export class SupplierInvoiceComponent implements OnInit, OnDestroy {

  form: FormGroup;
  combineMode = true;

  grnOpen = false;
  grnSearch = '';
  grnList: GRNHeader[] = [];
  grnFiltered: GRNHeader[] = [];

  selectedGrnNos: string[] = [];
  minDate = '';
  userId: number = 0;

  subTotal = 0;
  discountTotal = 0;
  taxAmount = 0;
  grandTotal = 0;
  netPayable = 0;

  parentHeadList: any[] = [];
  ocrOpen = false;
  isPartialAsked = false;

  advanceAmount = 0;
  balancePayableAfterAdvance = 0;
  advanceRows: any[] = [];

  trackByLine = (index: number) => index;

  isGstLocked = false;
  isGlPosted = false;
  gstLockMessage = '';

  // existing properties-க்கு கீழே add பண்ணுங்க
fxRate: number = 1;
currencyName: string = '';
selectedIsOverseas = false;
selectedIncotermsName = '';
netPayableBase: number = 0; // ✅ SGD amount
  constructor(
    private fb: FormBuilder,
    private api: SupplierInvoiceService,
    private grnService: PurchaseGoodreceiptService,
    private router: Router,
    private route: ActivatedRoute,
    private coaService: ChartofaccountService,
    private cdr: ChangeDetectorRef,
    private gstLockService: GstLockService
  ) {
    const storedUserId = localStorage.getItem('id');
    this.userId = storedUserId ? Number(storedUserId) : 0;

    this.form = this.fb.group({
      id: [0],
      invoiceNo: [''],
      grnIds: [[]],
      grnNos: [''],
      supplierId: [null],
      supplierName: [''],
      invoiceDate: ['', Validators.required],
      amount: [0, [Validators.required, Validators.min(0)]],
      tax: [0, [Validators.min(0)]],
      currencyId: [null],
      status: [0],
      lines: this.fb.array([]),
      isPartialInvoice: false
    });
  }

  get lines(): FormArray {
    return this.form.get('lines') as FormArray;
  }

  ngOnInit(): void {
    this.checkGstLock();
    document.body.classList.add('pin-supplier-invoice-page');
    this.setMinDate();
    this.loadAccountHeads();

    this.route.paramMap.subscribe(pm => {
      const id = Number(pm.get('id') || 0);
      if (id > 0) {
        this.loadInvoice(id);
      } else {
        this.isGlPosted = false;
        this.loadGrnsForCreate();
        this.seedEmptyLine();
      }
    });
  }

  ngOnDestroy(): void {
    document.body.classList.remove('pin-supplier-invoice-page');
  }

  checkGstLock(): void {
    const date = this.form.get('invoiceDate')?.value;

    if (!date) {
      this.isGstLocked = false;
      return;
    }

    this.gstLockService.check(date).subscribe({
      next: (res: any) => {
        this.isGstLocked = !!res?.locked;
        this.gstLockMessage = res?.message || '';
      },
      error: () => {
        this.isGstLocked = false;
        this.gstLockMessage = '';
      }
    });
  }

  private isInvoiceBlocked(): boolean {
    if (this.isGstLocked) {
      Swal.fire({
        icon: 'warning',
        title: 'GST Locked',
        text: this.gstLockMessage || 'GST period is locked. Supplier invoice cannot be changed.'
      });
      return true;
    }

    if (this.isGlPosted) {
      Swal.fire({
        icon: 'warning',
        title: 'GL Posted',
        text: 'This Supplier Invoice is already GL posted. You cannot edit or post it again.'
      });
      return true;
    }

    return false;
  }

  private loadGrnsForCreate(): void {
    this.grnService.getAvailableForPinCreate().subscribe({
      next: (res: any) => {
        const raw = res?.data ?? res ?? [];
        this.grnList = raw.map((x: any) => this.mapGrn(x));
        this.grnFiltered = [...this.grnList];

      },
      error: (err) => {
        this.grnList = [];
        this.grnFiltered = [];
        Swal.fire('Error', err?.error?.message || err?.message || 'Unable to load available GRNs.', 'error');
      }
    });
  }

  private loadGrnsForEdit(pinId: number): void {
    this.grnService.getAvailableForPinEdit(pinId).subscribe({
      next: (res: any) => {
        const raw = res?.data ?? res ?? [];
        this.grnList = raw.map((x: any) => this.mapGrn(x));
        this.grnFiltered = [...this.grnList];
        this.syncSelectedOverseasMeta();
      },
      error: (err) => {
        this.grnList = [];
        this.grnFiltered = [];
        Swal.fire('Error', err?.error?.message || err?.message || 'Unable to load available GRNs.', 'error');
      }
    });
  }

  private mapGrn(x: any): GRNHeader {
    const previousPinPendingValue =
      x.previousPinPending ??
      x.PreviousPinPending ??
      x.previousPINPending ??
      x.previous_pin_pending ??
      0;

    return {
      id: Number(x.id ?? x.Id ?? 0),
      grnNo: x.grnNo ?? x.GrnNo ?? x.GRNNo ?? '',
      poid: Number(x.poid ?? x.poId ?? x.POID ?? x.PoId ?? 0),
      poNo: x.poNo ?? x.PoNo ?? x.PONo ?? '',
      tax: x.tax ?? x.Tax ?? 0,
      supplierId: Number(x.supplierId ?? x.SupplierId ?? 0),
      supplierName: x.supplierName ?? x.SupplierName ?? '',
      grnJson: x.grnJson ?? x.GRNJson ?? x.GrnJson,
      poLines: x.poLines ?? x.PoLines,
      poLinesJson: x.poLinesJson ?? x.PoLinesJson,
      currencyId: x.currencyId ?? x.CurrencyId,
       fxRate: Number(x.fxRate ?? x.FxRate ?? 1),        // ✅ add
    currencyName: x.currencyName ?? x.CurrencyName ?? '',
      isOverseas: this.toBool(x.isOverseas ?? x.IsOverseas),
      incotermsName: x.incotermsName ?? x.IncotermsName ?? '',

      previousPinPending:
        previousPinPendingValue === true ||
        previousPinPendingValue === 1 ||
        previousPinPendingValue === '1' ||
        String(previousPinPendingValue).toLowerCase() === 'true',

      previousPinNo: x.previousPinNo ?? x.PreviousPinNo ?? '',
      previousGrnNo: x.previousGrnNo ?? x.PreviousGrnNo ?? ''
    };
  }

  isGrnBlocked(g: GRNHeader): boolean {
    const currentIds: number[] = (this.form.value.grnIds || []).map((x: any) => Number(x));
    if (currentIds.includes(Number(g.id))) return false;
    return g.previousPinPending === true;
  }

  getGrnBlockMessage(g: GRNHeader): string {
    if (!this.isGrnBlocked(g)) return '';

    return `Already invoice ${g.previousPinNo || ''} created for previous GRN ${g.previousGrnNo || ''} under this same PO. Please approve & post that invoice to A/P before selecting this GRN.`;
  }

  private checkSupplierAdvanceForSelectedGrn(): void {
    const grnNos = (this.selectedGrnNos || []).join(',');

    this.advanceAmount = 0;
    this.balancePayableAfterAdvance = Number(this.grandTotal || 0);
    this.advanceRows = [];

    if (!grnNos) return;

    this.api.getSupplierAdvanceByGrnNos(grnNos).subscribe({
      next: (res: any) => {
        const rows = res?.data || res || [];
        this.advanceRows = rows;

        this.advanceAmount = rows.reduce(
          (sum: number, x: any) => sum + Number(x.balanceAmount || 0),
          0
        );

        if (this.advanceAmount <= 0) return;

        const invoiceAmount = Number(this.grandTotal || 0);
        this.balancePayableAfterAdvance = Math.max(invoiceAmount - this.advanceAmount, 0);

        Swal.fire({
          icon: 'info',
          title: 'Supplier Advance Available',
          html: `
            <div style="text-align:left;font-size:14px">
              <p>Advance Amount: <b>${this.advanceAmount.toFixed(2)}</b></p>
              <p>Invoice Amount: <b>${invoiceAmount.toFixed(2)}</b></p>
              <hr/>
              <p style="font-size:16px">
                Balance Payable: <b>${this.balancePayableAfterAdvance.toFixed(2)}</b>
              </p>
            </div>
          `,
          confirmButtonText: 'OK'
        });
      },
      error: () => {
        this.advanceAmount = 0;
        this.balancePayableAfterAdvance = Number(this.grandTotal || 0);
        this.advanceRows = [];
        Swal.fire('Error', 'Failed to check supplier advance.', 'error');
      }
    });
  }

  private showGrnBlockedWarning(g: GRNHeader): void {
    Swal.fire({
      icon: 'warning',
      title: 'Approve & Post Required',
      html: `
        <div style="text-align:left">
          <p>Already invoice <b>${g.previousPinNo || '-'}</b> created for previous GRN <b>${g.previousGrnNo || '-'}</b> under this same PO.</p>
          <p>Please <b>Approve & Post to A/P</b> that invoice before selecting this GRN.</p>
        </div>
      `,
      confirmButtonText: 'OK'
    });
  }

  onGrnFocus(): void {
    if (this.isInvoiceBlocked()) return;

    this.grnFiltered = [...this.grnList];
    this.grnOpen = true;
  }

  onGrnSearch(e: any): void {
    if (this.isInvoiceBlocked()) return;

    const q = (e?.target?.value || '').toLowerCase();
    this.grnSearch = q;

    this.grnFiltered = this.grnList.filter(g =>
      (g.grnNo || '').toLowerCase().includes(q) ||
      (g.poNo || '').toString().toLowerCase().includes(q) ||
      (g.supplierName || '').toLowerCase().includes(q) ||
      (g.isOverseas ? 'overseas import' : 'local').includes(q) ||
      (g.incotermsName || '').toLowerCase().includes(q)
    );

    this.grnOpen = true;
  }

  isGrnSelected(grnId: number): boolean {
    const ids: number[] = (this.form.value.grnIds || []).map((x: any) => Number(x));
    return ids.includes(Number(grnId));
  }

  private normalizeTaxMode(code: any): TaxMode {
    const s = String(code || '').trim().toUpperCase();
    if (s === 'INCLUSIVE' || s === 'INC') return 'INCLUSIVE';
    if (s === 'ZERO' || s === '0' || s === 'NO TAX' || s === 'NOTAX') return 'ZERO';
    return 'EXCLUSIVE';
  }

  private getTaxPctFromGrn(g: GRNHeader | undefined): number {
    if (!g) return 0;
    return this.toNumber(g.tax);
  }

  private getTaxModeFromGrn(g: GRNHeader): TaxMode {
    const poLines = this.safeJsonArray(g.poLines);
    const taxCode = poLines?.[0]?.taxCode;
    return this.normalizeTaxMode(taxCode || 'Exclusive');
  }

  private syncSelectedOverseasMeta(): void {
    const ids: number[] = (this.form.value.grnIds || []).map((x: any) => Number(x));
    const selected = this.grnList.filter(x => ids.includes(Number(x.id)));
    this.selectedIsOverseas = selected.some(x => !!x.isOverseas);
    this.selectedIncotermsName = selected.find(x => !!x.incotermsName)?.incotermsName || '';
  }

  toggleGrn(g: GRNHeader): void {
    if (this.isInvoiceBlocked()) return;

    const currentIds: number[] = (this.form.value.grnIds || []).map((x: any) => Number(x));
    const before = [...currentIds];

    const gid = Number(g.id);
    const isAlreadySelected = currentIds.includes(gid);

    if (!isAlreadySelected && this.isGrnBlocked(g)) {
      this.showGrnBlockedWarning(g);
      return;
    }

    let ids: number[] = [];

    if (!this.combineMode) {
      ids = [gid];
    } else {
      ids = [...currentIds];
      const idx = ids.indexOf(gid);
      if (idx >= 0) ids.splice(idx, 1);
      else ids.push(gid);
    }

    const selected = this.grnList.filter(x => ids.includes(Number(x.id)));

    if (!selected.length) {
      this.applySelectedGrns([]);
      return;
    }

    const blocked = selected.find(x => {
      const alreadySelected = before.includes(Number(x.id));
      return !alreadySelected && this.isGrnBlocked(x);
    });

    if (blocked) {
      this.showGrnBlockedWarning(blocked);
      this.form.patchValue({ grnIds: before }, { emitEvent: false });
      return;
    }

    const suppliers = Array.from(new Set(selected.map(s => Number(s.supplierId || 0)).filter(Boolean)));
    if (suppliers.length > 1) {
      Swal.fire('Invalid', 'Multiple suppliers GRN cannot be combined into one invoice.', 'warning');
      this.form.patchValue({ grnIds: before }, { emitEvent: false });
      return;
    }

    const poIds = Array.from(new Set(selected.map(s => Number(s.poid || 0)).filter(Boolean)));
    if (poIds.length > 1) {
      Swal.fire('Invalid', 'Multiple PO GRN cannot be combined into one invoice (3-way match).', 'warning');
      this.form.patchValue({ grnIds: before }, { emitEvent: false });
      return;
    }

    const taxModes = Array.from(new Set(selected.map(s => this.getTaxModeFromGrn(s))));
    if (taxModes.length > 1) {
      Swal.fire('Invalid', 'Different Tax Mode GRN cannot be combined into one invoice.', 'warning');
      this.form.patchValue({ grnIds: before }, { emitEvent: false });
      return;
    }

    this.applySelectedGrns(selected);
  }

  removeGrnByNo(grnNo: string): void {
    if (this.isInvoiceBlocked()) return;

    const currentIds: number[] = (this.form.value.grnIds || []).map((x: any) => Number(x));
    const toRemove = this.grnList.find(x => x.grnNo === grnNo);
    if (!toRemove) return;

    const ids = currentIds.filter(x => x !== Number(toRemove.id));
    const selected = this.grnList.filter(x => ids.includes(Number(x.id)));
    this.applySelectedGrns(selected);
  }

 private applySelectedGrns(selected: GRNHeader[]): void {
  if (!selected || selected.length === 0) {
    this.selectedGrnNos = [];
    this.grnSearch = '';
    this.fxRate = 1;
    this.currencyName = '';
    this.netPayableBase = 0;
    this.selectedIsOverseas = false;
    this.selectedIncotermsName = '';

    this.form.patchValue({
      grnIds: [],
      grnNos: '',
      supplierId: null,
      supplierName: '',
      currencyId: null,
      tax: 0,
      amount: 0
    }, { emitEvent: false });

    this.replaceLinesWith([{
      item: '',
      qty: 1,
      unitPrice: 0,
      discountPct: 0,
      location: '',
      taxMode: 'EXCLUSIVE'
    }]);

    this.recalcAllLines();
    this.recalcHeaderFromLines();
    this.isPartialAsked = false;
    this.checkSupplierAdvanceForSelectedGrn();
    return;
  }

  const ids = selected.map(x => Number(x.id));
  const displayText = selected.map(x => x.grnNo).join(', ');
  this.selectedGrnNos = selected.map(x => x.grnNo);

  const pct = this.getTaxPctFromGrn(selected[0]);

  // ✅ FxRate + CurrencyName set
  this.fxRate = Number(selected[0]?.fxRate || 1);
  this.currencyName = selected[0]?.currencyName || '';
  this.selectedIsOverseas = selected.some(x => !!x.isOverseas);
  this.selectedIncotermsName = selected.find(x => !!x.incotermsName)?.incotermsName || '';

  this.form.patchValue({
    grnIds: ids,
    grnNos: displayText,
    supplierId: selected[0]?.supplierId ?? null,
    supplierName: selected[0]?.supplierName ?? '',
    currencyId: selected[0]?.currencyId != null ? Number(selected[0]?.currencyId) : null,
    tax: pct
  }, { emitEvent: false });

  this.grnSearch = displayText;
  this.mergeLinesFromMultipleGrns(selected);
  this.recalcAllLines();
  this.recalcHeaderFromLines();
  this.isPartialAsked = false;
  this.checkSupplierAdvanceForSelectedGrn();
}

  private seedEmptyLine(): void {
    if (this.lines.length === 0) {
      this.replaceLinesWith([
        {
          item: '',
          qty: 1,
          unitPrice: 0,
          discountPct: 0,
          location: '',
          taxMode: 'EXCLUSIVE'
        }
      ]);

      this.recalcAllLines();
      this.recalcHeaderFromLines();
    }
  }

  private mergeLinesFromMultipleGrns(grns: GRNHeader[]): void {
    if (!grns || grns.length === 0) {
      this.replaceLinesWith([
        {
          item: '',
          qty: 1,
          unitPrice: 0,
          discountPct: 0,
          location: '',
          taxMode: 'EXCLUSIVE'
        }
      ]);
      return;
    }

    const merged: PinLine[] = [];

    grns.forEach(g => {
      const grnItems = this.safeJsonArray(g.grnJson);
      const defaultMode = this.getTaxModeFromGrn(g);

      grnItems.forEach((x: any) => {
        const code = (x.itemCode || x.item || '').toString().trim();
        const itemText = (x.itemName ? `${code} - ${x.itemName}` : '') || code;
        const qty = this.toNumber(x.qtyReceived || x.qty);
        const unitPrice = this.toNumber(x.unitPrice || x.price);

        const location =
          (x.warehouseName && x.binName)
            ? `${x.warehouseName} / ${x.binName}`
            : '';

        merged.push({
          item: itemText,
          qty,
          unitPrice,
          discountPct: 0,
          location,
          budgetLineId: null,
          taxMode: defaultMode
        });
      });
    });

    const grouped = this.groupSameItemSumQty(merged);

    this.replaceLinesWith(
      grouped.length
        ? grouped
        : [
            {
              item: '',
              qty: 1,
              unitPrice: 0,
              discountPct: 0,
              location: '',
              taxMode: 'EXCLUSIVE'
            }
          ]
    );
  }

  private groupSameItemSumQty(lines: PinLine[]): PinLine[] {
    const map = new Map<string, PinLine>();

    lines.forEach(l => {
      const key =
        (l.item || '').trim().toLowerCase() +
        '|' +
        (l.unitPrice || 0) +
        '|' +
        (l.taxMode || 'EXCLUSIVE');

      const ex = map.get(key);

      if (!ex) {
        map.set(key, { ...l });
      } else {
        ex.qty = +(ex.qty + (l.qty || 0));
      }
    });

    return Array.from(map.values());
  }

  private replaceLinesWith(lines: PinLine[]): void {
    const arr = this.fb.array([]) as FormArray;

    (lines || []).forEach(l => {
      const qty = Number(l.qty || 0);
      const unitPrice = Number(l.unitPrice || 0);
      const discountPct = Number(l.discountPct || 0);
      const taxMode: TaxMode = (l.taxMode || 'EXCLUSIVE') as TaxMode;
      const base = this.calcLineBase(qty, unitPrice, discountPct);

      arr.push(this.fb.group({
        item: [l.item || '', Validators.required],
        location: [l.location || ''],
        budgetLineId: [l.budgetLineId ?? null],
        qty: [qty, [Validators.required, Validators.min(0.0001)]],
        unitPrice: [unitPrice, [Validators.required, Validators.min(0)]],
        discountPct: [discountPct],
        taxMode: [taxMode],
        lineTotal: [base],
        taxAmt: [0],
        lineGrandTotal: [base],
        matchStatus: ['OK'],
        mismatchFields: [''],
        dcNoteNo: [''],
        grnQty: [qty]
      }));
    });

    this.form.setControl('lines', arr);
    this.cdr.detectChanges();
  }

  private calcLineBase(qty: number, price: number, discount: number): number {
    const gross = qty * price;
    const discAmt = discount > 0 ? (gross * discount / 100) : 0;
    return +(gross - discAmt).toFixed(2);
  }

  private calcTaxForLine(base: number, mode: TaxMode): { taxAmt: number; lineGrand: number } {
    const taxPct = this.toNumber(this.form.get('tax')?.value);
    const rate = taxPct / 100;

    if (mode === 'ZERO' || !rate) {
      return {
        taxAmt: 0,
        lineGrand: +base.toFixed(2)
      };
    }

    if (mode === 'EXCLUSIVE') {
      const taxAmt = +(base * rate).toFixed(2);
      return {
        taxAmt,
        lineGrand: +(base + taxAmt).toFixed(2)
      };
    }

    const netBase = +(base / (1 + rate)).toFixed(2);
    const taxAmt = +(base - netBase).toFixed(2);

    return {
      taxAmt,
      lineGrand: +base.toFixed(2)
    };
  }

  private recalcLine(i: number): void {
    const fg = this.lines.at(i) as FormGroup;

    const qty = this.toNumber(fg.get('qty')?.value);
    const price = this.toNumber(fg.get('unitPrice')?.value);
    const disc = this.toNumber(fg.get('discountPct')?.value);
    const mode = (fg.get('taxMode')?.value || 'EXCLUSIVE') as TaxMode;
    const base = this.calcLineBase(qty, price, disc);
    const taxCalc = this.calcTaxForLine(base, mode);

    fg.patchValue({
      lineTotal: base,
      taxAmt: taxCalc.taxAmt,
      lineGrandTotal: taxCalc.lineGrand,
      matchStatus: 'OK',
      mismatchFields: ''
    }, { emitEvent: false });
  }

  private recalcAllLines(): void {
    for (let i = 0; i < this.lines.length; i++) {
      this.recalcLine(i);
    }
  }

  onCellChange(i: number): void {
    if (this.isInvoiceBlocked()) return;

    this.recalcLine(i);
    this.recalcHeaderFromLines();
  }

  async onCellChange1(i: number): Promise<void> {
    if (this.isInvoiceBlocked()) return;

    const fg = this.lines.at(i) as FormGroup;

    const qty = this.toNumber(fg.get('qty')?.value);
    const grnQty = this.toNumber(fg.get('grnQty')?.value);
    const qtyChanged = Math.abs(qty - grnQty) > 0.0001;

    if (qtyChanged && !this.isPartialAsked) {
      this.isPartialAsked = true;

      const res = await Swal.fire({
        title: 'Full Invoice?',
        text: 'You have changed the quantity. Is this a FULL invoice?',
        icon: 'question',
        showCancelButton: true,
        confirmButtonText: 'YES (Full)',
        cancelButtonText: 'NO (Partial)'
      });

      if (res.isConfirmed) {
        this.form.patchValue({ isPartialInvoice: true }, { emitEvent: false });
      } else {
        this.form.patchValue({ isPartialInvoice: false }, { emitEvent: false });
        fg.patchValue({ qty: grnQty }, { emitEvent: false });
      }
    }

    this.recalcLine(i);
    this.recalcHeaderFromLines();
  }

  onLineTaxChange(i: number): void {
    if (this.isInvoiceBlocked()) return;

    this.recalcLine(i);
    this.recalcHeaderFromLines();
  }

  onTaxChange(): void {
    if (this.isInvoiceBlocked()) return;

    this.recalcAllLines();
    this.recalcHeaderFromLines();
  }

 private recalcHeaderFromLines(): void {
  let grossTotal = 0;
  let discount = 0;
  let taxTotal = 0;
  let grandTotal = 0;

  (this.lines.value || []).forEach((l: any) => {
    const q = this.toNumber(l.qty);
    const p = this.toNumber(l.unitPrice);
    const d = this.toNumber(l.discountPct);

    const gross = q * p;
    const discAmt = d > 0 ? (gross * d / 100) : 0;

    grossTotal += gross;
    discount   += discAmt;
    taxTotal   += this.toNumber(l.taxAmt);
    grandTotal += this.toNumber(l.lineGrandTotal);
  });

  this.subTotal      = +grossTotal.toFixed(2);
  this.discountTotal = +discount.toFixed(2);
  this.taxAmount     = +taxTotal.toFixed(2);
  this.grandTotal    = +grandTotal.toFixed(2);
  this.netPayable    = this.grandTotal;

  // ✅ Base SGD calculate
  this.netPayableBase = +(this.netPayable * this.fxRate).toFixed(2);

  this.form.patchValue({ amount: this.grandTotal }, { emitEvent: false });
}

  save(action: 'HOLD' | 'POST' = 'POST'): void {
    if (this.isInvoiceBlocked()) return;

    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const v = this.form.value;
    const grnIds = (v.grnIds || [])
      .map((x: any) => Number(x))
      .filter((n: number) => n > 0);

    if (!grnIds.length) {
      Swal.fire('Select GRN', 'At least one GRN must be selected.', 'warning');
      return;
    }

    const payload = {
      id: Number(v.id || 0),
      invoiceNo: v.invoiceNo,
      grnIds,
      grnNos: v.grnNos,
      invoiceDate: v.invoiceDate,
      supplierId: v.supplierId ? Number(v.supplierId) : null,
      currencyId: v.currencyId != null ? Number(v.currencyId) : null,
      amount: Number(v.amount || 0),
      tax: Number(this.taxAmount || 0),
      fxRate: Number(this.fxRate || 1),
      baseAmount: Number(this.netPayableBase || 0),
      status: action === 'HOLD' ? 1 : 2,
      linesJson: JSON.stringify(this.lines.value),
      createdBy: this.userId,
      updatedBy: this.userId,
      isPartialInvoice: !!this.form.value.isPartialInvoice,
      countryId: Number(localStorage.getItem('countryId') || 0)
    };

    if (payload.id <= 0) {
      this.api.create(payload).subscribe({
        next: () => {
          Swal.fire('Saved successfully');
          this.router.navigate(['/purchase/list-SupplierInvoice']);
        },
        error: (err) => Swal.fire('Save failed', err?.error?.message || err?.message, 'error')
      });
      return;
    }

    this.api.update(payload.id, payload).subscribe({
      next: () => {
        Swal.fire('Updated successfully');
        this.router.navigate(['/purchase/list-SupplierInvoice']);
      },
      error: (err) => Swal.fire('Update failed', err?.error?.message || err?.message, 'error')
    });
  }

  private loadInvoice(id: number): void {
    this.api.getById(id).subscribe({
      next: (res: any) => {
        const d = res?.data ?? res;
        if (!d) return;

        this.isGlPosted = !!(
          d.glPosted ??
          d.GlPosted ??
          d.isGlPosted ??
          d.IsGlPosted ??
          false
        );

        this.form.patchValue({
          id: d.id,
          invoiceNo: d.invoiceNo,
          invoiceDate: (d.invoiceDate || '').substring(0, 10),
          supplierId: d.supplierId,
          supplierName: d.supplierName || '',
          currencyId: d.currencyId,
          status: d.status,
          isPartialInvoice: !!d.isPartialInvoice,
          grnIds: (d.grnIds || []).map((x: any) => Number(x)),
          grnNos: d.grnNos || '',
          tax: this.toNumber(d.taxPct ?? d.taxPercent ?? d.taxRate ?? d.tax)
        }, { emitEvent: false });

        this.checkGstLock();

        this.grnSearch = d.grnNos || '';
        this.selectedGrnNos = (d.grnNos || '')
          .split(',')
          .map((s: string) => s.trim())
          .filter(Boolean);

        let lines: any[] = [];
        try {
          lines = JSON.parse(d.linesJson || '[]');
        } catch {
          lines = [];
        }

        const mappedLines: PinLine[] = (lines || []).map(l => ({
          item: l.item || '',
          qty: Number(l.qty || 0),
          unitPrice: Number(l.unitPrice || 0),
          discountPct: Number(l.discountPct || 0),
          location: l.location || '',
          budgetLineId: l.budgetLineId ?? null,
          taxMode: (l.taxMode || 'EXCLUSIVE') as TaxMode
        }));

        this.replaceLinesWith(
          mappedLines.length
            ? mappedLines
            : [
                {
                  item: '',
                  qty: 1,
                  unitPrice: 0,
                  discountPct: 0,
                  location: '',
                  taxMode: 'EXCLUSIVE'
                }
              ]
        );

        this.recalcAllLines();
        this.recalcHeaderFromLines();
        this.loadGrnsForEdit(id);
      },
      error: (err) => {
        this.isGlPosted = false;
        Swal.fire('Error', err?.error?.message || err?.message || 'Unable to load supplier invoice.', 'error');
      }
    });
  }

  @HostListener('document:click', ['$event'])
  onDocClick(ev: MouseEvent): void {
    if (!(ev.target as HTMLElement).closest('.grn-combobox')) {
      this.grnOpen = false;
    }
  }

  goToSupplierInvoice(): void {
    this.router.navigate(['/purchase/list-SupplierInvoice']);
  }

  loadAccountHeads(): void {
    this.coaService.getAllChartOfAccount().subscribe({
      next: (res: any) => {
        const data = (res?.data || []).filter((x: any) => x.isActive === true);
        this.parentHeadList = data.map((head: any) => ({
          value: Number(head.id),
          label: head.headName
        }));
      },
      error: (err) => {
        this.parentHeadList = [];
        Swal.fire('Error', err?.error?.message || err?.message || 'Unable to load chart of accounts.', 'error');
      }
    });
  }

  private setMinDate(): void {
    const d = new Date();
    this.minDate =
      `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  }

  private toNumber(v: any): number {
    if (v === null || v === undefined) return 0;
    const s = String(v)
      .replace(/[,]/g, '')
      .replace(/\$/g, '')
      .replace(/SGD/gi, '')
      .trim();

    const n = Number(s);
    return isNaN(n) ? 0 : n;
  }

  private toBool(v: any): boolean {
    if (v === true || v === 1 || v === '1') return true;
    return String(v || '').toLowerCase() === 'true';
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

        try {
          val = JSON.parse(s);
          continue;
        } catch {
          return [];
        }
      }

      return Array.isArray(val) ? val : [];
    }

    return Array.isArray(val) ? val : [];
  }

  openOcr(): void {
    if (this.isInvoiceBlocked()) return;
    this.ocrOpen = true;
  }

onOcrApplied(res: OcrResponse): void {
  if (this.isInvoiceBlocked()) return;

  if (!res?.parsed) {
    this.ocrOpen = false;
    return;
  }

  const p = res.parsed;

  // ✅ 1. Header fields patch
  this.form.patchValue({
    invoiceNo:    p.invoiceNo    || this.form.value.invoiceNo,
    invoiceDate:  p.invoiceDate  ? p.invoiceDate.substring(0, 10) : this.form.value.invoiceDate,
    supplierName: p.supplierName || this.form.value.supplierName,
    tax:          p.taxPercent   ?? this.form.value.tax,
  }, { emitEvent: false });

  // ✅ 2. Detect tax mode
  // Inclusive: subTotal == total (tax already inside)
  // Zero: line-level no tax, header tax only (Coca-Cola style)
  // Exclusive: normal
  const subTotal = p.subTotal ?? 0;
  const total    = p.total    ?? 0;
  const taxPct   = p.taxPercent ?? 0;

  let taxMode: 'EXCLUSIVE' | 'INCLUSIVE' | 'ZERO';

  if (taxPct > 0 && subTotal > 0 && Math.abs(subTotal - total) < 1) {
    // SubTotal == Total → GST Inclusive
    taxMode = 'INCLUSIVE';
  } else if (taxPct > 0 && subTotal > 0 && total > subTotal) {
    // Total > SubTotal → GST Exclusive
    taxMode = 'EXCLUSIVE';
  } else {
    // Total == SubTotal + Tax but lines have no tax → ZERO on lines
    taxMode = 'ZERO';
  }

  // ✅ 3. Lines replace
  if (p.lines && p.lines.length > 0) {
    this.replaceLinesWith(p.lines.map((l: any) => ({
      item:        l.item        || '',
      qty:         Number(l.qty        || 1),
      unitPrice:   Number(l.unitPrice  || 0),
      discountPct: Number(l.discountPct || 0),
      location:    '',
      budgetLineId: null,
      // ✅ ZERO — line-level no tax, header tax % handles total
      taxMode:     'ZERO' as any
    })));
    this.recalcAllLines();
  }

  // ✅ 4. Totals — always use OCR values directly
  this.subTotal       = p.subTotal  ?? 0;
  this.discountTotal  = p.discount  ?? 0;
  this.taxAmount      = p.taxAmount ?? 0;
  this.grandTotal     = p.total     ?? 0;
  this.netPayable     = this.grandTotal;
  this.netPayableBase = +(this.netPayable * this.fxRate).toFixed(2);

  this.form.patchValue(
    { amount: this.grandTotal },
    { emitEvent: false }
  );

  this.ocrOpen = false;
} 
}
