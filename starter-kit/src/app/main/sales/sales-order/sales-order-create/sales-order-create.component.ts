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

  // ✅ optional (if backend later gives)
  itemSetId?: number;
};

type ItemSetRef = { id: number; name: string };

type SetGroup = {
  itemSetId: number;
  name: string;
  lines: SoLine[];
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

    // ✅ Header extra
    lineSourceId: 1,                // 1 = Individual Item, 2 = ItemSet
    itemSets: [] as ItemSetRef[],   // ✅ normalized list (mapping table)

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

  // ✅ Flat lines (for saving)
  soLines: SoLine[] = [];

  // ✅ Grouped view for 2nd image table
  setGroups: SetGroup[] = [];

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

  /* ================= HEADER UI GETTERS ================= */
  get showItemSetBox(): boolean {
    return Number(this.soHdr.lineSourceId || 1) === 2;
  }

  get sourceLineText(): string {
    return Number(this.soHdr.lineSourceId || 1) === 1 ? 'Individual Item' : 'Item Set';
  }

  get itemSetNamesText(): string {
    const arr = (this.soHdr.itemSets ?? []) as ItemSetRef[];
    return arr.length ? arr.map(x => x.name).join(', ') : '';
  }

  get itemSetIdsText(): string {
    const arr = (this.soHdr.itemSets ?? []) as ItemSetRef[];
    return arr.length ? arr.map(x => x.id).join(', ') : '';
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

  /* ================= NEW: lineSourceId + ItemSets (mapping-table style) ================= */
  private setHeaderLineSourceAndItemSets(head: any) {
    let srcId = Number(head?.lineSourceId ?? head?.LineSourceId ?? 0);

    const itemSetCount = Number(head?.itemSetCount ?? head?.ItemSetCount ?? 0);
    const itemSetIdsStr = String(head?.itemSetIds ?? head?.ItemSetIds ?? '').trim(); // "2" or "2,3"
    const itemSetsJsonTxt = String(head?.itemSetsJson ?? head?.ItemSetsJson ?? '').trim();

    const hasCsv = itemSetIdsStr !== '' && itemSetIdsStr !== '0' && itemSetIdsStr.toLowerCase() !== 'null';
    const hasJson = itemSetsJsonTxt !== '' && itemSetsJsonTxt !== '[]' && itemSetsJsonTxt.toLowerCase() !== 'null';
    const hasItemSet = itemSetCount > 0 || hasCsv || hasJson;

    if (!isFinite(srcId) || srcId <= 0) srcId = hasItemSet ? 2 : 1;
    this.soHdr.lineSourceId = srcId;

    // collect itemSets: {id,name} (unique by ItemSetId)
    const map = new Map<number, string>();

    // JSON rows
    if (hasJson) {
      const rows = safeJsonParse<any[]>(itemSetsJsonTxt, []);
      rows.forEach(r => {
        const id = Number(r?.ItemSetId ?? r?.itemSetId ?? r?.ItemSetID ?? 0);
        const nm = String(r?.ItemSetName ?? r?.itemSetName ?? '').trim();
        if (id > 0) map.set(id, nm || `ItemSet ${id}`);
      });
    }

    // array rows
    const arr = head?.itemSets ?? head?.ItemSets;
    if (Array.isArray(arr)) {
      arr.forEach((x: any) => {
        const id = Number(x?.ItemSetId ?? x?.itemSetId ?? 0);
        const nm = String(x?.ItemSetName ?? x?.itemSetName ?? '').trim();
        if (id > 0) map.set(id, nm || `ItemSet ${id}`);
      });
    }

    // csv ids only
    if (hasCsv) {
      itemSetIdsStr.split(',')
        .map(s => Number(s.trim()))
        .filter(n => n > 0)
        .forEach(id => { if (!map.has(id)) map.set(id, `ItemSet ${id}`); });
    }

    this.soHdr.itemSets = Array.from(map.entries()).map(([id, name]) => ({ id, name }));

    // Individual item => clear
    if (Number(this.soHdr.lineSourceId || 1) === 1) {
      this.soHdr.itemSets = [];
    }
  }

  /* ================= GROUPING: build setGroups for 2nd image ================= */
  private buildSetGroups() {
    const sets = (this.soHdr.itemSets || []) as ItemSetRef[];
    const lines = (this.soLines || []) as SoLine[];

    // No sets => one group
    if (!sets.length) {
      this.setGroups = lines.length
        ? [{ itemSetId: 0, name: 'Items', lines: [...lines] }]
        : [];
      return;
    }

    // prepare map
    const map = new Map<number, SetGroup>();
    sets.forEach(s => map.set(s.id, { itemSetId: s.id, name: s.name, lines: [] }));

    // If backend sends itemSetId inside line => perfect group
    const hasLineSet = lines.some(l => Number((l as any).itemSetId || 0) > 0);
    if (hasLineSet) {
      lines.forEach(l => {
        const sid = Number((l as any).itemSetId || 0);
        if (sid > 0 && map.has(sid)) map.get(sid)!.lines.push(l);
      });
      this.setGroups = Array.from(map.values()).filter(g => g.lines.length);
      return;
    }

    // Fallback grouping: round-robin assign by order
    const setIds = sets.map(s => s.id);
    lines.forEach((l, idx) => {
      const sid = setIds[idx % setIds.length];
      map.get(sid)!.lines.push(l);
    });

    this.setGroups = Array.from(map.values()).filter(g => g.lines.length);
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

        this.soHdr.deliveryTo = head.deliveryTo ?? head.DeliveryTo ?? '';
        this.soHdr.remarks    = head.remarks    ?? head.Remarks    ?? '';

        // ✅ mapping load
        this.setHeaderLineSourceAndItemSets(head);

        this.soHdr.shipping = Number(head.shipping ?? 0);
        this.soHdr.discount = Number(head.discount ?? 0);
        this.soHdr.gstPct   = Number(head.gstPct ?? 0);
        this.soHdr.taxAmount = Number(head.taxAmount ?? head.TaxAmount ?? 0);
        this.soHdr.subTotal  = Number(head.subtotal ?? head.Subtotal ?? 0);
        this.soHdr.grandTotal = Number(head.grandTotal ?? head.GrandTotal ?? 0);

        this.soHdr.status   = head.status ?? 1;
        this.soHdr.statusText = this.mapStatusText(this.soHdr.status);

        const gst = Number(this.soHdr.gstPct || 0);
        const lines = (head.lineItems ?? head.lines ?? []) as any[];

        this.soLines = lines.map((l: any) => {
          const qty   = Number(l.quantity ?? l.qty ?? 0);
          const price = Number(l.unitPrice ?? 0);
          const mode  = this.canonicalTaxMode(l.tax ?? l.taxMode, gst);

          const discPct = Number(l.discount ?? l.discountPct ?? 0);
          const amt = this.calcAmounts(qty, price, discPct, mode, gst);

          return {
            __id: Number(l.id || l.Id || 0) || undefined,
            item: l.itemName || l.item || '',
            itemId: Number(l.itemId ?? 0) || undefined,
            uom: l.uom || l.uomName || '',
            description: l.description ?? l.Description ?? '',
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
            warehouses: [],
            dropdownOpen: '',
            filteredOptions: [],

            // ✅ if backend sends later
            itemSetId: Number(l.itemSetId ?? 0) || undefined
          } as SoLine;
        });

        this.enforceTaxModesByGst();
        this.recalcTotals();

        // ✅ build grouped view
        this.buildSetGroups();
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
    if (field === 'quotationNo') this.filteredLists[field] = [...this.quotationList];
    if (field === 'customer') this.filteredLists[field] = [...this.customers];
    if (field === 'warehouse') this.filteredLists[field] = [...this.warehousesMaster];
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
        this.soHdr.deliveryTo = (head?.deliveryTo ?? head?.DeliveryTo ?? this.soHdr.deliveryTo ?? '');
        this.soHdr.remarks    = (head?.remarks ?? head?.Remarks ?? this.soHdr.remarks ?? '');

        // ✅ mapping
        this.setHeaderLineSourceAndItemSets(head);

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
            filteredOptions: [],

            // ✅ if backend sends later
            itemSetId: Number(l.itemSetId ?? 0) || undefined
          } as SoLine;
        });

        this.enforceTaxModesByGst();
        this.recalcTotals();

        // ✅ build grouped view
        this.buildSetGroups();
      });

      this.dropdownOpen['quotationNo'] = false;
      this.dropdownOpen['customer'] = false;
      return;
    }

    if (field === 'customer') {
      this.soHdr.customerId = item.id;
      this.searchTexts['customer'] = item.customerName ?? item.name ?? '';
      this.dropdownOpen['customer'] = false;
    }
  }

  onClearSearch(field: 'quotationNo' | 'customer') {
    if (this.editMode) return;
    this.searchTexts[field] = '';
    this.dropdownOpen[field] = false;
    if (field === 'quotationNo') this.soHdr.quotationNo = 0;
    if (field === 'customer') this.soHdr.customerId = 0;

    // reset extra header
    this.soHdr.lineSourceId = 1;
    this.soHdr.itemSets = [];

    // reset lines & groups
    this.soLines = [];
    this.setGroups = [];
    this.recalcTotals();
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

  /* ============ Item/tax dropdowns (still available if you use old line input style) ============ */
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
    this.computeLineFromObj(this.soLines[i]);
  }

  /* ================= NEW: ByRef handlers for grouped table ================= */
  onQtyChangeByRef(ln: SoLine) { this.computeLineFromObj(ln); }
  onUnitPriceChangeByRef(ln: SoLine) { this.computeLineFromObj(ln); }
  onDiscountChangeByRef(ln: SoLine) { this.computeLineFromObj(ln); }
  onTaxChangeByRef(ln: SoLine) { this.computeLineFromObj(ln); }

  /* ============ Qty & Discount & UnitPrice change (old) ============ */
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

  onDiscountChange(i: number) { this.computeLineFromQty(i); }

  onUnitPriceChange(i: number) {
    const L = this.soLines[i];
    const p = Number(L.unitPrice);
    if (!isFinite(p) || p < 0) L.unitPrice = 0;
    this.computeLineFromQty(i);
  }

  private computeLineFromQty(i: number) {
    const L = this.soLines[i];
    this.computeLineFromObj(L);
  }

  // ✅ core compute using object reference (works for grouped table also)
  private computeLineFromObj(L: SoLine) {
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

  /* ================= NEW: Group actions ================= */
  removeSet(g: SetGroup) {
    // remove those lines from flat array
    const toRemove = new Set(g.lines);
    this.soLines = this.soLines.filter(l => !toRemove.has(l));

    // remove group
    this.setGroups = this.setGroups.filter(x => x !== g);

    this.recalcTotals();
  }

  removeLineFromSet(g: SetGroup, ln: SoLine) {
    g.lines = (g.lines || []).filter(x => x !== ln);
    this.soLines = (this.soLines || []).filter(x => x !== ln);

    // if group empty -> remove set
    if (!g.lines.length) {
      this.setGroups = this.setGroups.filter(x => x !== g);
    }

    this.recalcTotals();
  }

  addLine() {
    const gst = Number(this.soHdr.gstPct || 0);
    const mode = this.canonicalTaxMode('Standard-Rated', gst);

    const newLine: SoLine = {
      __id: undefined,
      item: '',
      itemId: undefined,
      uom: '',
      description: '',
      quantity: 0,
      unitPrice: 0,
      discount: 0,
      discountType: 'PCT',
      tax: mode,
      lineGross: 0,
      lineNet: 0,
      lineTax: 0,
      total: 0,
      lineDiscount: 0,
      warehouses: [],
      dropdownOpen: '',
      filteredOptions: []
    };

    // flat
    this.soLines.push(newLine);

    // grouped (put in first group if exists)
    if (!this.setGroups.length) {
      this.setGroups = [{ itemSetId: 0, name: 'Items', lines: [newLine] }];
    } else {
      this.setGroups[0].lines.push(newLine);
    }

    this.recalcTotals();
  }

  /* ============ Save ============ */
  private validateSO(): boolean {
    const missing = this.requiredKeys.filter(k => this.isEmpty(this.searchTexts[k]));
    if (missing.length) {
      this.submitted = true;
      Swal.fire({ icon: 'warning', title: 'Required', text: 'Please fill required header fields.' });
      return false;
    }

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

      deliveryTo: (this.soHdr.deliveryTo || '').toString(),
      remarks: (this.soHdr.remarks || '').toString(),

      // ✅ header
      lineSourceId: Number(this.soHdr.lineSourceId || 1),

      // ✅ mapping table save (set ids)
      itemSetIds: (this.soHdr.itemSets || []).map((x: any) => Number(x.id)).filter((n: number) => n > 0),

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

  /* ===== old removeLine still available (if you use old table) ===== */
  removeLine(i: number) {
    this.soLines.splice(i, 1);
    this.recalcTotals();
    this.buildSetGroups();
  }

  /* trackBy */
  trackByIndex = (i: number) => i;
  trackByLineId = (i: number, ln: SoLine) => ln.__id ?? ln.itemId ?? i;

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