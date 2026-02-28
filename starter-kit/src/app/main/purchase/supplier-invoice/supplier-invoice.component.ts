import {
  Component, HostListener, OnDestroy, OnInit, ViewEncapsulation, ChangeDetectorRef
} from '@angular/core';
import { FormArray, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import Swal from 'sweetalert2';

import { SupplierInvoiceService } from './supplier-invoice.service';
import { PurchaseGoodreceiptService } from '../purchase-goodreceipt/purchase-goodreceipt.service';
import { ChartofaccountService } from 'app/main/financial/chartofaccount/chartofaccount.service';

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
  tax?: number;
}

type TaxMode = 'EXCLUSIVE' | 'INCLUSIVE' | 'ZERO';

type PinLine = {
  item: string;
  qty: number;
  unitPrice: number;
  discountPct: number;
  location?: string;
  budgetLineId?: number | null;

  // ✅ per-line tax mode only
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

  // ✅ Scenario A/B
  combineMode = true; // true = multi GRN, false = single

  grnOpen = false;
  grnSearch = '';
  grnList: GRNHeader[] = [];
  grnFiltered: GRNHeader[] = [];

  selectedGrnNos: string[] = [];

  minDate = '';
  userId: string;

  subTotal = 0;
  discountTotal = 0;
  taxAmount = 0;
  grandTotal = 0;
  netPayable = 0;

  parentHeadList: any[] = [];
  ocrOpen = false;

  isPartialAsked = false;

  trackByLine = (index: number) => index;

  constructor(
    private fb: FormBuilder,
    private api: SupplierInvoiceService,
    private grnService: PurchaseGoodreceiptService,
    private router: Router,
    private route: ActivatedRoute,
    private coaService: ChartofaccountService,
    private cdr: ChangeDetectorRef
  ) {
    this.userId = localStorage.getItem('id') ?? 'System';

    // ✅ Header tax% only (taxMode removed)
    this.form = this.fb.group({
      id: [0],
      invoiceNo: [''],
      grnIds: [[]],
      grnNos: [''],
      supplierId: [null],
      supplierName: [''],
      invoiceDate: ['', Validators.required],
      amount: [0, [Validators.required, Validators.min(0)]],

      // ✅ header tax percent only
      tax: [0, [Validators.min(0)]],

      currencyId: [null],
      status: [0],
      lines: this.fb.array([]),
      isPartialInvoice: false
    });
  }

  get lines(): FormArray { return this.form.get('lines') as FormArray; }

  ngOnInit(): void {
    document.body.classList.add('pin-supplier-invoice-page');

    this.setMinDate();
    this.loadAccountHeads();

    this.route.paramMap.subscribe(pm => {
      const id = Number(pm.get('id') || 0);
      if (id > 0) {
        this.loadInvoice(id);
      } else {
        this.loadGrnsForCreate();
        this.seedEmptyLine();
      }
    });
  }

  ngOnDestroy(): void {
    document.body.classList.remove('pin-supplier-invoice-page');
  }

  // -------------------------
  // GRN list load
  // -------------------------
  private loadGrnsForCreate(): void {
    this.grnService.getAvailableForPinCreate().subscribe({
      next: (res: any) => {
        const raw = res?.data ?? res ?? [];
        this.grnList = raw.map((x: any) => this.mapGrn(x));
        this.grnFiltered = [...this.grnList];
      },
      error: (err) => console.error('Error loading GRNs', err)
    });
  }

  private loadGrnsForEdit(pinId: number): void {
    this.grnService.getAvailableForPinEdit(pinId).subscribe({
      next: (res: any) => {
        const raw = res?.data ?? res ?? [];
        this.grnList = raw.map((x: any) => this.mapGrn(x));
        this.grnFiltered = [...this.grnList];
      },
      error: (err) => console.error('Error loading GRNs', err)
    });
  }

  private mapGrn(x: any): GRNHeader {
    return {
      id: x.id,
      grnNo: x.grnNo,
      poid: x.poid,
      poNo: x.poNo,
      tax: x.tax,
      supplierId: x.supplierId,
      supplierName: x.supplierName,
      grnJson: x.grnJson,
      poLines: x.poLines,
      poLinesJson: x.poLinesJson,
      currencyId: x.currencyId
    };
  }

  // -------------------------
  // GRN combobox UI
  // -------------------------
  onGrnFocus(): void {
    this.grnFiltered = [...this.grnList];
    this.grnOpen = true;
  }

  onGrnSearch(e: any): void {
    const q = (e?.target?.value || '').toLowerCase();
    this.grnSearch = q;

    this.grnFiltered = this.grnList.filter(g =>
      (g.grnNo || '').toLowerCase().includes(q) ||
      (g.poNo || '').toString().toLowerCase().includes(q) ||
      (g.supplierName || '').toLowerCase().includes(q)
    );

    this.grnOpen = true;
  }

  isGrnSelected(grnId: number): boolean {
    const ids: number[] = (this.form.value.grnIds || []).map((x: any) => Number(x));
    return ids.includes(Number(grnId));
  }

  // ✅ normalize tax code from PO lines (Exclusive/Inclusive/0)
  private normalizeTaxMode(code: any): TaxMode {
    const s = String(code || '').trim().toUpperCase();
    if (s === 'INCLUSIVE' || s === 'INC') return 'INCLUSIVE';
    if (s === 'ZERO' || s === '0' || s === 'NO TAX' || s === 'NOTAX') return 'ZERO';
    return 'EXCLUSIVE';
  }

  // ✅ from GRN: only tax% needed for header, mode for default lines
  private getTaxPctFromGrn(g: GRNHeader): number {
    return this.toNumber(g.tax);
  }

  private getTaxModeFromGrn(g: GRNHeader): TaxMode {
    const poLines = this.safeJsonArray(g.poLines);
    const taxCode = poLines?.[0]?.taxCode;
    return this.normalizeTaxMode(taxCode || 'Exclusive');
  }

  // ✅ Main selection
  toggleGrn(g: GRNHeader): void {
    const currentIds: number[] = (this.form.value.grnIds || []).map((x: any) => Number(x));
    const before = [...currentIds];

    let ids: number[] = [];
    if (!this.combineMode) {
      ids = [Number(g.id)];
    } else {
      ids = [...currentIds];
      const gid = Number(g.id);
      const idx = ids.indexOf(gid);
      if (idx >= 0) ids.splice(idx, 1);
      else ids.push(gid);
    }

    const selected = this.grnList.filter(x => ids.includes(Number(x.id)));

    // supplier consistency
    const suppliers = Array.from(new Set(selected.map(s => Number(s.supplierId || 0)).filter(Boolean)));
    if (suppliers.length > 1) {
      Swal.fire('Invalid', 'Multiple suppliers GRN cannot be combined into one invoice.', 'warning');
      this.form.patchValue({ grnIds: before }, { emitEvent: false });
      return;
    }

    // PO consistency
    const poIds = Array.from(new Set(selected.map(s => Number(s.poid || 0)).filter(Boolean)));
    if (poIds.length > 1) {
      Swal.fire('Invalid', 'Multiple PO GRN cannot be combined into one invoice (3-way match).', 'warning');
      this.form.patchValue({ grnIds: before }, { emitEvent: false });
      return;
    }

    // ✅ Tax mode consistency across GRNs (optional, keep if you want strict)
    const taxModes = Array.from(new Set(selected.map(s => this.getTaxModeFromGrn(s))));
    if (taxModes.length > 1) {
      Swal.fire('Invalid', 'Different Tax Mode GRN cannot be combined into one invoice.', 'warning');
      this.form.patchValue({ grnIds: before }, { emitEvent: false });
      return;
    }

    this.applySelectedGrns(selected);
  }

  removeGrnByNo(grnNo: string): void {
    const currentIds: number[] = (this.form.value.grnIds || []).map((x: any) => Number(x));
    const toRemove = this.grnList.find(x => x.grnNo === grnNo);
    if (!toRemove) return;

    const ids = currentIds.filter(x => x !== Number(toRemove.id));
    const selected = this.grnList.filter(x => ids.includes(Number(x.id)));

    this.applySelectedGrns(selected);
  }

  private applySelectedGrns(selected: GRNHeader[]): void {
    const ids = selected.map(x => Number(x.id));
    const displayText = selected.map(x => x.grnNo).join(', ');

    this.selectedGrnNos = selected.map(x => x.grnNo);

    // ✅ header tax % auto bind from GRN
    const pct = this.getTaxPctFromGrn(selected[0]);

    this.form.patchValue({
      grnIds: ids,
      grnNos: displayText,
      supplierId: selected[0]?.supplierId ?? null,
      supplierName: selected[0]?.supplierName ?? '',
      currencyId: selected[0]?.currencyId != null ? Number(selected[0]?.currencyId) : null,
      tax: pct
    }, { emitEvent: false });

    this.grnSearch = displayText;

    // merge lines
    this.mergeLinesFromMultipleGrns(selected);

    // recalc all lines (tax amt + totals)
    this.recalcAllLines();
    this.recalcHeaderFromLines();

    this.isPartialAsked = false;
  }

  // -------------------------
  // Lines seed
  // -------------------------
  private seedEmptyLine(): void {
    if (this.lines.length === 0) {
      this.replaceLinesWith([{ item: '', qty: 1, unitPrice: 0, discountPct: 0, location: '', taxMode: 'EXCLUSIVE' }]);
      this.recalcAllLines();
      this.recalcHeaderFromLines();
    }
  }

  // -------------------------
  // Lines merge from GRNs
  // -------------------------
  private mergeLinesFromMultipleGrns(grns: GRNHeader[]): void {
    if (!grns || grns.length === 0) {
      this.replaceLinesWith([{ item: '', qty: 1, unitPrice: 0, discountPct: 0, location: '', taxMode: 'EXCLUSIVE' }]);
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

    this.replaceLinesWith(grouped.length
      ? grouped
      : [{ item: '', qty: 1, unitPrice: 0, discountPct: 0, location: '', taxMode: 'EXCLUSIVE' }]);
  }

  private groupSameItemSumQty(lines: PinLine[]): PinLine[] {
    const map = new Map<string, PinLine>();

    lines.forEach(l => {
      const key = (l.item || '').trim().toLowerCase() + '|' + (l.unitPrice || 0) + '|' + (l.taxMode || 'EXCLUSIVE');
      const ex = map.get(key);
      if (!ex) map.set(key, { ...l });
      else ex.qty = +(ex.qty + (l.qty || 0));
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

      // base only here; tax will be recalculated by recalcLine
      const base = this.calcLineBase(qty, unitPrice, discountPct);

      arr.push(this.fb.group({
        item: [l.item || '', Validators.required],
        location: [l.location || ''],
        budgetLineId: [l.budgetLineId ?? null],
        qty: [qty, [Validators.required, Validators.min(0.0001)]],
        unitPrice: [unitPrice, [Validators.required, Validators.min(0)]],
        discountPct: [discountPct],

        // ✅ per-line tax mode
        taxMode: [taxMode],

        // ✅ computed
        lineTotal: [base],          // base
        taxAmt: [0],                // computed
        lineGrandTotal: [base],     // computed
        matchStatus: ['OK'],
        mismatchFields: [''],
        dcNoteNo: [''],
        grnQty: [qty]
      }));
    });

    this.form.setControl('lines', arr);
    this.cdr.detectChanges();
  }

  // -------------------------
  // Line calculations
  // -------------------------
  private calcLineBase(qty: number, price: number, discount: number): number {
    const gross = qty * price;
    const discAmt = discount > 0 ? (gross * discount / 100) : 0;
    return +(gross - discAmt).toFixed(2);
  }

  private calcTaxForLine(base: number, mode: TaxMode): { taxAmt: number; lineGrand: number } {
    const taxPct = this.toNumber(this.form.get('tax')?.value);
    const rate = taxPct / 100;

    if (mode === 'ZERO' || !rate) {
      return { taxAmt: 0, lineGrand: +base.toFixed(2) };
    }

    if (mode === 'EXCLUSIVE') {
      const taxAmt = +(base * rate).toFixed(2);
      return { taxAmt, lineGrand: +(base + taxAmt).toFixed(2) };
    }

    // INCLUSIVE: base already includes tax
    const netBase = +(base / (1 + rate)).toFixed(2);
    const taxAmt = +(base - netBase).toFixed(2);
    return { taxAmt, lineGrand: +base.toFixed(2) };
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
      lineGrandTotal: taxCalc.lineGrand
    }, { emitEvent: false });
  }

  private recalcAllLines(): void {
    for (let i = 0; i < this.lines.length; i++) {
      this.recalcLine(i);
    }
  }

  // -------------------------
  // UI events
  // -------------------------
  onCellChange(i: number): void {
    this.recalcLine(i);
    this.recalcHeaderFromLines();
  }

  async onCellChange1(i: number): Promise<void> {
    const fg = this.lines.at(i) as FormGroup;

    const qty = this.toNumber(fg.get('qty')?.value);
    const grnQty = this.toNumber(fg.get('grnQty')?.value);
    const qtyChanged = Math.abs(qty - grnQty) > 0.0001;

    if (qtyChanged && !this.isPartialAsked) {
      this.isPartialAsked = true;

      const res = await Swal.fire({
        title: 'Full Invoice?',
        text: 'Qty change pannirukeenga. Idhu FULL invoice-aa?',
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

    // recalc after qty updates
    this.recalcLine(i);
    this.recalcHeaderFromLines();
  }

  onLineTaxChange(i: number): void {
    this.recalcLine(i);
    this.recalcHeaderFromLines();
  }

  onTaxChange(): void {
    // header tax% changed -> recalc all line tax amt + totals
    this.recalcAllLines();
    this.recalcHeaderFromLines();
  }

  // -------------------------
  // Header totals
  // -------------------------
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
      discount += discAmt;

      taxTotal += this.toNumber(l.taxAmt);
      grandTotal += this.toNumber(l.lineGrandTotal);
    });

    this.subTotal = +grossTotal.toFixed(2);
    this.discountTotal = +discount.toFixed(2);
    this.taxAmount = +taxTotal.toFixed(2);
    this.grandTotal = +grandTotal.toFixed(2);
    this.netPayable = this.grandTotal;

    this.form.patchValue({ amount: this.grandTotal }, { emitEvent: false });
  }

  // -------------------------
  // SAVE
  // -------------------------
  save(action: 'HOLD' | 'POST' = 'POST') {
    if (this.form.invalid) { this.form.markAllAsTouched(); return; }

    const v = this.form.value;
    const grnIds = (v.grnIds || []).map((x: any) => Number(x)).filter((n: number) => n > 0);

    if (!grnIds.length) {
      Swal.fire('Select GRN', 'At least one GRN must be selected.', 'warning');
      return;
    }

    const payload = {
      id: Number(v.id || 0),
      invoiceNo: v.invoiceNo,
      grnIds: grnIds,
      grnNos: v.grnNos,
      invoiceDate: v.invoiceDate,
      supplierId: v.supplierId ? Number(v.supplierId) : null,
      currencyId: v.currencyId != null ? Number(v.currencyId) : null,
      amount: Number(v.amount || 0),

      // ✅ tax total from lines
      tax: Number(this.taxAmount || 0),

      status: action === 'HOLD' ? 1 : 2,
      linesJson: JSON.stringify(this.lines.value),
      createdBy: this.userId,
      updatedBy: this.userId,
      isPartialInvoice: !!this.form.value.isPartialInvoice,
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

  // -------------------------
  // EDIT LOAD
  // -------------------------
  private loadInvoice(id: number): void {
    this.api.getById(id).subscribe({
      next: (res: any) => {
        const d = res?.data ?? res;
        if (!d) return;

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
          tax: this.toNumber(d.taxPct ?? d.taxPercent ?? d.taxRate ?? d.tax) // keep safe
        }, { emitEvent: false });

        this.grnSearch = d.grnNos || '';
        this.selectedGrnNos = (d.grnNos || '')
          .split(',')
          .map((s: string) => s.trim())
          .filter(Boolean);

        let lines: any[] = [];
        try { lines = JSON.parse(d.linesJson || '[]'); } catch { lines = []; }

        const mappedLines: PinLine[] = (lines || []).map(l => ({
          item: l.item || '',
          qty: Number(l.qty || 0),
          unitPrice: Number(l.unitPrice || 0),
          discountPct: Number(l.discountPct || 0),
          location: l.location || '',
          budgetLineId: l.budgetLineId ?? null,
          taxMode: (l.taxMode || 'EXCLUSIVE') as TaxMode
        }));

        this.replaceLinesWith(mappedLines.length
          ? mappedLines
          : [{ item: '', qty: 1, unitPrice: 0, discountPct: 0, location: '', taxMode: 'EXCLUSIVE' }]);

        this.recalcAllLines();
        this.recalcHeaderFromLines();

        this.loadGrnsForEdit(id);
      }
    });
  }

  // -------------------------
  // UI helpers
  // -------------------------
  @HostListener('document:click', ['$event'])
  onDocClick(ev: MouseEvent): void {
    if (!(ev.target as HTMLElement).closest('.grn-combobox')) this.grnOpen = false;
  }

  goToSupplierInvoice(): void {
    this.router.navigate(['/purchase/list-SupplierInvoice']);
  }

  loadAccountHeads(): void {
    this.coaService.getAllChartOfAccount().subscribe((res: any) => {
      const data = (res?.data || []).filter((x: any) => x.isActive === true);
      this.parentHeadList = data.map((head: any) => ({ value: Number(head.id), label: head.headName }));
    });
  }

  private setMinDate(): void {
    const d = new Date();
    this.minDate = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
  }

  private toNumber(v: any): number {
    if (v === null || v === undefined) return 0;
    const s = String(v).replace(/[,]/g,'').replace(/\$/g,'').replace(/SGD/gi,'').trim();
    const n = Number(s);
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

  openOcr(): void { this.ocrOpen = true; }
  onOcrApplied(_res: any): void { this.ocrOpen = false; }
}