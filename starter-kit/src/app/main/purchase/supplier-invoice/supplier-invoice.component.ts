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
};

@Component({
  selector: 'app-supplier-invoice',
  templateUrl: './supplier-invoice.component.html',
  styleUrls: ['./supplier-invoice.component.scss'],
  encapsulation: ViewEncapsulation.None
})
export class SupplierInvoiceComponent implements OnInit, OnDestroy {

  form: FormGroup;

  grnOpen = false;
  grnSearch = '';
  grnList: GRNHeader[] = [];
  grnFiltered: GRNHeader[] = [];

  minDate = '';
  userId: string;

  // footer totals
  subTotal = 0;
  discountTotal = 0;
  taxAmount = 0;
  grandTotal = 0;
  netPayable = 0;

  parentHeadList: any[] = [];

  ocrOpen = false;

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

    this.form = this.fb.group({
      id: [0],
      invoiceNo: [''],
      grnId: [null],
      grnNo: [''],
      supplierId: [null],
      supplierName: [''],
      invoiceDate: ['', Validators.required],
      amount: [0, [Validators.required, Validators.min(0)]],
      taxMode: ['ZERO'],
      tax: [0, [Validators.min(0)]], // tax percent
      currencyId: [null],
      status: [0],
      lines: this.fb.array([])
    });
  }

 get lines(): FormArray<any> {
  return this.form.get('lines') as FormArray<any>;
}


  get taxMode(): TaxMode {
    return (this.form.get('taxMode')?.value || 'ZERO') as TaxMode;
  }

  // ✅ BEST trackBy for FormArray controls
  trackByLine = (_: number, ctrl: any) => ctrl;

  ngOnInit(): void {
    document.body.classList.add('pin-supplier-invoice-page');

    this.loadAccountHeads();
    this.setMinDate();
    this.loadGrns();

    this.route.paramMap.subscribe(pm => {
      const id = Number(pm.get('id') || 0);
      if (id > 0) this.loadInvoice(id);
    });

    // start with 1 empty row
    if (this.lines.length === 0) {
      this.replaceLinesWith([
        { item: '', qty: 1, unitPrice: 0, discountPct: 0, location: '' }
      ]);
      this.recalcHeaderFromLines();
    }
  }

  ngOnDestroy(): void {
    document.body.classList.remove('pin-supplier-invoice-page');
  }

  // ===== OCR =====
  openOcr(): void { this.ocrOpen = true; }

  onOcrApplied(_res: OcrResponse): void {
    // keep your existing OCR logic if needed
    Swal.fire({
      icon: 'info',
      title: 'OCR',
      text: 'OCR applied handler exists. (Not needed for GRN autofill issue)',
      confirmButtonColor: '#0e3a4c'
    });
  }

  // ===== GRN =====
  loadGrns(): void {
    this.grnService.getAllGRN().subscribe({
      next: (res: any) => {
        const raw = res?.data ?? [];
        this.grnList = raw.map((x: any) => ({
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
        }));
        this.grnFiltered = [...this.grnList];
      },
      error: (err: any) => console.error('Error loading GRN list', err)
    });
  }

  onGrnFocus(): void {
    this.grnFiltered = [...this.grnList];
    this.grnOpen = true;
  }

  onGrnSearch(e: any): void {
    const q = (e.target.value || '').toLowerCase();
    this.grnSearch = q;

    this.grnFiltered = this.grnList.filter(g =>
      (g.grnNo || '').toLowerCase().includes(q) ||
      (g.poNo || '').toString().toLowerCase().includes(q) ||
      (g.supplierName || '').toLowerCase().includes(q)
    );
    this.grnOpen = true;
  }

  selectGrn(g: GRNHeader): void {
    const pct = Number(g.tax ?? 0);
    const mode: TaxMode = pct > 0 ? 'EXCLUSIVE' : 'ZERO';

    this.form.patchValue({
      grnId: g.id,
      grnNo: g.grnNo,
      supplierId: g.supplierId ?? null,
      supplierName: g.supplierName ?? '',
      tax: pct,
      taxMode: mode,
      currencyId: g.currencyId ?? null
    }, { emitEvent: false });

    this.grnSearch = g.grnNo;
    this.grnOpen = false;

    // ✅ fill lines from GRN
    this.loadLinesFromSelectedGrn(g);

    // ✅ totals
    this.recalcHeaderFromLines();
  }

  private loadLinesFromSelectedGrn(g: GRNHeader): void {
    const grnItems = this.safeJsonArray(g.grnJson);
    const poLines  = this.safeJsonArray(g.poLines ?? g.poLinesJson);

    console.log('GRNJson count:', grnItems.length, 'POLines count:', poLines.length);
    console.log('GRN first:', grnItems[0], 'PO first:', poLines[0]);

    const findPoLineByCode = (codeRaw: any) => {
      const code = (codeRaw || '').toString().trim().toLowerCase();
      if (!code) return null;

      return poLines.find((p: any) => {
        const itemText = (p?.item || '').toString().trim().toLowerCase();
        return itemText.startsWith(code) || itemText.includes(code);
      }) || null;
    };

    // ✅ Build lines array first
    const newLines: PinLine[] = [];

    if (grnItems.length) {
      grnItems.forEach((x: any) => {
        const code = (x.itemCode || x.item || '').toString().trim();
        const po = findPoLineByCode(code);

        const itemText =
          (po?.item ? po.item : '') ||
          (x.itemName ? `${code} - ${x.itemName}` : '') ||
          code;

        const qty =
          this.toNumber(x.qtyReceived) > 0 ? this.toNumber(x.qtyReceived) :
          this.toNumber(x.qty) > 0 ? this.toNumber(x.qty) :
          this.toNumber(po?.qty);

        const unitPrice =
          this.toNumber(x.unitPrice) > 0 ? this.toNumber(x.unitPrice) :
          this.toNumber(x.price) > 0 ? this.toNumber(x.price) :
          this.toNumber(po?.unitPrice) > 0 ? this.toNumber(po?.unitPrice) :
          this.toNumber(po?.price);

        const location =
          (x.warehouseName && x.binName) ? `${x.warehouseName} / ${x.binName}` :
          (x.location ? x.location : (po?.location || ''));

        newLines.push({
          item: (itemText || '').trim(),
          qty: qty || 0,
          unitPrice: unitPrice || 0,
          discountPct: 0,
          location: (location || '').trim(),
          budgetLineId: null // ✅ budget auto fill OFF
        });
      });

      // ✅ THIS is the real fix: replace FormArray instance
      this.replaceLinesWith(newLines.length ? newLines : [{ item: '', qty: 1, unitPrice: 0, discountPct: 0, location: '' }]);
      return;
    }

    // fallback: PO only
    if (poLines.length) {
      poLines.forEach((p: any) => {
        newLines.push({
          item: (p.item ?? p.itemCode ?? p.description ?? '').toString(),
          qty: this.toNumber(p.qty),
          unitPrice: this.toNumber(p.unitPrice ?? p.price),
          discountPct: 0,
          location: (p.location ?? '').toString(),
          budgetLineId: null
        });
      });

      this.replaceLinesWith(newLines.length ? newLines : [{ item: '', qty: 1, unitPrice: 0, discountPct: 0, location: '' }]);
      return;
    }

    // nothing found
    this.replaceLinesWith([{ item: '', qty: 1, unitPrice: 0, discountPct: 0, location: '' }]);
  }

private replaceLinesWith(lines: PinLine[]): void {
  // ✅ Important: force FormArray to accept FormGroup
  const arr = this.fb.array([]) as FormArray<any>;

  (lines || []).forEach(l => {
    const qty = Number(l.qty || 0);
    const unitPrice = Number(l.unitPrice || 0);
    const discountPct = Number(l.discountPct || 0);
    const lineTotal = this.calcLineTotal(qty, unitPrice, discountPct);

    // ✅ FormGroup line
    const fg = this.fb.group({
      item: [l.item || '', Validators.required],
      location: [l.location || ''],
      budgetLineId: [null], // budget auto fill OFF
      qty: [qty, [Validators.required, Validators.min(0.0001)]],
      unitPrice: [unitPrice, [Validators.required, Validators.min(0)]],
      discountPct: [discountPct],
      lineTotal: [lineTotal],
      matchStatus: ['OK'],
      mismatchFields: [''],
      dcNoteNo: ['']
    });

    arr.push(fg); // ✅ now TS ok
  });

  // ✅ Replace FormArray instance
  this.form.setControl('lines', arr);

  this.cdr.detectChanges();
  console.log('LINES AFTER SETCONTROL:', (this.form.get('lines') as FormArray).value);
}


  onCellChange(i: number): void {
    const row = (this.form.get('lines') as FormArray).at(i).value;
    const qty = this.toNumber(row.qty);
    const price = this.toNumber(row.unitPrice);
    const discount = this.toNumber(row.discountPct);

    const lineTotal = this.calcLineTotal(qty, price, discount);
    (this.form.get('lines') as FormArray).at(i).patchValue({ lineTotal }, { emitEvent: false });

    this.recalcHeaderFromLines();
  }

  private calcLineTotal(qty: number, price: number, discount: number): number {
    const gross = qty * price;
    const discAmt = (discount > 0) ? (gross * discount / 100) : 0;
    return +(gross - discAmt).toFixed(2);
  }

  private recalcHeaderFromLines(): void {
    let grossTotal = 0;
    let discount = 0;

    this.lines.value.forEach((l: any) => {
      const q = this.toNumber(l.qty);
      const p = this.toNumber(l.unitPrice);
      const d = this.toNumber(l.discountPct);

      const gross = q * p;
      const discAmt = d > 0 ? (gross * d / 100) : 0;

      grossTotal += gross;
      discount += discAmt;
    });

    const subtotal = +grossTotal.toFixed(2);
    discount = +discount.toFixed(2);

    const taxPct = this.toNumber(this.form.get('tax')?.value);
    const rate = taxPct / 100;
    const mode = this.taxMode;

    const netBeforeTax = subtotal - discount;

    let taxAmt = 0;
    let grand = 0;

    if (mode === 'ZERO' || rate === 0) {
      taxAmt = 0;
      grand = +netBeforeTax.toFixed(2);
    } else if (mode === 'EXCLUSIVE') {
      taxAmt = +(netBeforeTax * rate).toFixed(2);
      grand = +(netBeforeTax + taxAmt).toFixed(2);
    } else {
      // INCLUSIVE
      const base = +(netBeforeTax / (1 + rate)).toFixed(2);
      taxAmt = +(netBeforeTax - base).toFixed(2);
      grand = +netBeforeTax.toFixed(2);
    }

    this.subTotal = subtotal;
    this.discountTotal = discount;
    this.taxAmount = taxAmt;
    this.grandTotal = grand;
    this.netPayable = grand;

    this.form.patchValue({ amount: grand }, { emitEvent: false });
  }

  onTaxChange(): void {
    const pct = this.toNumber(this.form.get('tax')?.value);
    if (pct > 0 && this.taxMode === 'ZERO') {
      this.form.get('taxMode')?.setValue('EXCLUSIVE', { emitEvent: false });
    }
    this.recalcHeaderFromLines();
  }

  onTaxModeChange(): void {
    if (this.taxMode === 'ZERO') this.form.get('tax')?.setValue(0, { emitEvent: false });
    this.recalcHeaderFromLines();
  }

  private setMinDate(): void {
    const d = new Date();
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    this.minDate = `${yyyy}-${mm}-${dd}`;
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

  // ✅ handles double-stringified JSON too
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
      this.parentHeadList = data.map((head: any) => ({
        value: Number(head.id),
        label: head.headName
      }));
    });
  }

  save(action: 'HOLD' | 'POST' = 'POST') {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    if (!this.form.value.supplierId) {
      Swal.fire('Supplier required');
      return;
    }

    const v = this.form.value;

    const payload = {
      invoiceNo: v.invoiceNo,
      invoiceDate: v.invoiceDate,
      supplierId: v.supplierId,
      currencyId: v.currencyId,
      amount: Number(v.amount || 0),
      tax: Number(this.taxAmount || 0),
      status: action === 'HOLD' ? 1 : 2,
      linesJson: JSON.stringify(this.lines.value),
      createdBy: this.userId,
      updatedBy: this.userId
    };

    this.api.create(payload).subscribe({
      next: () => {
        Swal.fire('Saved successfully');
        this.router.navigate(['/purchase/list-SupplierInvoice']);
      },
      error: (err) => Swal.fire('Save failed', err?.error?.message || err?.message, 'error')
    });
  }

  // keep your existing loadInvoice(...) if needed
  private loadInvoice(_id: number): void {}
}
