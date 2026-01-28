import { Component, HostListener, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { forkJoin } from 'rxjs';
import Swal from 'sweetalert2';

import { CustomerMasterService } from 'app/main/businessPartners/customer-master/customer-master.service';
import { QuotationsService } from '../../quotations/quotations.service';
import { CountriesService } from 'app/main/master/countries/countries.service';
import { SalesOrderService } from '../sales-order.service';

/* ================= Types ================= */
type WarehouseInfo = {
  warehouseId: number;
  warehouseName: string;
  onHand: number;
  reserved: number;
  available: number;
};

type WarehouseMaster = { id: number; warehouseName: string };

// tax mode
type LineTaxMode = 'Standard-Rated' | 'Zero-Rated' | 'Exempt';

type SoLine = {
  __id?: number;

  item?: string;
  itemId?: number;
  uom?: string;

  description?: string;

  quantity?: number | string;
  unitPrice?: number | string;

  discount?: number | string;
  discountType?: 'PCT' | 'VAL';

  tax?: LineTaxMode;

  lineGross?: number;
  lineNet?: number;
  lineTax?: number;
  total?: number;
  lineDiscount?: number;

  __origQty?: number;
  __origGross?: number;
  __origNet?: number;
  __origTax?: number;
  __origTotal?: number;
  __origDiscount?: number;

  warehouses?: WarehouseInfo[];
  dropdownOpen?: '' | 'item' | 'tax';
  filteredOptions?: any[];
};

type PreviewPiece = {
  warehouseId?: number;
  supplierId?: number;
  binId?: number | null;
  warehouseName?: string | null;
  supplierName?: string | null;
  binName?: string | null;
  qty: number;
};

type PreviewLine = {
  itemId: number;
  requestedQty: number;
  allocatedQty: number;
  fullyAllocated: boolean;
  allocations: PreviewPiece[];
};

@Component({
  selector: 'app-sales-order-create',
  templateUrl: './sales-order-create.component.html',
  styleUrls: ['./sales-order-create.component.scss']
})
export class SalesOrderCreateComponent implements OnInit {

  editMode = false;
  private routeId: number | null = null;

  userId: any;

  soHdr: any = {
    id: 0,
    quotationNo: '',
    customerId: 0,
    requestedDate: '',
    deliveryDate: '',

    // ✅ NEW
    deliveryTo: '',
    remarks: '',

    shipping: 0,
    discount: 0,
    gstPct: 0,
    taxAmount: 0,
    subTotal: 0,
    grandTotal: 0,
    status: 1,
    statusText: 'Pending'
  };

  customers: any[] = [];
  quotationList: any[] = [];
  items: any[] = [];
  taxCodes: any[] = [];

  warehousesMaster: WarehouseMaster[] = [];
  selectedWarehouseId: number | null = null;
  selectedWarehouseName = '';

  soLines: SoLine[] = [];

  submitted = false;

  discountDisplayMode: 'PCT' | 'VAL' = 'PCT';

  searchTexts: { [k: string]: string } = {
    quotationNo: '',
    customer: '',
    warehouse: ''
  };

  dropdownOpen: { [k: string]: boolean } = {
    quotationNo: false,
    customer: false,
    warehouse: false
  };

  filteredLists: { [k: string]: any[] } = {
    quotationNo: [],
    customer: [],
    warehouse: []
  };

  requiredKeys: Array<'quotationNo' | 'customer'> = ['quotationNo', 'customer'];

  showPreview = false;
  previewData: PreviewLine[] = [];

  countries: any[] = [];

  todayStr = this.toInputDate(new Date());

  constructor(
    private router: Router,
    private route: ActivatedRoute,
    private customerSvc: CustomerMasterService,
    private quotationSvc: QuotationsService,
    private countriesSvc: CountriesService,
    private salesOrderService: SalesOrderService
  ) {
    this.userId = localStorage.getItem('id');
  }

  ngOnInit(): void {
    const idParam = this.route.snapshot.paramMap.get('id');
    this.editMode = !!idParam;
    this.routeId = idParam ? Number(idParam) : null;

    if (!this.editMode) {
      this.soHdr.requestedDate = this.toInputDate(new Date());
    }

    // countries (GST)
    this.countriesSvc.getCountry().subscribe((res: any) => {
      this.countries = (res?.data ?? []).map((c: any) => ({
        id: Number(c.id ?? c.Id),
        countryName: String(c.countryName ?? c.CountryName ?? '').trim(),
        gstPercentage: Number(c.gstPercentage ?? c.GSTPercentage ?? 0),
      }));
    });

    // quotations + customers + existing SO
    forkJoin({
      quotations: this.quotationSvc.getAll(),
      customers: this.customerSvc.GetAllCustomerDetails(),
      salesOrders: this.salesOrderService.getSO(),
    }).subscribe((res: any) => {
      const allQuotations = res.quotations?.data ?? [];
      const allCustomers = res.customers?.data ?? [];
      const allSalesOrders = res.salesOrders?.data ?? [];

      const usedQuotationNos = allSalesOrders
        .map((so: any) => so.quotationNo)
        .filter((no: any) => no);

      this.quotationList = allQuotations.filter(
        (q: any) => !usedQuotationNos.includes(q.id) && !usedQuotationNos.includes(q.number)
      );

      this.customers = allCustomers;
      this.filteredLists.quotationNo = [...this.quotationList];
      this.filteredLists.customer = [...this.customers];
      this.filteredLists.warehouse = [...this.warehousesMaster];

      if (this.editMode && this.routeId) {
        this.loadSOForEdit(this.routeId);
      }
    });
  }

  /* ======== helpers for amounts ======== */
  private round2 = (v: number) => Math.round((v + Number.EPSILON) * 100) / 100;

  private canonicalTaxMode(rawMode: any, gstPct: number): LineTaxMode {
    const s = (rawMode ?? '').toString().toUpperCase().trim();

    if (s === 'STANDARD-RATED' || s === 'STANDARD_RATED' || s === 'EXCLUSIVE') return 'Standard-Rated';
    if (s === 'ZERO-RATED' || s === 'ZERO_RATED' || s === 'INCLUSIVE') return 'Zero-Rated';
    if (s === 'EXEMPT' || s === 'NO GST' || s === 'NO_GST') return 'Exempt';

    return gstPct === 9 ? 'Standard-Rated' : 'Zero-Rated';
  }

  private calcAmounts(
    qty: number,
    unitPrice: number,
    discountPct: number,
    taxMode: string | null | undefined,
    gstPct: number
  ): { gross: number; net: number; tax: number; total: number; discountAmt: number } {

    const sub = qty * unitPrice;
    const discPct = discountPct || 0;

    let discountAmt = sub * discPct / 100;
    if (discountAmt < 0) discountAmt = 0;
    if (discountAmt > sub) discountAmt = sub;

    let afterDisc = sub - discountAmt;
    if (afterDisc < 0) afterDisc = 0;

    const mode = this.canonicalTaxMode(taxMode, gstPct);
    const rate = (mode === 'Standard-Rated' ? gstPct : 0) / 100;

    let net = afterDisc, tax = 0, tot = afterDisc;

    if (mode === 'Standard-Rated' && rate > 0) {
      net = afterDisc;
      tax = net * rate;
      tot = net + tax;
    } else {
      net = afterDisc;
      tax = 0;
      tot = afterDisc;
    }

    return {
      gross: this.round2(sub),
      net: this.round2(net),
      tax: this.round2(tax),
      total: this.round2(tot),
      discountAmt: this.round2(discountAmt)
    };
  }

  private enforceTaxModesByGst() {
    const gst = Number(this.soHdr.gstPct || 0);
    if (gst !== 9) {
      this.soLines.forEach(l => { l.tax = 'Zero-Rated'; });
    }
  }

  /* ============ Load SO (Edit) ============ */
  private loadSOForEdit(id: number) {
    this.salesOrderService.getSOById(id).subscribe({
      next: (res) => {
        const head = res?.data || {};

        this.soHdr.id = head.id;
        this.soHdr.quotationNo = head.quotationNo;
        this.soHdr.customerId = head.customerId;
        this.searchTexts['quotationNo'] = head.number || head.quotationNo?.toString() || '';
        this.searchTexts['customer'] = head.customerName || '';

        this.soHdr.requestedDate = this.toInputDate(head.requestedDate);
        this.soHdr.deliveryDate  = this.toInputDate(head.deliveryDate);

        // ✅ NEW
        this.soHdr.deliveryTo = head.deliveryTo ?? head.DeliveryTo ?? '';
        this.soHdr.remarks    = head.remarks    ?? head.Remarks    ?? '';

        this.soHdr.shipping = Number(head.shipping ?? 0);
        this.soHdr.discount = Number(head.discount ?? 0);
        this.soHdr.gstPct   = Number(head.gstPct ?? 0);
        this.soHdr.taxAmount = Number(head.taxAmount ?? head.TaxAmount ?? 0);
        this.soHdr.subTotal  = Number(head.subtotal ?? head.Subtotal ?? 0);
        this.soHdr.grandTotal = Number(head.grandTotal ?? head.GrandTotal ?? 0);

        this.soHdr.status   = head.status ?? 1;
        this.soHdr.statusText = this.mapStatusText(this.soHdr.status);

        const gst = Number(this.soHdr.gstPct || 0);
        const lines = (head.lineItems ?? []) as any[];

        this.soLines = lines.map((l: any) => {
          const qty   = Number(l.quantity ?? 0);
          const price = Number(l.unitPrice ?? 0);
          const mode  = this.canonicalTaxMode(l.tax, gst);
          const totalDb = Number(l.total ?? 0);
          const sub  = qty * price;

          let discAmt = 0;
          if (sub > 0) {
            if (mode === 'Standard-Rated') {
              const rate = gst / 100;
              const netFromTotal = rate > 0 ? totalDb / (1 + rate) : totalDb;
              discAmt = sub - netFromTotal;
            } else {
              discAmt = sub - totalDb;
            }
            if (discAmt < 0) discAmt = 0;
            if (discAmt > sub) discAmt = sub;
          }

          const discPct = sub > 0 ? (discAmt * 100) / sub : 0;
          const amt = this.calcAmounts(qty, price, discPct, mode, gst);

          return {
            __id: Number(l.id || l.Id || 0) || undefined,

            item: l.itemName || l.item || '',
            itemId: Number(l.itemId ?? 0) || undefined,
            uom: l.uom || l.uomName || '',

            description: l.description ?? l.Description ?? '',

            quantity: qty,
            unitPrice: price,

            discount: this.round2(discPct),
            discountType: 'PCT',

            tax: mode,

            lineGross: amt.gross,
            lineNet:   amt.net,
            lineTax:   amt.tax,
            total:     amt.total,
            lineDiscount: this.round2(discAmt),

            __origQty: qty,
            __origGross: amt.gross,
            __origNet:   amt.net,
            __origTax:   amt.tax,
            __origTotal: amt.total,
            __origDiscount: this.round2(discAmt),

            warehouses: [],
            dropdownOpen: '',
            filteredOptions: []
          } as SoLine;
        });

        this.enforceTaxModesByGst();
        this.filteredLists.warehouse = [...this.warehousesMaster];
        this.recalcTotals();
      },
      error: (err) => {
        Swal.fire({ icon: 'error', title: 'Error', text: 'Failed to load Sales Order.' });
        console.error(err);
      }
    });
  }

  private mapStatusText(v: any): string {
    const n = Number(v);
    return n === 0 ? 'Draft' : n === 1 ? 'Pending' : n === 2 ? 'Approved' : n === 3 ? 'Rejected' : 'Unknown';
  }

  private toInputDate(d: any): string {
    if (!d) return '';
    const dt = new Date(d);
    if (isNaN(dt.getTime())) return '';
    const yyyy = dt.getFullYear();
    const mm = String(dt.getMonth() + 1).padStart(2, '0');
    const dd = String(dt.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
  }

  isEmpty(v: any): boolean {
    return (v ?? '').toString().trim() === '';
  }

  toggleDropdown(field: 'quotationNo' | 'customer' | 'warehouse', open?: boolean) {
    this.dropdownOpen[field] = open !== undefined ? open : !this.dropdownOpen[field];
    if (field === 'quotationNo') {
      this.filteredLists[field] = [...this.quotationList];
    } else if (field === 'customer') {
      this.filteredLists[field] = [...this.customers];
    } else {
      this.filteredLists[field] = [...this.warehousesMaster];
    }
  }

  filter(field: 'quotationNo' | 'customer' | 'warehouse') {
    const q = (this.searchTexts[field] || '').toLowerCase();
    if (field === 'quotationNo') {
      this.filteredLists[field] = this.quotationList.filter(x => (x.number || '').toLowerCase().includes(q));
    } else if (field === 'customer') {
      this.filteredLists[field] = this.customers.filter(x => (x.customerName || '').toLowerCase().includes(q));
    } else {
      this.filteredLists[field] = this.warehousesMaster.filter(x =>
        (x.warehouseName || '').toLowerCase().includes(q) || String(x.id).includes(q));
    }
  }

  /* ============ Header select ============ */
  select(field: 'quotationNo' | 'customer', item: any) {
    if (this.editMode) return;

    if (field === 'quotationNo') {
      this.soHdr.quotationNo = item.id;
      this.searchTexts['quotationNo'] = item.number ?? '';
      this.searchTexts['customer'] = item.customerName ?? '';

      const match = (this.customers ?? []).find((c: any) =>
        (c.customerName ?? c.name ?? '').toLowerCase() === (item.customerName ?? '').toLowerCase()
      );
      this.soHdr.customerId = match?.customerId ?? this.soHdr.customerId ?? 0;

      this.salesOrderService.GetByQuatitonDetails(this.soHdr.quotationNo).subscribe((res: any) => {
        const head = res?.data || res || {};
        const lines = (head?.lines ?? []) as any[];

        this.soHdr.deliveryDate = this.toInputDate(head?.deliveryDate ?? head?.DeliveryDate);

        // ✅ optional: take from quotation if you have it
        this.soHdr.deliveryTo = (head?.deliveryTo ?? head?.DeliveryTo ?? this.soHdr.deliveryTo ?? '');
        this.soHdr.remarks    = (head?.remarks ?? head?.Remarks ?? this.soHdr.remarks ?? '');

        this.soHdr.gstPct = Number(head?.gstPct ?? head?.gst ?? 0);
        const gst = Number(this.soHdr.gstPct || 0);

        this.soLines = lines.map(l => {
          const wh: WarehouseInfo[] = Array.isArray(l.warehouses)
            ? l.warehouses
            : (l.warehousesJson ? safeJsonParse<WarehouseInfo[]>(l.warehousesJson, []) : []);

          const qty      = Number(l.qty ?? l.quantity ?? 0);
          const price    = Number(l.unitPrice ?? 0);
          const discPct  = Number(l.discountPct ?? l.discount ?? 0);
          const mode     = this.canonicalTaxMode(l.taxMode ?? l.tax, gst);

          const amt = this.calcAmounts(qty, price, discPct, mode, gst);

          return {
            __id: undefined,
            item: l.itemName,
            itemId: l.itemId,
            uom: l.uomName ?? '',
            description: (l.description ?? l.Description ?? '').toString(),
            quantity: qty,
            unitPrice: price,
            discount: discPct,
            discountType: 'PCT',
            tax: mode,
            lineGross: amt.gross,
            lineNet:   amt.net,
            lineTax:   amt.tax,
            total:     amt.total,
            lineDiscount: amt.discountAmt,
            __origQty: qty,
            __origGross: amt.gross,
            __origNet:   amt.net,
            __origTax:   amt.tax,
            __origTotal: amt.total,
            __origDiscount: amt.discountAmt,
            warehouses: wh,
            dropdownOpen: '',
            filteredOptions: []
          } as SoLine;
        });

        const seen = new Map<number, string>();
        this.soLines.forEach(l => (l.warehouses || []).forEach(w => seen.set(w.warehouseId, w.warehouseName)));
        this.warehousesMaster = Array.from(seen.entries()).map(([id, warehouseName]) => ({ id, warehouseName }));
        this.filteredLists.warehouse = [...this.warehousesMaster];

        this.enforceTaxModesByGst();
        this.recalcTotals();
      });

      this.dropdownOpen['quotationNo'] = false;
      this.dropdownOpen['customer'] = false;
      return;
    }

    if (field === 'customer') {
      this.soHdr.customerId = item.id;
      this.searchTexts['customer'] = item.customerName ?? item.name ?? '';
      this.dropdownOpen['customer'] = false;
      return;
    }
  }

  onClearWarehouse() {
    this.searchTexts['warehouse'] = '';
    this.selectedWarehouseId = null;
    this.selectedWarehouseName = '';
    this.dropdownOpen['warehouse'] = false;
  }

  onClearSearch(field: 'quotationNo' | 'customer') {
    if (this.editMode) return;
    this.searchTexts[field] = '';
    this.dropdownOpen[field] = false;
    if (field === 'quotationNo') this.soHdr.quotationNo = 0;
    if (field === 'customer') this.soHdr.customerId = 0;
  }

  /* ============ Close dropdowns ============ */
  @HostListener('document:click', ['$event'])
  onDocClick(e: Event) {
    const el = e.target as HTMLElement;
    if (!el.closest('.so-header-dd')) {
      Object.keys(this.dropdownOpen).forEach(k => (this.dropdownOpen[k] = false));
    }
    this.soLines.forEach(l => {
      if (!el.closest('.so-line-dd')) l.dropdownOpen = '';
    });
  }

  /* ============ Item/tax dropdowns ============ */
  openDropdown(i: number, field: 'item' | 'tax') {
    this.soLines[i].dropdownOpen = field;
    this.soLines[i].filteredOptions = field === 'item' ? [...this.items] : [...this.taxCodes];
  }

  filterOptions(i: number, field: 'item' | 'tax') {
    const q = ((this.soLines[i] as any)[field] || '').toString().toLowerCase();
    if (field === 'item') {
      this.soLines[i].filteredOptions = this.items.filter(x =>
        (x.itemCode || '').toLowerCase().includes(q) ||
        (x.itemName || '').toLowerCase().includes(q));
    } else {
      this.soLines[i].filteredOptions = this.taxCodes.filter(x =>
        (x.name || '').toLowerCase().includes(q) ||
        (x.code || '').toLowerCase().includes(q));
    }
  }

  selectOption(i: number, field: 'item' | 'tax', opt: any) {
    if (field === 'item') {
      if (this.editMode && this.soLines[i].__id) {
        this.soLines[i].dropdownOpen = '';
        this.soLines[i].filteredOptions = [];
        return;
      }
      this.soLines[i].item = `${opt.itemCode} - ${opt.itemName}`;
      this.soLines[i].itemId = opt.id;
      this.soLines[i].uom = opt.defaultUom || this.soLines[i].uom || '';
      if (!this.soLines[i].unitPrice) this.soLines[i].unitPrice = Number(opt.price || 0);

      if (!this.soLines[i].description && opt.description) {
        this.soLines[i].description = String(opt.description);
      }
    } else {
      this.soLines[i].tax = this.canonicalTaxMode(opt.code, Number(this.soHdr.gstPct || 0));
    }
    this.soLines[i].dropdownOpen = '';
    this.soLines[i].filteredOptions = [];
  }

  /* ============ Qty & Discount & UnitPrice change ============ */
  onQtyChange(i: number) {
    const L = this.soLines[i];
    const qtyNow = Number(L.quantity) || 0;

    if (typeof L.__origQty === 'number' && qtyNow === L.__origQty) {
      L.lineGross    = L.__origGross ?? L.lineGross;
      L.lineNet      = L.__origNet   ?? L.lineNet;
      L.lineTax      = L.__origTax   ?? L.lineTax;
      L.total        = L.__origTotal ?? L.total;
      L.lineDiscount = L.__origDiscount ?? L.lineDiscount;
      this.recalcTotals();
      return;
    }

    this.computeLineFromQty(i);
  }

  onDiscountChange(i: number) {
    this.computeLineFromQty(i);
  }

  onUnitPriceChange(i: number) {
    const L = this.soLines[i];
    const p = Number(L.unitPrice);
    if (!isFinite(p) || p < 0) L.unitPrice = 0;
    this.computeLineFromQty(i);
  }

  private computeLineFromQty(i: number) {
    const L = this.soLines[i];
    const qty      = Number(L.quantity) || 0;
    const price    = Number(L.unitPrice) || 0;
    const discPct  = Number(L.discount) || 0;
    const gst      = Number(this.soHdr.gstPct || 0);
    const mode     = this.canonicalTaxMode(L.tax, gst);

    const amt = this.calcAmounts(qty, price, discPct, mode, gst);

    L.tax          = mode;
    L.lineGross    = amt.gross;
    L.lineNet      = amt.net;
    L.lineTax      = amt.tax;
    L.total        = amt.total;
    L.lineDiscount = amt.discountAmt;

    this.recalcTotals();
  }

  /* ============ Totals ============ */
  get totals() {
    const net       = this.soLines.reduce((s, x) => s + (x.lineNet      || 0), 0);
    const tax       = this.soLines.reduce((s, x) => s + (x.lineTax      || 0), 0);
    const discLines = this.soLines.reduce((s, x) => s + (x.lineDiscount || 0), 0);
    const shipping  = Number(this.soHdr.shipping || 0);

    const subTotal     = this.round2(net + shipping);
    const gstAmount    = this.round2(tax);
    const grandTotal   = this.round2(subTotal + gstAmount);

    return {
      subTotal,
      gstAmount,
      discountLines: this.round2(discLines),
      netTotal: grandTotal,
      grandTotal
    };
  }

  get discountPctSummary(): number {
    const line = this.soLines.find(l => Number(l.discount || 0) > 0);
    return line ? Number(line.discount) || 0 : 0;
  }

  recalcTotals() {
    const t = this.totals;
    this.soHdr = {
      ...this.soHdr,
      discount: t.discountLines,
      taxAmount: t.gstAmount,
      subTotal: t.subTotal,
      grandTotal: t.grandTotal
    };
  }

  /* ============ Save ============ */
  private validateSO(): boolean {
    const missing = this.requiredKeys.filter(k => this.isEmpty(this.searchTexts[k]));
    if (missing.length) {
      this.submitted = true;
      Swal.fire({ icon: 'warning', title: 'Required', text: 'Please fill required header fields.' });
      return false;
    }

    // ✅ NEW required field
    if (this.isEmpty(this.soHdr.deliveryTo)) {
      this.submitted = true;
      Swal.fire({ icon: 'warning', title: 'Required', text: 'Delivery To is required.' });
      return false;
    }

    if (this.soLines.length === 0) {
      Swal.fire({ icon: 'warning', title: 'Required', text: 'Please add at least one line.' });
      return false;
    }
    const bad = this.soLines.find(l => !l.itemId || !(Number(l.quantity) >= 0));
    if (bad) {
      Swal.fire({ icon: 'warning', title: 'Required', text: 'Each line needs Item and a valid Qty.' });
      return false;
    }
    return true;
  }

  private buildPayload() {
    const t = this.totals;

    return {
      id: this.soHdr.id,
      quotationNo: this.soHdr.quotationNo,
      customerId: this.soHdr.customerId,
      requestedDate: this.soHdr.requestedDate,
      deliveryDate: this.soHdr.deliveryDate,

      // ✅ NEW
      deliveryTo: (this.soHdr.deliveryTo || '').toString(),
      remarks: (this.soHdr.remarks || '').toString(),

      shipping: Number(this.soHdr.shipping || 0),

      discount: t.discountLines,
      gstPct: Number(this.soHdr.gstPct || 0),

      subTotal: t.subTotal,
      taxAmount: t.gstAmount,
      grandTotal: t.grandTotal,

      status: this.soHdr.status,
      customerName: this.searchTexts.customer,
      createdBy: this.userId,
      updatedBy: this.userId,

      lineItems: this.soLines.map(l => ({
        id: l.__id || 0,
        itemId: l.itemId!,
        itemName: (l.item || '').toString(),
        uom: l.uom || '',
        description: (l.description || '').toString(),
        quantity: Number(l.quantity) || 0,
        unitPrice: Number(l.unitPrice) || 0,
        discount: Number(l.discount) || 0,
        tax: l.tax || null,
        taxAmount: Number(l.lineTax || 0),
        total: Number(l.total) || 0,
        createdBy: this.userId,
        updatedBy: this.userId
      })),

      totals: t
    };
  }

  post(): void {
    if (!this.validateSO()) return;

    const payload = this.buildPayload();

    if (this.editMode) {
      this.salesOrderService.updateSO(payload).subscribe({
        next: () => {
          Swal.fire({
            icon: 'success',
            title: 'Updated!',
            text: 'Sales Order updated successfully',
            confirmButtonText: 'OK',
            confirmButtonColor: '#0e3a4c'
          });
          this.router.navigate(['/Sales/Sales-Order-list']);
        },
        error: (err) => {
          const msg = err?.error?.message || err?.message || 'Failed to update Sales Order';
          Swal.fire({ icon: 'error', title: 'Error', text: msg, confirmButtonColor: '#d33' });
        }
      });
    } else {
      this.salesOrderService.insertSO(payload).subscribe({
        next: () => {
          Swal.fire({
            icon: 'success',
            title: 'Created!',
            text: 'Sales Order created successfully',
            confirmButtonText: 'OK',
            confirmButtonColor: '#0e3a4c'
          });
          this.router.navigate(['/Sales/Sales-Order-list']);
        },
        error: (err) => {
          const msg = err?.error?.message || err?.message || 'Failed to create Sales Order';
          Swal.fire({ icon: 'error', title: 'Error', text: msg, confirmButtonColor: '#d33' });
        }
      });
    }
  }

  /* ============ Preview ============ */
  previewAlloc(): void {
    const req = this.soLines
      .filter(l => !!l.itemId && Number(l.quantity) > 0)
      .map(l => ({ itemId: l.itemId as number, quantity: Number(l.quantity) || 0 }));

    if (req.length === 0) {
      Swal.fire({ icon: 'info', title: 'Nothing to preview', text: 'Add at least one valid line.' });
      return;
    }

    this.salesOrderService.previewAllocation(req).subscribe({
      next: (res: any) => {
        const linesFromWrapper = res?.data?.lines;
        const linesDirect = res?.lines;
        this.previewData = (linesFromWrapper ?? linesDirect ?? []) as PreviewLine[];
        this.showPreview = true;
      },
      error: () => {
        Swal.fire({ icon: 'error', title: 'Preview failed', text: 'Cannot preview allocation now.' });
      }
    });
  }

  closePreview(): void { this.showPreview = false; }

  removeLine(i: number) {
    this.soLines.splice(i, 1);
    this.recalcTotals();
  }

  trackByIndex = (i: number) => i;

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

  cancel() {
    this.router.navigate(['/Sales/Sales-Order-list']);
  }
}

function safeJsonParse<T>(txt: string, fallback: T): T {
  try { return JSON.parse(txt) as T; } catch { return fallback; }
}
