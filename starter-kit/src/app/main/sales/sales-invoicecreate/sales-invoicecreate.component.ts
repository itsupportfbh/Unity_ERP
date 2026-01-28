import { Component, OnDestroy, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { Subject, forkJoin } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import Swal from 'sweetalert2';

import {
  SalesInvoiceService,
  SiCreateLine,
  SiSourceType,
  ApiResponse
} from './sales-invoice.service';

import { TaxCodeService } from 'app/main/master/taxcode/taxcode.service';
import { SalesOrderService } from '../sales-order/sales-order.service';
import { DeliveryOrderService } from '../deliveryorder/deliveryorder.service';
import { ItemsService } from 'app/main/master/items/items.service';
import { ChartofaccountService } from 'app/main/financial/chartofaccount/chartofaccount.service';
import { ArInvoiceService } from 'app/main/financial/AR/Invoice/invoice-service';

/* ========== Local UI types ========== */
interface SimpleItem {
  id: number;
  itemName: string;
  itemCode: string;
  uomName: string;
  uomId: number;
  catagoryName?: string;
}

// UiLine extends SiCreateLine with UI-only fields
type UiLine = SiCreateLine & {
  id?: number;             // server line id (edit mode)
  itemName: string;        // label for UI
  uom?: string | null;     // display UOM
  __new?: boolean;         // unsaved line in edit mode
};

@Component({
  selector: 'app-sales-invoicecreate',
  templateUrl: './sales-invoicecreate.component.html',
  styleUrls: ['./sales-invoicecreate.component.scss']
})
export class SalesInvoicecreateComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();

  // ----- Edit state -----
  isEdit = false;
  siId: number | null = null;
  invoiceNo: string | null = null;

  // ----- UI helpers -----
  sourceTypeOptions = [
    { value: 1 as SiSourceType, label: 'From SO' },
    { value: 2 as SiSourceType, label: 'From DO' }
  ];
  trackById = (_: number, x: any) => x?.id ?? _;
  compareById = (a: any, b: any) => (a != null && b != null ? +a === +b : a === b);
  trackByLine = (idx: number, row: any) => row?.id ?? row?.sourceLineId ?? row?.itemId ?? idx;

  // ----- Header -----
  sourceType: SiSourceType = 1;
  sourceId: number | null = null;
  invoiceDate = new Date().toISOString().slice(0, 10); // yyyy-MM-dd

  // Customer
  customerName: string = '';
  customerId: number | null = null;

  // Remarks (header)
  remarks: string = '';

  // ----- Dropdown data -----
  soList: any[] = [];
  doList: any[] = [];
  taxCodes: any[] = [];
  itemsList: SimpleItem[] = [];
  parentHeadList: any[] = [];

  // ----- Lines & totals -----
  lines: UiLine[] = [];

  subtotal = 0;
  totalDiscount = 0;

  // Total GST (sum of line TaxAmount)
  totalTax = 0;
  grandTotal = 0;
  shipping = 0;
  netTotal = 0;
  total = 0;

  // ----- Customer advance -----
  advanceList: any[] = [];
  selectedAdvanceId: number | null = null;
  advanceApplyAmount = 0;
  advanceTotalApplied = 0;

  constructor(
    private api: SalesInvoiceService,
    private taxCodeService: TaxCodeService,
    private soSrv: SalesOrderService,
    private doSrv: DeliveryOrderService,
    private itemsService: ItemsService,
    private router: Router,
    private route: ActivatedRoute,
    private coaService: ChartofaccountService,
    private arService: ArInvoiceService
  ) {}

  // ============================================================
  // Lifecycle
  // ============================================================
  ngOnInit(): void {
    this.loadAccountHeads();

    this.route.paramMap
      .pipe(takeUntil(this.destroy$))
      .subscribe(pm => {
        const idStr = pm.get('id');
        this.isEdit = !!idStr;
        this.siId = idStr ? +idStr : null;

        // Load static lookups
        forkJoin({
          taxCodes: this.taxCodeService.getTaxCode(),
          soList: this.soSrv.getSOByStatus(3),
          doList: this.doSrv.getAll()
        })
          .pipe(takeUntil(this.destroy$))
          .subscribe({
            next: (bag: any) => {
              this.taxCodes = Array.isArray(bag?.taxCodes?.data) ? bag.taxCodes.data : [];
              this.soList = Array.isArray(bag?.soList?.data) ? bag.soList.data : [];

              const doRaw = Array.isArray(bag?.doList) ? bag.doList : [];
              this.doList = doRaw.map((d: any) => ({
                ...d,
                id: +d.id,
                doNumber: d.doNumber ?? d.DoNumber ?? ''
              }));

              // Load items
              this.itemsService.getAllItem()
                .pipe(takeUntil(this.destroy$))
                .subscribe({
                  next: (ires: any) => {
                    const raw = ires?.data ?? [];
                    this.itemsList = raw.map((item: any) => ({
                      id: Number(item.id ?? item.itemId ?? 0),
                      itemName: item.itemName ?? item.name ?? '',
                      itemCode: item.itemCode ?? '',
                      uomName: item.uomName ?? item.uom ?? '',
                      uomId: Number(item.uomId ?? item.UomId ?? item.uomid ?? 0),
                      catagoryName: item.catagoryName
                    }) as SimpleItem);

                    if (this.isEdit && this.siId) {
                      this.loadForEdit(this.siId);
                    } else {
                      this.resetForCreate();
                    }
                  },
                  error: () =>
                    Swal.fire({ icon: 'error', title: 'Error', text: 'Failed to load items.' })
                });
            },
            error: () =>
              Swal.fire({ icon: 'error', title: 'Error', text: 'Failed to load initial data.' })
          });
      });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  // ============================================================
  // Helpers
  // ============================================================
  private toDateInput(val: string | Date | null): string {
    if (!val) return new Date().toISOString().slice(0, 10);
    const d = typeof val === 'string' ? new Date(val) : val;
    return isNaN(d.getTime()) ? new Date().toISOString().slice(0, 10) : d.toISOString().slice(0, 10);
  }

  private resetForCreate() {
    this.sourceId = null;
    this.invoiceDate = new Date().toISOString().slice(0, 10);

    this.lines = [];

    this.subtotal = 0;
    this.totalDiscount = 0;
    this.totalTax = 0;
    this.grandTotal = 0;
    this.shipping = 0;
    this.netTotal = 0;
    this.total = 0;

    this.customerName = '';
    this.customerId = null;
    this.remarks = '';

    this.advanceList = [];
    this.selectedAdvanceId = null;
    this.advanceApplyAmount = 0;
    this.advanceTotalApplied = 0;
  }

  private isOk(res: any) { return res?.isSuccess ?? res?.success; }

  // ============================================================
  // Tax helpers – Standard-Rated / Zero-Rated / Exempt
  // Tax helpers
  // ============================================================

  /**
   * Normalise any old Tax string (EXCLUSIVE, INCLUSIVE, NO GST, etc.)
   * We only keep:
   *  - 'Standard-Rated'
   *  - 'Zero-Rated'
   *  - 'Exempt'
   */
  private canonicalTaxMode(
    rawMode: any,
    gstPct: number
  ): 'Standard-Rated' | 'Zero-Rated' | 'Exempt' {
    const s = (rawMode ?? '').toString().toUpperCase().trim();

    // New labels
    if (s === 'STANDARD-RATED' || s === 'STANDARD_RATED') return 'Standard-Rated';
    if (s === 'ZERO-RATED' || s === 'ZERO_RATED') return 'Zero-Rated';
    if (s === 'EXEMPT' || s === 'NO GST' || s === 'NO_GST') return 'Exempt';

    // Legacy labels → map (no Inclusive concept now)
    if (s === 'EXCLUSIVE' || s === 'INCLUSIVE') {
      // If GST% > 0, treat as standard-rated, else zero-rated
      return gstPct > 0 ? 'Standard-Rated' : 'Zero-Rated';
    }

    // Fallback based on rate
    if (!gstPct || gstPct === 0) return 'Zero-Rated';
    return 'Standard-Rated';
  }

  /**
   * Core calculation for a line:
   * - raw = qty * price
   * - discountPct is percent
   * - Standard-Rated → GST applies
   * - Zero-Rated / Exempt → GST = 0
   */
 private calcLineAmounts(line: UiLine) {
    const qty = Number(line.qty || 0);
    const price = Number(line.unitPrice || 0);
    const disc = Number(line.discountPct || 0);
    const gst = Number(line.gstPct || 0);
 
    const raw = +(qty * price).toFixed(2);               // qty * price
    const discAmount = +(raw * (disc / 100)).toFixed(2); // discount value
    const baseAfterDisc = +(raw - discAmount).toFixed(2);
 
    const mode = this.canonicalTaxMode(line.tax, gst);
 
    // GST applies only for Standard-Rated & gst > 0
    const rate = mode === 'Standard-Rated' && gst > 0 ? (gst / 100) : 0;
 
    let net = baseAfterDisc;
    let tax = 0;
    let gross = baseAfterDisc;
 
    if (rate > 0) {
      tax = +(net * rate).toFixed(2);
      gross = +(net + tax).toFixed(2);
    } else {
      tax = 0;
      gross = net;
    }
 
    // Persist for UI
    line.tax = mode;
    line.lineAmount = gross;
    (line as any).taxAmount = tax;
 
    return { net, tax, gross, raw, discAmount };
  }

  // FRONTEND TAX → TAXCODEID MAPPING (no Inclusive)
  private mapTaxToCode(tax: string | null | undefined): number | null {
    const key = (tax || '').toString().toUpperCase();

    if (key === 'STANDARD-RATED' || key === 'STANDARD_RATED') return 1;
    if (key === 'ZERO-RATED' || key === 'ZERO_RATED') return 2;
    if (key === 'EXEMPT' || key === 'NO GST' || key === 'NO_GST') return 3;

    // Legacy fallbacks
    if (key === 'EXCLUSIVE' || key === 'INCLUSIVE') return 1;

    return null;
  }

  private applyTaxCode(line: UiLine): void {
    line.taxCodeId = this.mapTaxToCode(line.tax);
  }

  // ============================================================
  // Load for Edit + customer name
  // ============================================================
  private refreshCustomerFromSource(hdr?: any): void {
    if (hdr) {
      const fromHdr =
        hdr.customerName ||
        hdr.CustomerName ||
        hdr.customer ||
        hdr.customer_name ||
        hdr.bpName ||
        hdr.BpName;

      if (fromHdr) {
        this.customerName = fromHdr;
        return;
      }
    }

    if (this.sourceType === 1 && this.sourceId) {
      const so = this.soList.find((s: any) =>
        +s.id === +this.sourceId ||
        +s.soId === +this.sourceId ||
        +s.SalesOrderId === +this.sourceId
      );

      this.customerName =
        so?.customerName ||
        so?.CustomerName ||
        so?.customer ||
        so?.customer_name ||
        so?.bpName ||
        so?.BpName ||
        '';

      this.customerId =
        so?.customerId ??
        so?.CustomerId ??
        null;

    } else if (this.sourceType === 2 && this.sourceId) {
      const d = this.doList.find((x: any) =>
        +x.id === +this.sourceId ||
        +x.doId === +this.sourceId ||
        +x.DeliveryOrderId === +this.sourceId
      );

      this.customerName =
        d?.customerName ||
        d?.CustomerName ||
        d?.customer ||
        d?.customer_name ||
        d?.bpName ||
        d?.BpName ||
        '';

      this.customerId =
        d?.customerId ??
        d?.CustomerId ??
        null;

    } else {
      this.customerName = '';
      this.customerId = null;
    }
  }

  private loadForEdit(id: number) {
    this.api.get(id).subscribe({
      next: (res: ApiResponse) => {
        if (!this.isOk(res)) {
          Swal.fire({ icon: 'error', title: 'Error', text: res?.message || 'Failed to load invoice.' });
          return;
        }

        const data = res.data || {};
        const hdr = data.header || {};
        const rows = data.lines || [];

        this.invoiceNo = hdr.invoiceNo || null;
        this.invoiceDate = this.toDateInput(hdr.invoiceDate);
        this.sourceType = (hdr.sourceType ?? 1) as 1 | 2;

        this.sourceId = this.sourceType === 1
          ? (hdr.soId ?? hdr.SoId ?? hdr.salesOrderId ?? null)
          : (hdr.doId ?? hdr.DoId ?? hdr.deliveryOrderId ?? null);

        this.subtotal = Number(hdr.subtotal ?? hdr.Subtotal ?? 0);
        this.shipping = Number(hdr.shippingCost ?? hdr.ShippingCost ?? 0);
        this.total = Number(hdr.total ?? hdr.Total ?? 0);
        // header total tax if needed: hdr.taxAmount
        this.totalTax = Number(hdr.taxAmount ?? hdr.TaxAmount ?? 0);
        this.remarks = hdr.remarks ?? hdr.Remarks ?? '';

        this.refreshCustomerFromSource(hdr);

        this.lines = (rows as any[]).map(r => {
          const gstPct = Number(r.gstPct ?? 0);
          const mode = this.canonicalTaxMode(r.tax, gstPct);
          const line: UiLine = {
            id: Number(r.id ?? 0),
            sourceLineId: r.sourceLineId ?? null,
            itemId: r.itemId ?? null,
            itemName: r.itemName ?? '',
            uom: r.uom ?? r.uomName ?? null,
            qty: Number(r.qty || 0),
            unitPrice: Number(r.unitPrice || 0),
            discountPct: Number(r.discountPct || 0),
            gstPct: gstPct,
            tax: mode,
            taxCodeId: r.taxCodeId ?? null,
            lineAmount: r.lineAmount,
            taxAmount: r.taxAmount ?? 0,   // from backend
            description: r.description ?? r.itemName ?? '',
            budgetLineId: r.budgetLineId
          };

          this.applyTaxCode(line);
          return line;
        });

        this.reconcileLinesWithItems();
        this.recalc();

        // for edit, you could also load applied advances if needed
      },
      error: () =>
        Swal.fire({ icon: 'error', title: 'Error', text: 'Failed to load invoice.' })
    });
  }

  // ============================================================
  // Header controls
  // ============================================================
  onSourceTypeChanged(): void {
    if (this.isEdit) return;
    this.resetForCreate();
  }

  onSoChanged(val: any): void {
    if (this.isEdit) return;

    const id = typeof val === 'number' ? val : val?.id;
    this.sourceId = id || null;

    if (!id) {
      this.customerName = '';
      this.customerId = null;
      this.lines = [];
      this.advanceList = [];
      this.selectedAdvanceId = null;
      this.advanceApplyAmount = 0;
      this.advanceTotalApplied = 0;
      this.recalc();
      return;
    }

    const so = this.soList.find((s: any) => +s.id === +id);

    this.customerName =
      so?.customerName ||
      so?.CustomerName ||
      so?.customer ||
      so?.customer_name ||
      '';

    this.customerId =
      so?.customerId ??
      so?.CustomerId ??
      null;

    this.loadAvailableAdvances();
    this.loadSourceLines();
  }

  onDoChanged(val: any): void {
    if (this.isEdit) return;

    const id = typeof val === 'number' ? val : val?.id;
    this.sourceId = id || null;

    if (!id) {
      this.customerName = '';
      this.customerId = null;
      this.lines = [];
      this.advanceList = [];
      this.selectedAdvanceId = null;
      this.advanceApplyAmount = 0;
      this.advanceTotalApplied = 0;
      this.recalc();
      return;
    }

    const d = this.doList.find((x: any) => +x.id === +id);

    this.customerName =
      d?.customerName ||
      d?.CustomerName ||
      d?.customer ||
      d?.customer_name ||
      '';

    this.customerId =
      d?.customerId ??
      d?.CustomerId ??
      null;

    this.loadAvailableAdvances();
    this.loadSourceLines();
  }

  // ============================================================
  // Customer Advances
  // ============================================================
  private loadAvailableAdvances(): void {
    this.advanceList = [];
    this.selectedAdvanceId = null;
    this.advanceApplyAmount = 0;
    this.advanceTotalApplied = 0;

    if (!this.customerId) return;

    this.arService.getOpenAdvances(
      this.customerId,
      this.sourceType === 1 ? this.sourceId : null
    )
    .subscribe({
      next: (res: any) => {
        this.advanceList = Array.isArray(res)
          ? res
          : (res?.data || []);
      },
      error: _ => {
        this.advanceList = [];
      }
    });
  }

  onAdvanceSelected(): void {
    const adv = this.advanceList.find(a => +a.id === +this.selectedAdvanceId);
    if (!adv) {
      this.advanceApplyAmount = 0;
      this.advanceTotalApplied = 0;
      this.updateNetTotal();
      return;
    }

    const available = Number(adv.balanceAmount ?? adv.BalanceAmount ?? 0);
    const gross = this.grandTotal + Number(this.shipping || 0);

    const max = Math.max(0, Math.min(available, gross));
    this.advanceApplyAmount = +max.toFixed(2);
    this.advanceTotalApplied = this.advanceApplyAmount;
    this.updateNetTotal();
  }

  onAdvanceAmountChanged(): void {
    if (!this.selectedAdvanceId) {
      this.advanceApplyAmount = 0;
      this.advanceTotalApplied = 0;
      this.updateNetTotal();
      return;
    }

    const adv = this.advanceList.find(a => +a.id === +this.selectedAdvanceId);
    if (!adv) {
      this.advanceApplyAmount = 0;
      this.advanceTotalApplied = 0;
      this.updateNetTotal();
      return;
    }

    let val = Number(this.advanceApplyAmount || 0);
    if (val < 0) val = 0;

    const available = Number(adv.balanceAmount ?? adv.BalanceAmount ?? 0);
    const gross = this.grandTotal + Number(this.shipping || 0);

    const max = Math.max(0, Math.min(available, gross));
    if (val > max) val = max;

    this.advanceApplyAmount = +val.toFixed(2);
    this.advanceTotalApplied = this.advanceApplyAmount;
    this.updateNetTotal();
  }

  // ============================================================
  // Items / lines helpers
  // ============================================================
  private reconcileLinesWithItems() {
    if (!this.itemsList?.length || !this.lines?.length) return;
    this.lines = this.lines.map(l => {
      const it = this.itemsList.find(ii => +ii.id === +l.itemId!);
      const prevName = l.itemName || '';
      const newItemName = it?.itemName ?? l.itemName;

      const shouldOverwriteDesc =
        !l.description ||
        l.description.trim().toLowerCase() === prevName.trim().toLowerCase();

      const gstPct = Number(l.gstPct || 0);
      const mode = this.canonicalTaxMode(l.tax, gstPct);

      const line: UiLine = {
        ...l,
        itemName: newItemName ?? l.itemName,
        uom: it?.uomName ?? l.uom ?? null,
        description: shouldOverwriteDesc
          ? (newItemName ?? l.itemName ?? '')
          : l.description,
        tax: mode,
        gstPct
      };

      this.applyTaxCode(line);
      return line;
    });
  }

  addLine() {
    const row: UiLine = {
      sourceLineId: null,
      itemId: 0,
      itemName: '',
      uom: null,
      qty: null as any,
      unitPrice: 0,
      discountPct: 0,
      gstPct: 0,
      tax: 'Zero-Rated',      // default 0% GST
      taxCodeId: null,
      description: '',
      lineAmount: 0,
      taxAmount: 0,
      budgetLineId: 0,
    };
    if (this.isEdit) row.__new = true;
    this.applyTaxCode(row);
    this.lines.push(row);
    this.recalc();
  }

  onItemChanged(index: number, itemId: number | null) {
    const line = this.lines[index];
    if (!line) return;

    const prevName = line.itemName || '';
    if (!itemId) {
      line.itemId = 0;
      line.itemName = '';
      line.uom = null;
      this.recalc();
      return;
    }

    const it = this.itemsList.find(x => +x.id === +itemId);
    line.itemId = +itemId;
    line.itemName = it?.itemName ?? line.itemName ?? '';
    line.uom = it?.uomName ?? line.uom ?? null;

    if (!line.description || line.description.trim().toLowerCase() === prevName.trim().toLowerCase()) {
      line.description = line.itemName;
    }

    this.recalc();
  }

  loadSourceLines(): void {
    if (this.isEdit) return;
    if (!this.sourceId) return;

    this.api.sourceLines(this.sourceType, this.sourceId)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (res: ApiResponse) => {
          if (!this.isOk(res)) {
            Swal.fire({ icon: 'error', title: 'Error', text: res?.message || 'Failed to load source lines.' });
            return;
          }
          const rows = Array.isArray(res.data) ? res.data : [];
          this.lines = rows.map((r: any) => {
            const gstPct = Number(r.gstPct ?? 0);
            const mode = this.canonicalTaxMode(r.tax, gstPct);
            const line: UiLine = {
              sourceLineId: r.sourceLineId,
              itemId: r.itemId,
              itemName: r.itemName,
              uom: r.uomName ?? null,
              qty: r.qtyOpen,
              unitPrice: r.unitPrice,
              discountPct: r.discountPct ?? 0,
              gstPct: gstPct,
              tax: mode,
              taxCodeId: r.taxCodeId ?? null,
              description: r.itemName,
              budgetLineId: r.budgetLineId,
              lineAmount: 0,
              taxAmount: 0
            };
            this.applyTaxCode(line);
            return line;
          }) as UiLine[];

          this.reconcileLinesWithItems();
          this.recalc();
        },
        error: () =>
          Swal.fire({ icon: 'error', title: 'Error', text: 'Failed to load source lines.' })
      });
  }

  // ============================================================
  // Totals
  // ============================================================
  lineAmount(r: SiCreateLine): number {
    return this.calcLineAmounts(r as UiLine).gross;
  }

  lineTaxAmount(r: SiCreateLine): number {
    return this.calcLineAmounts(r as UiLine).tax;
  }

  recalc(): void {
    let subtotal = 0;
    let totalTax = 0;
    let totalDiscount = 0;
    let grand = 0;

    for (const l of this.lines) {
      const { tax, gross, raw, discAmount } = this.calcLineAmounts(l as UiLine);
      subtotal += raw;
      totalTax += tax;
      totalDiscount += discAmount;
      grand += gross;
    }

    this.subtotal = +subtotal.toFixed(2);
    this.totalTax = +totalTax.toFixed(2);
    this.totalDiscount = +totalDiscount.toFixed(2);
    this.grandTotal = +grand.toFixed(2);

    this.updateNetTotal();
  }

  updateNetTotal(): void {
    const ship = Number(this.shipping || 0);
    const adv = Number(this.advanceTotalApplied || 0);

    const gross = this.grandTotal + ship;
    let net = gross - adv;
    if (net < 0) net = 0;

    this.netTotal = +net.toFixed(2);
    this.total = this.netTotal;
  }

  // ============================================================
  // Edit: persist lines in place
  // ============================================================
  onCellChanged(line: UiLine) {
    const { gross, tax } = this.calcLineAmounts(line);
    const qty = Number(line.qty || 0);
    const price = Number(line.unitPrice || 0);
    const disc = Number(line.discountPct || 0);

    this.applyTaxCode(line);

    if (!this.isEdit || !line?.id) {
      this.recalc();
      return;
    }

    this.api.updateLine(line.id, {
      qty,
      unitPrice: price,
      discountPct: disc,
      gstPct: line.gstPct,
      tax: line.tax,
      taxCodeId: line.taxCodeId ?? null,
      lineAmount: gross,
      taxAmount: tax,                        // 🔹 send line tax to backend
      description:
        (line.description && line.description.trim().length > 0)
          ? line.description
          : (line.itemName ?? null),
      budgetLineId: line.budgetLineId != null ? Number(line.budgetLineId) : null
    }).subscribe({
      next: (r) => {
        if (!this.isOk(r)) {
          Swal.fire({
            icon: 'warning',
            title: 'Line update failed',
            text: (r as any)?.message || ''
          });
        }
        this.recalc();
      },
      error: () => {
        Swal.fire({
          icon: 'error',
          title: 'Failed to update line'
        });
        this.recalc();
      }
    });
  }

  saveNewLines(): void {
    if (!this.isEdit || !this.siId) {
      return;
    }

    const pending = this.lines.filter(l => l.__new && Number(l.qty || 0) > 0);
    if (!pending.length) {
      Swal.fire({ icon: 'info', title: 'Nothing to add' });
      return;
    }

    let i = 0;
    let ok = 0;
    let fail = 0;

    const next = () => {
      if (i >= pending.length) {
        Swal.fire({
          icon: fail ? 'warning' : 'success',
          title: fail ? 'Partial' : 'Lines added',
          text: `${ok} added${fail ? `, ${fail} failed` : ''}`
        });

        if (this.siId) {
          this.loadForEdit(this.siId);
        }
        return;
      }

      const l = pending[i++];
      const { gross, tax } = this.calcLineAmounts(l);

      const qty = Number(l.qty || 0);
      const price = Number(l.unitPrice || 0);
      const disc = Number(l.discountPct || 0);

      this.applyTaxCode(l);

      this.api.addLine(this.siId!, {
        sourceLineId: l.sourceLineId ?? null,
        itemId: l.itemId ?? 0,
        itemName: l.itemName ?? null,
        uom: l.uom ?? null,
        qty,
        unitPrice: price,
        discountPct: disc,
        gstPct: l.gstPct,
        tax: l.tax,
        taxAmount: tax,                 // 🔹 new
        taxCodeId: l.taxCodeId ?? null,
        lineAmount: gross,
        description:
          (l.description && l.description.trim().length > 0)
            ? l.description
            : (l.itemName ?? null),
        budgetLineId: l.budgetLineId != null ? Number(l.budgetLineId) : null
      }).subscribe({
        next: (r) => {
          if (this.isOk(r)) {
            ok++;
          } else {
            fail++;
          }
          next();
        },
        error: () => {
          fail++;
          next();
        }
      });
    };

    next();
  }

  removeLine(ix: number): void {
    const row = this.lines[ix];

    if (!this.isEdit || !row?.id) {
      this.lines.splice(ix, 1);
      this.recalc();
      return;
    }

    Swal.fire({
      icon: 'warning',
      title: 'Remove this line?',
      showCancelButton: true,
      confirmButtonText: 'Remove',
      confirmButtonColor: '#d33'
    }).then(res => {
      if (!res.isConfirmed) return;
      this.api.removeLine(row.id!).subscribe({
        next: (r) => {
          if (!this.isOk(r)) {
            Swal.fire({ icon: 'error', title: 'Failed', text: (r as any)?.message || 'Remove failed' });
            return;
          }
          this.lines.splice(ix, 1);
          this.recalc();
        },
        error: () =>
          Swal.fire({ icon: 'error', title: 'Failed to remove line' })
      });
    });
  }

  // ============================================================
  // Save
  // ============================================================
  save(): void {
    if (!this.invoiceDate) {
      Swal.fire({ icon: 'warning', title: 'Invoice Date is required' });
      return;
    }

    // CREATE
    if (!this.isEdit) {
      if (!this.sourceId || this.lines.length === 0) {
        Swal.fire({ icon: 'warning', title: 'Missing data', text: 'Select a source and add at least one line.' });
        return;
      }

      this.recalc();

      const advanceAdjustments =
        (this.selectedAdvanceId && this.advanceApplyAmount > 0)
          ? [{ advanceId: this.selectedAdvanceId, amount: this.advanceApplyAmount }]
          : [];

      const req: any = {
        sourceType: this.sourceType,
        soId: this.sourceType === 1 ? this.sourceId : null,
        doId: this.sourceType === 2 ? this.sourceId : null,
        invoiceDate: this.invoiceDate,
        subtotal: this.subtotal,
        shippingCost: Number(this.shipping || 0),
        taxAmount: this.totalTax,              // 🔹 header total GST
        total: this.total,
        remarks: this.remarks || null,
        advanceAdjustments,
        lines: this.lines.map(l => {
          const { gross, tax } = this.calcLineAmounts(l);

          this.applyTaxCode(l);

          return {
            sourceLineId: l.sourceLineId ?? null,
            itemId: l.itemId ?? 0,
            itemName: l.itemName ?? null,
            uom: l.uom ?? null,
            qty: Number(l.qty || 0),
            unitPrice: Number(l.unitPrice || 0),
            discountPct: Number(l.discountPct || 0),
            gstPct: l.gstPct,
            tax: l.tax,
            taxAmount: tax,                  // 🔹 per line
            taxCodeId: l.taxCodeId ?? null,
            lineAmount: gross,
            description:
              (l.description && l.description.trim().length > 0)
                ? l.description
                : (l.itemName ?? null),
            budgetLineId: l.budgetLineId != null ? Number(l.budgetLineId) : null
          } as SiCreateLine;
        }),
        advanceId: this.selectedAdvanceId || null,
  advanceApplyAmount:
    this.advanceApplyAmount && this.advanceApplyAmount > 0
      ? this.advanceApplyAmount
      : null
      };

      this.api.create(req)
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: (res: ApiResponse) => {
            if (this.isOk(res)) {
              Swal.fire({
                icon: 'success',
                title: 'Created',
                text: `Invoice created successfully`
              });
              this.router.navigate(['/Sales/Sales-Invoice-list']);
            } else {
              Swal.fire({ icon: 'error', title: 'Error', text: (res as any)?.message || 'Failed to create' });
            }
          },
          error: () =>
            Swal.fire({ icon: 'error', title: 'Error', text: 'Failed to create invoice.' })
        });
      return;
    }

    // EDIT: header update (for now only date)
    if (!this.siId) return;

    this.api.updateHeader(this.siId, { invoiceDate: this.invoiceDate })
      .subscribe({
        next: (r) => {
          if (this.isOk(r)) {
            Swal.fire({ icon: 'success', title: 'Header updated' });
          } else {
            Swal.fire({ icon: 'error', title: 'Update failed', text: (r as any)?.message || '' });
          }
        },
        error: () =>
          Swal.fire({ icon: 'error', title: 'Failed to update header' })
      });
  }

  netPortion(line: UiLine): number {
    const { net } = this.calcLineAmounts(line);
    return +net.toFixed(2);
  }

  taxPortion(line: UiLine): number {
    const { tax } = this.calcLineAmounts(line);
    return +tax.toFixed(2);
  }

  // ============================================================
  // Navigation & misc
  // ============================================================
  goSIList() {
    this.router.navigate(['/Sales/Sales-Invoice-list']);
  }

  autoResize(event: Event) {
    const textarea = event.target as HTMLTextAreaElement;
    if (!textarea) return;

    textarea.style.height = 'auto';
    textarea.style.height = textarea.scrollHeight + 'px';
    textarea.style.height = 'auto';
    textarea.style.height = textarea.scrollHeight + 'px';
  }

  loadAccountHeads(): void {
    this.coaService.getAllChartOfAccount().subscribe((res: any) => {
      const data = (res?.data || []).filter((x: any) => x.isActive === true);
      this.parentHeadList = data.map((head: any) => ({
        value: Number(head.id),
        label: this.buildFullPath(head, data)
      }));
    });
  }

  private buildFullPath(item: any, all: any[]): string {
    let path = item.headName;
    let current = all.find((x: any) => x.headCode === item.parentHead);
    while (current) {
      path = `${path}`;
      current = all.find((x: any) => x.headCode === current.parentHead);
    }
    return path;
  }
}
