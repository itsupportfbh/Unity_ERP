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

type LineTaxMode = 'Standard-Rated' | 'Zero-Rated' | 'Exempt';

/**
 * fulfillmentMode:
 *  1 = Sellable
 *  2 = Consumable
 *  3 = Both
 *  null = Select
 *
 * supplyMethod:
 *  0 = Direct DO
 *  1 = PP
 *  null = Select
 */
type FulfillmentMode = 1 | 2 | 3 | null;
type SupplyMethod = 0 | 1 | null;

type SoLine = {
  __id?: number;

  item?: string;
  itemId?: number;
  uom?: string;
  description?: string;

  // ✅ MATCH HTML
  qty?: number | string;
  unitPrice?: number | string;
  discountPct?: number | string;
  taxMode?: LineTaxMode;

  lineGross?: number;
  lineNet?: number;
  lineTax?: number;
  lineTotal?: number;
  lineDiscount?: number;

  warehouses?: WarehouseInfo[];

  // ✅ read-only flags
  isSellable?: boolean;
  isConsumable?: boolean;

  // ✅ SO decisions
  fulfillmentMode?: FulfillmentMode; // 1/2/3/null
  supplyMethod?: SupplyMethod;       // 0/1/null
  __supplyLocked?: boolean;
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
    deliveryTo: '',
    remarks: '',

    lineSourceId: 1,
    itemSets: [] as ItemSetRef[],

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

  warehousesMaster: WarehouseMaster[] = [];
  selectedWarehouseId: number | null = null;
  selectedWarehouseName = '';

  soLines: SoLine[] = [];
  setGroups: SetGroup[] = [];

  submitted = false;

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
    const v = Number(this.soHdr?.lineSourceId ?? 1);
    if (v === 1) return 'Individual Item';
    if (v === 2) return 'Item Set';
    if (v === 3) return 'Mixed (Item + Set)';
    return 'Individual Item';
  }

  get itemSetNamesText(): string {
    const arr = (this.soHdr.itemSets ?? []) as ItemSetRef[];
    return arr.length ? arr.map(x => x.name).join(', ') : '';
  }

  /* ================= LABELS ================= */
  getFulfillmentLabel(v: FulfillmentMode | undefined): string {
    if (v === 1) return 'Sellable';
    if (v === 2) return 'Consumable';
    if (v === 3) return 'Both';
    return 'Select';
  }

  getSupplyLabel(v: SupplyMethod | undefined): string {
    if (v === 0) return 'Direct DO';
    if (v === 1) return 'PP';
    return 'Select';
  }

  get taxModesForCurrentGst(): LineTaxMode[] {
    const gst = Number(this.soHdr.gstPct || 0);
    if (gst !== 9) return ['Zero-Rated', 'Exempt'];
    return ['Standard-Rated', 'Zero-Rated', 'Exempt'];
  }

  /* ================= INIT ================= */
  ngOnInit(): void {
    const idParam = this.route.snapshot.paramMap.get('id');
    this.editMode = !!idParam;
    this.routeId = idParam ? Number(idParam) : null;

    if (!this.editMode) {
      this.soHdr.requestedDate = this.toInputDate(new Date());
    }

    this.countriesSvc.getCountry().subscribe((res: any) => {
      this.countries = (res?.data ?? []).map((c: any) => ({
        id: Number(c.id ?? c.Id),
        countryName: String(c.countryName ?? c.CountryName ?? '').trim(),
        gstPercentage: Number(c.gstPercentage ?? c.GSTPercentage ?? 0)
      }));
    });

    forkJoin({
      quotations: this.quotationSvc.getAll(),
      customers: this.customerSvc.GetAllCustomerDetails(),
      salesOrders: this.salesOrderService.getSO()
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

  /* ======== math helpers ======== */
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
  ) {
    const sub = qty * unitPrice;
    const discPct = discountPct || 0;

    let discountAmt = (sub * discPct) / 100;
    if (discountAmt < 0) discountAmt = 0;
    if (discountAmt > sub) discountAmt = sub;

    let afterDisc = sub - discountAmt;
    if (afterDisc < 0) afterDisc = 0;

    const mode = this.canonicalTaxMode(taxMode, gstPct);
    const rate = (mode === 'Standard-Rated' ? gstPct : 0) / 100;

    let net = afterDisc;
    let tax = 0;
    let tot = afterDisc;

    if (mode === 'Standard-Rated' && rate > 0) {
      tax = net * rate;
      tot = net + tax;
    }

    return {
      gross: this.round2(sub),
      net: this.round2(net),
      tax: this.round2(tax),
      total: this.round2(tot),
      discountAmt: this.round2(discountAmt),
      mode
    };
  }

  /* ================= fulfillmentMode -> flags ================= */
  private applyFlagsFromFulfillmentMode(ln: SoLine) {
    const fmRaw: any = (ln.fulfillmentMode as any);
    const fm = (fmRaw === null || fmRaw === undefined || fmRaw === '') ? null : Number(fmRaw);

    ln.fulfillmentMode = (fm === 1 || fm === 2 || fm === 3) ? (fm as any) : null;

    ln.isSellable = (ln.fulfillmentMode === 1 || ln.fulfillmentMode === 3);
    ln.isConsumable = (ln.fulfillmentMode === 2 || ln.fulfillmentMode === 3);
  }

  /* ================= fulfillmentMode -> supplyMethod =================
     1 Sellable   => 0 Direct DO (locked)
     2 Consumable => 1 PP       (locked)
     3 Both       => user choose
  */
  private applySupplyFromFulfillment(ln: SoLine) {
    const f = ln.fulfillmentMode ?? null;

    if (f === 1) {
      ln.supplyMethod = 0;
      ln.__supplyLocked = true;
    } else if (f === 2) {
      ln.supplyMethod = 1;
      ln.__supplyLocked = true;
    } else if (f === 3) {
      if (ln.supplyMethod !== 0 && ln.supplyMethod !== 1) ln.supplyMethod = null;
      ln.__supplyLocked = false;
    } else {
      ln.supplyMethod = null;
      ln.__supplyLocked = false;
    }
  }

  /* ✅ compute totals for ONE line */
  private computeLine(ln: SoLine) {
    const gst = Number(this.soHdr.gstPct || 0);
    const qty = Number(ln.qty) || 0;
    const price = Number(ln.unitPrice) || 0;
    const disc = Number(ln.discountPct) || 0;

    const amt = this.calcAmounts(qty, price, disc, ln.taxMode, gst);

    ln.taxMode = amt.mode;
    ln.lineGross = amt.gross;
    ln.lineNet = amt.net;
    ln.lineTax = amt.tax;
    ln.lineTotal = amt.total;
    ln.lineDiscount = amt.discountAmt;
  }

  computeTotals() {
    (this.soLines || []).forEach(ln => this.computeLine(ln));
    this.recalcTotals();
  }

  /* ================= lineSourceId + ItemSets ================= */
  private setHeaderLineSourceAndItemSets(head: any) {
    let srcId = Number(head?.lineSourceId ?? head?.LineSourceId ?? 0);

    const itemSetCount = Number(head?.itemSetCount ?? head?.ItemSetCount ?? 0);
    const itemSetIdsStr = String(head?.itemSetIds ?? head?.ItemSetIds ?? '').trim();
    const itemSetsJsonTxt = String(head?.itemSetsJson ?? head?.ItemSetsJson ?? '').trim();

    const hasCsv = itemSetIdsStr !== '' && itemSetIdsStr !== '0' && itemSetIdsStr.toLowerCase() !== 'null';
    const hasJson = itemSetsJsonTxt !== '' && itemSetsJsonTxt !== '[]' && itemSetsJsonTxt.toLowerCase() !== 'null';
    const hasItemSet = itemSetCount > 0 || hasCsv || hasJson;

    if (!isFinite(srcId) || srcId <= 0) srcId = hasItemSet ? 2 : 1;
    this.soHdr.lineSourceId = srcId;

    const map = new Map<number, string>();

    if (hasJson) {
      const rows = safeJsonParse<any[]>(itemSetsJsonTxt, []);
      rows.forEach(r => {
        const id = Number(r?.ItemSetId ?? r?.itemSetId ?? 0);
        const nm = String(r?.ItemSetName ?? r?.itemSetName ?? '').trim();
        if (id > 0) map.set(id, nm || `ItemSet ${id}`);
      });
    }

    if (hasCsv) {
      itemSetIdsStr
        .split(',')
        .map(s => Number(s.trim()))
        .filter(n => n > 0)
        .forEach(id => { if (!map.has(id)) map.set(id, `ItemSet ${id}`); });
    }

    const arr = head?.itemSets ?? head?.ItemSets;
    if (Array.isArray(arr)) {
      arr.forEach((x: any) => {
        const id = Number(x?.ItemSetId ?? x?.itemSetId ?? 0);
        const nm = String(x?.ItemSetName ?? x?.itemSetName ?? '').trim();
        if (id > 0) map.set(id, nm || `ItemSet ${id}`);
      });
    }

    this.soHdr.itemSets = Array.from(map.entries()).map(([id, name]) => ({ id, name }));

    if (Number(this.soHdr.lineSourceId || 1) === 1) {
      this.soHdr.itemSets = [];
    }
  }

  /* ================= GROUPING ================= */
  private buildSetGroups() {
    const sets = (this.soHdr.itemSets || []) as ItemSetRef[];
    const lines = (this.soLines || []) as SoLine[];

    if (!sets.length) {
      this.setGroups = lines.length ? [{ itemSetId: 0, name: 'Items', lines: [...lines] }] : [];
      return;
    }

    const map = new Map<number, SetGroup>();
    sets.forEach(s => map.set(s.id, { itemSetId: s.id, name: s.name, lines: [] }));

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
        this.soHdr.deliveryDate = this.toInputDate(head.deliveryDate);

        this.soHdr.deliveryTo = head.deliveryTo ?? head.DeliveryTo ?? '';
        this.soHdr.remarks = head.remarks ?? head.Remarks ?? '';

        this.setHeaderLineSourceAndItemSets(head);

        this.soHdr.shipping = Number(head.shipping ?? 0);
        this.soHdr.gstPct = Number(head.gstPct ?? 0);

        const gst = Number(this.soHdr.gstPct || 0);
        const lines = (head.lineItems ?? head.lines ?? []) as any[];

        this.soLines = lines.map((l: any) => {
          const qty = Number(l.qty ?? l.quantity ?? 0);
          const price = Number(l.unitPrice ?? 0);
          const discPct = Number(l.discountPct ?? l.discount ?? 0);
          const mode = this.canonicalTaxMode(l.taxMode ?? l.tax, gst);

          // 🔥 IMPORTANT: API fulfillmentMode = 1/2/3
          const rawFulfill = (l.fulfillmentMode ?? l.FulfillmentMode);
          const fulfillmentMode: FulfillmentMode =
            (rawFulfill === null || rawFulfill === undefined || rawFulfill === '') ? null : (Number(rawFulfill) as any);

          // supplyMethod key sometimes supplymethod
          const rawSupply = (l.supplyMethod ?? l.SupplyMethod ?? l.supplymethod ?? l.supplyMethodId);
          const supplyMethod: SupplyMethod =
            (rawSupply === null || rawSupply === undefined || rawSupply === '') ? null : (Number(rawSupply) as any);

          const ln: SoLine = {
            __id: Number(l.id || l.Id || 0) || undefined,
            item: l.itemName || l.item || '',
            itemId: Number(l.itemId ?? 0) || undefined,
            uom: l.uomName ?? l.uom ?? '',
            description: (l.description ?? l.Description ?? '').toString(),

            qty,
            unitPrice: price,
            discountPct: discPct,
            taxMode: mode,

            fulfillmentMode,
            supplyMethod:l.supplyMethodId,

            warehouses: []
          };

          // ✅ derive flags from fulfillmentMode (so UI yes/no shows)
          this.applyFlagsFromFulfillmentMode(ln);

          // ✅ auto supply rules + lock
          this.applySupplyFromFulfillment(ln);

          // ✅ totals
          this.computeLine(ln);

          return ln;
        });

        this.computeTotals();
        this.buildSetGroups();
      },
      error: (err) => {
        Swal.fire({ icon: 'error', title: 'Error', text: 'Failed to load Sales Order.' });
        console.error(err);
      }
    });
  }

  /* ============ Header select (Quotation) ============ */
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
        this.soHdr.deliveryTo = (head?.deliveryTo ?? head?.DeliveryTo ?? '');
        this.soHdr.remarks = (head?.remarks ?? head?.Remarks ?? '');

        this.setHeaderLineSourceAndItemSets(head);

        this.soHdr.gstPct = Number(head?.gstPct ?? head?.gst ?? 0);
        const gst = Number(this.soHdr.gstPct || 0);

        this.soLines = lines.map((l: any) => {
          const qty = Number(l.qty ?? l.quantity ?? 0);
          const price = Number(l.unitPrice ?? 0);
          const discPct = Number(l.discountPct ?? l.discount ?? 0);
          const mode = this.canonicalTaxMode(l.taxMode ?? l.tax, gst);

          const rawFulfill = (l.fulfillmentMode ?? l.FulfillmentMode);
          const fulfillmentMode: FulfillmentMode =
            (rawFulfill === null || rawFulfill === undefined || rawFulfill === '') ? null : (Number(rawFulfill) as any);

          const rawSupply = (l.supplyMethod ?? l.SupplyMethod ?? l.supplymethod ?? l.supplyMethodId);
          const supplyMethod: SupplyMethod =
            (rawSupply === null || rawSupply === undefined || rawSupply === '') ? null : (Number(rawSupply) as any);

          const ln: SoLine = {
            __id: undefined,
            item: l.itemName || l.item || '',
            itemId: Number(l.itemId ?? 0) || undefined,
            uom: l.uomName ?? l.uom ?? '',
            description: (l.description ?? l.Description ?? '').toString(),

            qty,
            unitPrice: price,
            discountPct: discPct,
            taxMode: mode,

            fulfillmentMode,
            supplyMethod,

            warehouses: Array.isArray(l.warehouses) ? l.warehouses : []
          };

          this.applyFlagsFromFulfillmentMode(ln);
          this.applySupplyFromFulfillment(ln);
          this.computeLine(ln);

          return ln;
        });

        this.computeTotals();
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
        (x.warehouseName || '').toLowerCase().includes(q) || String(x.id).includes(q)
      );
    }
  }

  onClearSearch(field: 'quotationNo' | 'customer') {
    if (this.editMode) return;

    this.searchTexts[field] = '';
    this.dropdownOpen[field] = false;

    if (field === 'quotationNo') this.soHdr.quotationNo = 0;
    if (field === 'customer') this.soHdr.customerId = 0;

    this.soHdr.lineSourceId = 1;
    this.soHdr.itemSets = [];

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
  }

  /* ================= UI EVENTS ================= */
  onSupplyMethodChangedByRef(ln: SoLine) {
    const v: any = ln.supplyMethod;
    ln.supplyMethod = (v === null || v === undefined || v === '') ? null : (Number(v) as any);
  }

  /* ============ Totals ============ */
  get totals() {
    const net = this.soLines.reduce((s, x) => s + (x.lineNet || 0), 0);
    const tax = this.soLines.reduce((s, x) => s + (x.lineTax || 0), 0);
    const discLines = this.soLines.reduce((s, x) => s + (x.lineDiscount || 0), 0);
    const shipping = Number(this.soHdr.shipping || 0);

    const subTotal = this.round2(net + shipping);
    const gstAmount = this.round2(tax);
    const grandTotal = this.round2(subTotal + gstAmount);

    return {
      subTotal,
      gstAmount,
      discountLines: this.round2(discLines),
      netTotal: grandTotal,
      grandTotal
    };
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

  /* ================= Group actions ================= */
  removeSet(g: SetGroup) {
    const toRemove = new Set(g.lines);
    this.soLines = this.soLines.filter(l => !toRemove.has(l));
    this.setGroups = this.setGroups.filter(x => x !== g);
    this.computeTotals();
  }

  removeLineFromSet(g: SetGroup, ln: SoLine) {
    g.lines = (g.lines || []).filter(x => x !== ln);
    this.soLines = (this.soLines || []).filter(x => x !== ln);
    if (!g.lines.length) this.setGroups = this.setGroups.filter(x => x !== g);
    this.computeTotals();
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
      qty: 0,
      unitPrice: 0,
      discountPct: 0,
      taxMode: mode,

      fulfillmentMode: null,
      supplyMethod: null,
      __supplyLocked: false,

      isSellable: false,
      isConsumable: false,

      lineGross: 0,
      lineNet: 0,
      lineTax: 0,
      lineTotal: 0,
      lineDiscount: 0,
      warehouses: []
    };

    this.soLines.push(newLine);

    if (!this.setGroups.length) {
      this.setGroups = [{ itemSetId: 0, name: 'Items', lines: [newLine] }];
    } else {
      this.setGroups[0].lines.push(newLine);
    }

    this.computeTotals();
  }

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

    const badItem = this.soLines.find(l => !l.itemId || !(Number(l.qty) >= 0));
    if (badItem) {
      Swal.fire({ icon: 'warning', title: 'Required', text: 'Each line needs Item and a valid Qty.' });
      return false;
    }

    // ✅ fulfillmentMode must be 1/2/3 (derived from readonly flags usually)
    const badFulfill = this.soLines.find(l => l.fulfillmentMode !== 1 && l.fulfillmentMode !== 2 && l.fulfillmentMode !== 3);
    if (badFulfill) {
      Swal.fire({ icon: 'warning', title: 'Required', text: 'Fulfillment (Sellable/Consumable/Both) is missing for some lines.' });
      return false;
    }

    // ✅ supplyMethod required always; for Both user must choose (0/1)
    const badSupply = this.soLines.find(l => l.supplyMethod !== 0 && l.supplyMethod !== 1);
    if (badSupply) {
      Swal.fire({ icon: 'warning', title: 'Required', text: 'Please select Supply Method (Direct DO / PP) for all lines.' });
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

      lineSourceId: Number(this.soHdr.lineSourceId || 1),
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

        // backend expects quantity, discount, tax, total
        quantity: Number(l.qty) || 0,
        unitPrice: Number(l.unitPrice) || 0,
        discount: Number(l.discountPct) || 0,
        tax: l.taxMode || null,
        taxAmount: Number(l.lineTax || 0),
        total: Number(l.lineTotal) || 0,

        // ✅ your new fields
        fulfillmentMode: l.fulfillmentMode ?? null, // 1/2/3
        SupplyMethodId: l.supplyMethod ?? null,       // 0/1

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

  goToList() {
    this.router.navigate(['/Sales/Sales-Order-list']);
  }

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

  trackByLineId = (i: number, ln: SoLine) => ln.__id ?? ln.itemId ?? i;

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

  cancel() {
    this.router.navigate(['/Sales/Sales-Order-list']);
  }
}

function safeJsonParse<T>(txt: string, fallback: T): T {
  try { return JSON.parse(txt) as T; } catch { return fallback; }
}