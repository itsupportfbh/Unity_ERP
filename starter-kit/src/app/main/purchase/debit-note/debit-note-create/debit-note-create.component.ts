import { Component, HostListener, OnInit, ViewEncapsulation } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import Swal from 'sweetalert2';

import { SupplierInvoiceService } from '../../supplier-invoice/supplier-invoice.service';
import { DebitNoteService, DebitNoteDto } from '../debit-note.service';
import { PurchaseGoodreceiptService } from '../../purchase-goodreceipt/purchase-goodreceipt.service';

interface GRNHeader {
  id: number;
  grnNo: string;
  poid: number;
  poNo?: string | number;
  supplierId?: number;
  supplierName?: string;
  grnJson?: any;        // ✅ line JSON from GRN
  currencyId?: number;
  tax?: number;
}

type LineRow = { item?: string; qty?: number; price?: number; remarks?: string };

@Component({
  selector: 'app-debit-note-create',
  templateUrl: './debit-note-create.component.html',
  styleUrls: ['./debit-note-create.component.scss'],
  encapsulation: ViewEncapsulation.None
})
export class DebitNoteCreateComponent implements OnInit {

  dnId?: number;
  isEdit = false;

  pinId: number = 0;
  grnId?: number;

  supplierId: number | null = null;
  supplierName = '';

  referenceNo = '';
  reason = 'Short supply';
  noteDate = '';
  userId: string;

  retRows: LineRow[] = [];

  // GRN dropdown
  grnOpen = false;
  grnSearch = '';
  grnList: GRNHeader[] = [];
  grnFiltered: GRNHeader[] = [];
  selectedGrnNos: string[] = [];

  constructor(
    private router: Router,
    private route: ActivatedRoute,
    private pinSvc: SupplierInvoiceService,
    private dnSvc: DebitNoteService,
    private grnService: PurchaseGoodreceiptService
  ) {
    this.userId = localStorage.getItem('id') ?? 'System';
  }

  ngOnInit(): void {
    this.setToday();
    this.loadGrnsForCreate();

    // EDIT mode
    this.route.paramMap.subscribe(pm => {
      const idStr = pm.get('id');
      if (idStr) {
        this.isEdit = true;
        this.dnId = Number(idStr);
        this.loadDebitNote(this.dnId);
      }
    });

    // CREATE mode from PIN
    this.route.queryParamMap.subscribe(p => {
      if (this.isEdit) return;

      this.pinId = Number(p.get('pinId') || 0);
      if (this.pinId > 0) {
        this.loadFromPin(this.pinId);
        this.loadGrnsForEdit(this.pinId);
      } else {
        if (!this.retRows.length) this.retRows = [{}];
      }
    });
  }

  // -------------------------
  // UI grid class
  // -------------------------
  gridColsClass(cols: number) {
    return {
      'grid grid-cols-1 gap-3': true,
      'md:grid-cols-1': cols === 1,
      'md:grid-cols-2': cols === 2,
      'md:grid-cols-3': cols === 3,
      'md:grid-cols-4': cols === 4,
      'md:grid-cols-5': cols === 5,
      'md:grid-cols-6': cols === 6
    };
  }

  // -------------------------
  // GRN list load
  // -------------------------
  private loadGrnsForCreate(): void {
    if (!this.grnService?.getAvailableForPinCreate) return;

    this.grnService.getAvailableForPinCreate().subscribe({
      next: (res: any) => {
        const raw = res?.data ?? res ?? [];
        this.grnList = raw.map((x: any) => this.mapGrn(x));
        this.grnFiltered = [...this.grnList];

        if (this.grnId) {
          const g = this.grnList.find(x => Number(x.id) === Number(this.grnId));
          if (g) this.applySelectedGrn(g, true);
        }
      },
      error: (err) => console.error('Error loading GRNs (create)', err)
    });
  }

  private loadGrnsForEdit(pinId: number): void {
    if (!this.grnService?.getAvailableForPinEdit) return;

    this.grnService.getAvailableForPinEdit(pinId).subscribe({
      next: (res: any) => {
        const raw = res?.data ?? res ?? [];
        this.grnList = raw.map((x: any) => this.mapGrn(x));
        this.grnFiltered = [...this.grnList];

        if (this.grnId) {
          const g = this.grnList.find(x => Number(x.id) === Number(this.grnId));
          if (g) this.applySelectedGrn(g, true);
        }
      },
      error: (err) => console.error('Error loading GRNs (edit)', err)
    });
  }

  private mapGrn(x: any): GRNHeader {
    return {
      id: Number(x.id),
      grnNo: x.grnNo,
      poid: Number(x.poid || 0),
      poNo: x.poNo,
      supplierId: x.supplierId != null ? Number(x.supplierId) : undefined,
      supplierName: x.supplierName,
      grnJson: x.grnJson, // IMPORTANT
      currencyId: x.currencyId != null ? Number(x.currencyId) : undefined,
      tax: x.tax != null ? Number(x.tax) : undefined
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
    const text = (e?.target?.value || '');
    const q = text.toLowerCase();
    this.grnSearch = text;

    this.grnFiltered = (this.grnList || []).filter(g =>
      (g.grnNo || '').toLowerCase().includes(q) ||
      (g.poNo || '').toString().toLowerCase().includes(q) ||
      (g.supplierName || '').toLowerCase().includes(q)
    );

    this.grnOpen = true;
  }

  isGrnSelected(grnId: number): boolean {
    return Number(this.grnId || 0) === Number(grnId || 0);
  }

  toggleGrn(g: GRNHeader): void {
    if (!g?.id) return;

    // unselect
    if (this.isGrnSelected(g.id)) {
      this.clearSelectedGrn();
      return;
    }

    // supplier check (optional)
    if (this.supplierId && g.supplierId && Number(this.supplierId) !== Number(g.supplierId)) {
      Swal.fire('Invalid', 'Selected GRN supplier does not match current supplier.', 'warning');
      return;
    }

    this.applySelectedGrn(g);
  }

  private applySelectedGrn(g: GRNHeader, keepExistingLines = false): void {
    this.grnId = Number(g.id);
    this.referenceNo = g.grnNo || '';

    this.supplierId = g.supplierId != null ? Number(g.supplierId) : this.supplierId;
    this.supplierName = g.supplierName || this.supplierName;

    this.grnSearch = g.grnNo || '';
    this.selectedGrnNos = g.grnNo ? [g.grnNo] : [];

    this.grnOpen = false;

    // ✅ MAIN FIX: GRN select -> rows fill
    if (!keepExistingLines) {
      this.fillRowsFromGrn(g);
    }
  }

private fillRowsFromGrn(g: GRNHeader): void {
  const items = this.safeJsonArray(g.grnJson);

  if (!items.length) {
    this.retRows = [{}];
    return;
  }

  this.retRows = items.map((x: any) => {
    const code = (x.itemCode || x.code || '').toString().trim();
    const name = (x.itemName || x.name || '').toString().trim();
    const itemText = name ? `${code ? code + ' - ' : ''}${name}` : (code || x.item || '');

    // ✅ VARIANCE ONLY (don’t use qtyReceived fallback)
    const varianceQty =
      this.toNumber(
        x.varianceQty ??
        x.qtyVariance ??
        x.grnVarianceQty ??
        x.returnQty ??
        x.shortQty ??
        0
      );

    const price = this.toNumber(x.unitPrice ?? x.price ?? 0);

    return {
      item: itemText,
      qty: varianceQty,     // ✅ Variance Qty only
      price: price,
      remarks: ''
    } as LineRow;
  });

  if (!this.retRows.length) this.retRows = [{}];
}

  removeGrnByNo(grnNo: string): void {
    if (!grnNo) return;
    if ((this.referenceNo || '') === grnNo || (this.selectedGrnNos?.[0] || '') === grnNo) {
      this.clearSelectedGrn();
    }
  }

  private clearSelectedGrn(): void {
    this.grnId = undefined;
    this.referenceNo = '';
    this.grnSearch = '';
    this.selectedGrnNos = [];
    this.retRows = [{}]; // clear lines too (feel free to remove if you want keep)
  }

  @HostListener('document:click', ['$event'])
  onDocClick(ev: MouseEvent): void {
    if (!(ev.target as HTMLElement).closest('.grn-combobox')) {
      this.grnOpen = false;
    }
  }

  // -------------------------
  // PIN -> Debit Note source
  // -------------------------
  private loadFromPin(pinId: number) {
    this.pinSvc.getDebitNoteSource(pinId).subscribe({
      next: (res: any) => {
        const d = res?.data || res;
        if (!d) return;

        this.pinId = d.PinId ?? d.pinId ?? pinId;

        this.grnId = d.GrnId ?? d.grnId ?? undefined;
        this.referenceNo = d.GrnNo ?? d.grnNo ?? d.PinNo ?? d.pinNo ?? '';

        this.supplierId = d.SupplierId ?? d.supplierId ?? null;
        this.supplierName = d.Name ?? d.name ?? '';

        if (this.referenceNo) {
          this.grnSearch = this.referenceNo;
          this.selectedGrnNos = [this.referenceNo];
        }

        // lines from PIN source (price comes)
        let lines: any[] = [];
        try {
          const raw = d.LinesJson ?? d.linesJson ?? '[]';
          lines = JSON.parse(raw);
        } catch { lines = []; }

        this.retRows = (lines || []).map((l: any) => ({
          item: l.item ?? '',
          qty: 0, // will set from variance
          price: this.toNumber(l.unitPrice ?? l.price ?? 0),
          remarks: ''
        }));

        if (!this.retRows.length) this.retRows = [{}];

        // variance qty
        this.applyVarianceQty(this.pinId);
      },
      error: (err) => console.error('Error loading PIN source for debit note', err)
    });
  }

  private applyVarianceQty(pinId: number) {
    this.pinSvc.getThreeWayMatch(pinId).subscribe({
      next: (mRes: any) => {
        const m = mRes?.data || mRes;
        if (!m) return;

        const variance = this.toNumber(m.grnVarianceQty ?? m.GrnVarianceQty ?? 0);
        if (this.retRows.length > 0) this.retRows[0].qty = variance;
      },
      error: (err) => console.error('Error loading 3-way match for variance qty', err)
    });
  }

  // -------------------------
  // EDIT load
  // -------------------------
  private loadDebitNote(id: number) {
    this.dnSvc.getById(id).subscribe({
      next: (res: any) => {
        const d = res?.data || res;
        if (!d) return;

        this.dnId = d.id ?? d.Id ?? id;
        this.pinId = d.pinId ?? d.PinId ?? 0;

        this.grnId = d.grnId ?? d.GrnId ?? undefined;
        this.referenceNo = d.referenceNo ?? d.ReferenceNo ?? '';

        this.supplierId = d.supplierId ?? d.SupplierId ?? null;
        this.supplierName = d.supplierName ?? d.SupplierName ?? d.name ?? d.Name ?? '';
        this.reason = d.reason ?? d.Reason ?? this.reason;

        const rawDate = d.noteDate ?? d.NoteDate ?? d.createdDate ?? d.CreatedDate;
        if (rawDate) {
          const dt = new Date(rawDate);
          const mm = String(dt.getMonth() + 1).padStart(2, '0');
          const dd = String(dt.getDate()).padStart(2, '0');
          this.noteDate = `${dt.getFullYear()}-${mm}-${dd}`;
        }

        if (this.referenceNo) {
          this.grnSearch = this.referenceNo;
          this.selectedGrnNos = [this.referenceNo];
        }

        let lines: any[] = [];
        try {
          const rawLines = d.linesJson ?? d.LinesJson ?? '[]';
          lines = JSON.parse(rawLines);
        } catch { lines = []; }

        this.retRows = (lines || []).map((l: any) => ({
          item: l.item ?? '',
          qty: this.toNumber(l.qty ?? 0),
          price: this.toNumber(l.unitPrice ?? l.price ?? 0),
          remarks: l.remarks ?? ''
        }));

        if (!this.retRows.length) this.retRows = [{}];

        if (this.pinId > 0) this.loadGrnsForEdit(this.pinId);
        else this.loadGrnsForCreate();
      },
      error: (err) => {
        console.error('Error loading debit note for edit', err);
        Swal.fire('Error', 'Unable to load debit note.', 'error');
      }
    });
  }

  // -------------------------
  // Lines helpers
  // -------------------------
  retAddRow() { this.retRows = [...this.retRows, {}]; }
  retRemoveRow(i: number) { this.retRows = this.retRows.filter((_, idx) => idx !== i); }
  trackByIndex(index: number) { return index; }

  get totalAmount(): number {
    return (this.retRows || []).reduce((s, r) =>
      s + (this.toNumber(r.qty) * this.toNumber(r.price)), 0);
  }

  // -------------------------
  // Save
  // -------------------------
  save(post: boolean = false) {
    if (!this.supplierId) {
      Swal.fire('Validation', 'Please select supplier.', 'warning');
      return;
    }

    const linesJson = JSON.stringify(this.retRows || []);

    const payload: DebitNoteDto = {
      id: this.dnId,
      supplierId: this.supplierId,
      pinId: this.pinId || undefined,
      grnId: this.grnId,
      referenceNo: this.referenceNo,
      reason: this.reason,
      noteDate: this.noteDate,
      amount: this.totalAmount,
      linesJson,
      status: post ? 1 : 0,
      createdBy: this.userId,
      updatedBy: this.userId,
      countryId:(localStorage.getItem('countryId') || 1)
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
          this.pinSvc.markDebitNote(this.pinId).subscribe({
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

  goToDebitNoteList() {
    this.router.navigate(['/purchase/list-debitnote']);
  }

  get supplierDisplay(): string {
    return this.supplierName || 'Select supplier';
  }

  // -------------------------
  // Utils
  // -------------------------
  private setToday() {
    const d = new Date();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    this.noteDate = `${d.getFullYear()}-${mm}-${dd}`;
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