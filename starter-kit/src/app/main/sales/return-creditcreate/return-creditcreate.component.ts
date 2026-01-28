// return-creditcreate.component.ts
import { Component, OnDestroy, OnInit } from '@angular/core';
import { Router, ActivatedRoute } from '@angular/router';
import { Subject, forkJoin } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import Swal from 'sweetalert2';

import { CreditNoteService, CnHeader, CnLine } from '../return-creditcreate/return-credit.service';
import { DeliveryOrderService } from '../deliveryorder/deliveryorder.service';
import { TaxCodeService } from 'app/main/master/taxcode/taxcode.service';
import { StockIssueService } from 'app/main/master/stock-issue/stock-issue.service';
import { CustomerMasterService } from 'app/main/businessPartners/customer-master/customer-master.service';

type DoItem = {
  doLineId: number;
  itemId: number;
  itemName: string;
  uom?: string | null;
  deliveredQty: number;
  unitPrice: number;
  discountPct: number;
  gstPct?: number | null;
  tax?: string | null;
  taxCodeId?: number | null;
  warehouseId: number | null;
  supplierId: number | null;
  binId: number | null;
};

@Component({
  selector: 'app-return-creditcreate',
  templateUrl: './return-creditcreate.component.html',
  styleUrls: ['./return-creditcreate.component.scss']
})
export class ReturnCreditcreateComponent implements OnInit, OnDestroy {

  private destroy$ = new Subject<void>();

  isEdit = false;
  cnId: number | null = null;
  cnNo: string | null = null;

  doList: any[] = [];
  taxCodes: any[] = [];
  reasons: any[] = [];
  dispositions = [
    { id: 1, name: 'RESTOCK' },
    { id: 2, name: 'SCRAP' },
  ];

  // header
  doId: number | null = null;
  doNumber: string | null = null;
  siId: number | null = null;
  siNumber: string | null = null;
  customerId: number | null = null;
  customerName: string | null = null;
  creditNoteDate: string = new Date().toISOString().slice(0, 10);
  status = 1;

  lines: CnLine[] = [];
  subtotal = 0;

  customers: any[] = [];
  doPool: DoItem[] = [];
  availableItems: DoItem[] = [];

  trackByLine = (_: number, r: CnLine) => r?.id ?? r?.doLineId ?? r?.itemId ?? _;

  constructor(
    private api: CreditNoteService,
    private router: Router,
    private route: ActivatedRoute,
    private doSvc: DeliveryOrderService,
    private taxCodeService: TaxCodeService,
    private stockIssueService: StockIssueService,
    private customerService: CustomerMasterService,
  ) { }

  ngOnInit(): void {
    this.route.paramMap.pipe(takeUntil(this.destroy$)).subscribe(pm => {
      const idStr = pm.get('id');
      this.isEdit = !!idStr;
      this.cnId = idStr ? +idStr : null;

      forkJoin({
        doList: this.doSvc.getAll(),
        taxCodes: this.taxCodeService.getTaxCode(),
        reasons: this.stockIssueService.getAllStockissue(),
        customers: this.customerService.GetAllCustomerDetails()
      })
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: (bag: any) => {
            this.doList = bag?.doList ?? [];
            this.taxCodes = (bag?.taxCodes?.data ?? []).map((t: any) => ({
              id: +t.id,
              taxName: t.taxName ?? t.name ?? `#${t.id}`
            }));
            this.reasons = (bag?.reasons?.data ?? []);
            this.customers = (bag?.customers?.data ?? []);

            if (this.isEdit && this.cnId) {
              this.loadForEdit(this.cnId);
            }
          },
          error: _ => Swal.fire({ icon: 'error', title: 'Load failed', text: 'Init data' })
        });
    });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  // =============  EDIT LOAD  =============
  private loadForEdit(id: number): void {
    this.api.getCreditNoteById(id).subscribe({
      next: (res: any) => {
        const data = res?.data;
        if (!data) { return; }

        this.cnNo = data.creditNoteNo;
        this.doId = data.doId;
        this.doNumber = data.doNumber;
        this.siId = data.siId;
        this.siNumber = data.siNumber;
        this.customerId = data.customerId;
        this.customerName = data.customerName;
        this.creditNoteDate = this.toDateInput(data.creditNoteDate);
        this.status = data.status ?? 1;

        this.lines = (data.lines ?? []).map((l: any) => ({
          id: l.id,
          creditNoteId: l.creditNoteId,
          doLineId: l.doLineId,
          siId: l.siId,
          itemId: l.itemId,
          itemName: l.itemName,
          uom: l.uom,
          deliveredQty: +l.deliveredQty,
          returnedQty: +l.returnedQty,
          unitPrice: +l.unitPrice,
          discountPct: +l.discountPct,
          gstPct: +(l.gstPct ?? 0),
          tax: l.tax ?? 'STANDARD-RATED',
          taxCodeId: l.taxCodeId,
          lineNet: +l.lineNet,
          reasonId: l.reasonId,
          restockDispositionId: l.restockDispositionId,
          warehouseId: l.warehouseId,
          supplierId: l.supplierId,
          binId: l.binId
        }));

        this.recalcAll();
      }
    });
  }

  // ======= date helpers =======
  private toDateInput(v: any): string {
    if (!v) return this.today();
    const d = typeof v === 'string' ? this.parseLocalYmd(v) : new Date(v);
    if (isNaN(d.getTime())) return this.today();
    return this.formatYmdLocal(d);
  }

  private parseLocalYmd(s: string): Date {
    const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(s);
    return m ? new Date(+m[1], +m[2] - 1, +m[3]) : new Date(s);
  }

  private formatYmdLocal(d: Date): string {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  }

  private today(): string {
    return this.formatYmdLocal(new Date());
  }

  // =============  DO CHANGE  =============
  onDoChanged(): void {
    const row = this.doList.find(d => +d.id === +this.doId!);
    if (!row) {
      this.clearHeaderFromDo();
      return;
    }

    this.doNumber = row.doNumber ?? row.DoNumber ?? '';
    this.siNumber = row.siNumber ?? row.invoiceNo ?? row.SiNumber ?? '';
    this.siId = row.siId;
    this.customerId = row.customerId;
    this.customerName = this.customers?.find(c => c.customerId == this.customerId)?.customerName ?? '';

    // load DO lines for this DO
    this.api.getLines(this.doId!, this.isEdit ? this.cnId : null).subscribe({
      next: (res: any) => {
        const raw = Array.isArray(res) ? res : [];
        this.doPool = raw.map((r: any) => ({
          doLineId: r.DoLineId ?? r.id ?? 0,
          itemId: +r.ItemId,
          itemName: r.ItemName,
          uom: r.Uom ?? 'Pieces',
          deliveredQty: +(r.QtyRemaining ?? r.QtyDelivered ?? r.Qty ?? 0),
          unitPrice: +(r.UnitPrice ?? 0),
          discountPct: +(r.DiscountPct ?? 0),
          gstPct: +(r.GstPct ?? r.gstPct ?? 0),
          tax: r.Tax ?? r.tax ?? 'STANDARD-RATED',
          taxCodeId: r.TaxCodeId ?? null,
          warehouseId: r.WarehouseId ?? null,
          supplierId: r.SupplierId ?? null,
          binId: r.BinId ?? null
        })) as DoItem[];

        this.lines = [];
        this.subtotal = 0;
        this.refreshAvailable();
      },
      error: _ => Swal.fire({ icon: 'error', title: 'Failed', text: 'Load DO lines' })
    });
  }

  private clearHeaderFromDo(): void {
    this.doNumber = null;
    this.siNumber = null;
    this.customerId = null;
    this.customerName = null;
    this.lines = [];
    this.subtotal = 0;
  }

  // =============  AVAILABLE ITEMS FILTER  =============
  private refreshAvailable(): void {
    const used = new Set(
      this.lines
        .filter(x => x?.doLineId != null)
        .map(x => `${x.doLineId}|${x.itemId}|${x.warehouseId}|${x.supplierId}|${x.binId ?? 'null'}`)
    );

    this.availableItems = this.doPool.filter(p =>
      !used.has(`${p.doLineId}|${p.itemId}|${p.warehouseId}|${p.supplierId}|${p.binId ?? 'null'}`)
    );
  }

  // =============  ROW OPS  =============
  addLine(): void {
    this.lines.push({
      doLineId: null,
      siId: this.siId ?? 0,
      itemId: 0,
      itemName: '',
      uom: null,
      deliveredQty: 0,
      returnedQty: 0,
      unitPrice: 0,
      discountPct: 0,
      gstPct: 0,
      tax: 'STANDARD-RATED',
      taxCodeId: null,
      lineNet: 0,
      reasonId: null,
      restockDispositionId: 1,
      warehouseId: null,
      supplierId: null,
      binId: null
    });
    this.refreshAvailable();
  }

  onItemPicked(ix: number, pickedItemId: number | null): void {
    const row = this.lines[ix];
    if (!row) { return; }

    if (!pickedItemId) {
      // clear line if needed
      return;
    }

    const src = this.doPool.find(p => +p.itemId === +pickedItemId);
    if (!src) { return; }

    row.doLineId = src.doLineId;
    row.itemId = src.itemId;
    row.itemName = src.itemName;
    row.uom = src.uom ?? 'Pieces';
    row.deliveredQty = src.deliveredQty;
    row.returnedQty = 0;
    row.unitPrice = src.unitPrice;
    row.discountPct = src.discountPct ?? 0;
    row.gstPct = src.gstPct ?? 0;
    row.tax = src.tax ?? 'STANDARD-RATED';
    row.taxCodeId = src.taxCodeId ?? null;

    row.warehouseId = src.warehouseId ?? null;
    row.supplierId = src.supplierId ?? null;
    row.binId = src.binId ?? null;

    this.refreshAvailable();
    this.recalc(ix);
  }

  removeLine(ix: number): void {
    this.lines.splice(ix, 1);
    this.refreshAvailable();
    this.recalcAll();
  }

  // =============  CALC (WITH GST)  =============
  recalc(i: number): void {
    const r = this.lines[i];
    if (!r) { return; }

    const qty = Math.max(0, +r.returnedQty || 0);
    r.returnedQty = qty > r.deliveredQty ? r.deliveredQty : qty;

    const unit = +r.unitPrice || 0;
    const discPct = +r.discountPct || 0;
    const gstPct = +r.gstPct || 0;
    const taxFlag = (r.tax || '').toUpperCase();
    const hasTax = !!r.taxCodeId && gstPct > 0;

    // base (discounted) amount
    const rawBase = r.returnedQty * unit * (1 - discPct / 100);
    const baseAmount = +rawBase.toFixed(2);

    let lineNet: number;

    if (!hasTax || taxFlag === 'EXEMPT') {
      lineNet = baseAmount;
    } else if (taxFlag === 'STANDARD-RATED') {
      const gstAmount = +(baseAmount * (gstPct / 100)).toFixed(2);
      lineNet = baseAmount + gstAmount;
    } else {
      // INCLUSIVE – base already includes GST
      lineNet = baseAmount;
    }

    r.lineNet = +lineNet.toFixed(2);

    this.subtotal = +this.lines.reduce((s, x) => s + (+x.lineNet || 0), 0).toFixed(2);
  }

  private recalcAll(): void {
    this.lines.forEach((_, i) => this.recalc(i));
  }

  // =============  SAVE  =============
  save(status: number): void {
    this.status = status;

    if (!this.creditNoteDate) {
      Swal.fire({ icon: 'warning', title: 'Credit note date required' });
      return;
    }
    if (!this.doId) {
      Swal.fire({ icon: 'warning', title: 'Select a Delivery Order' });
      return;
    }
    if (this.lines.length === 0) {
      Swal.fire({ icon: 'warning', title: 'Add at least one line' });
      return;
    }

    const payload: CnHeader = {
      ...(this.isEdit && this.cnId ? { id: this.cnId } : {}),
      doId: this.doId,
      doNumber: this.doNumber ?? null,
      siId: this.siId,
      siNumber: this.siNumber ?? null,
      customerId: this.customerId ?? null,
      customerName: this.customerName ?? null,
      creditNoteDate: this.creditNoteDate,
      status: this.status,
      subtotal: this.subtotal,
      lines: this.lines.map(l => ({
        id: l.id ?? 0,
        doLineId: l.doLineId ?? null,
        siId: l.siId,
        itemId: l.itemId,
        itemName: l.itemName,
        uom: l.uom ?? null,
        deliveredQty: +l.deliveredQty,
        returnedQty: +l.returnedQty,
        unitPrice: +l.unitPrice,
        discountPct: +l.discountPct,
        gstPct: l.gstPct ?? 0,
        tax: l.tax ?? 'STANDARD-RATED',
        taxCodeId: l.taxCodeId ?? null,
        lineNet: +l.lineNet,
        reasonId: l.reasonId ?? null,
        restockDispositionId: l.restockDispositionId ?? 1,
        warehouseId: l.warehouseId,
        supplierId: l.supplierId,
        binId: l.binId
      }))
    };

    const obs = !this.isEdit
      ? this.api.insertCreditNote(payload)
      : this.api.updateCreditNote(payload);

    obs.subscribe({
      next: (res: any) => {
        if (res?.isSuccess === false) {
          Swal.fire({ icon: 'error', title: 'Save failed', text: res?.message || '' });
          return;
        }
        Swal.fire({ icon: 'success', title: this.isEdit ? 'Updated' : 'Created' });
        this.router.navigate(['/Sales/Return-credit-list']);
      },
      error: err => {
        Swal.fire({ icon: 'error', title: 'Save failed' });
      }
    });
  }

  goList(): void {
    this.router.navigate(['/Sales/Return-credit-list']);
  }
}
