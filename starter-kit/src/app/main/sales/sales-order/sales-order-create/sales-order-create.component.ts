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
 * supplyMethod (MATCH HTML / DB):
 *  1 = PP
 *  2 = Direct DO
 *  null = Select
 */
type FulfillmentMode = 1 | 2 | 3 | null;
type SupplyMethod = 1 | 2 | null;

type ItemFlagsDto = {
  itemId: number;
  isSellable: boolean;
  isConsumable: boolean;
  allowManualFulfillment?: boolean;
  fulfillmentText?: string;
};

type ItemAvailabilityDto = {
  itemId: number;
  itemName: string;
  available: number;
};

type SoLine = {
  __id?: number;

  item?: string;
  itemId?: number;
  uom?: string;
  description?: string;

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

  isSellable?: boolean;
  isConsumable?: boolean;

  fulfillmentMode?: FulfillmentMode;
  supplyMethod?: SupplyMethod;
  __supplyLocked?: boolean;

  // optional compatibility
  isSetHeader?: boolean;
  allowManualFulfillment?: boolean;
  fulfillmentText?: string;

  // ✅ NEW: availability for this line based on LocationId + ItemId + SupplyMethodId
  availability?: number;
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

  // ✅ get LocationId from localStorage
  locationId: number = 0;

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
    status: 2,
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

  // local cache to reduce repeated calls (key = itemId|supplyMethodId)
  private availabilityCache = new Map<string, number>();

  constructor(
    private router: Router,
    private route: ActivatedRoute,
    private customerSvc: CustomerMasterService,
    private quotationSvc: QuotationsService,
    private countriesSvc: CountriesService,
    private salesOrderService: SalesOrderService
  ) {
    this.userId = localStorage.getItem('id');

    // ✅ try common keys, fallback to 0
    const rawLoc =
      localStorage.getItem('locationId') ||
      localStorage.getItem('LocationId') ||
      localStorage.getItem('outletId') ||
      localStorage.getItem('OutletId') ||
      '0';

    this.locationId = Number(rawLoc) || 0;
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
    if (v === 1) return 'PP';
    if (v === 2) return 'Direct DO';
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

  /* ================= flags -> fulfillmentMode (only if empty) ================= */
  private applyFulfillmentFromFlagsIfEmpty(ln: SoLine) {
    if (ln.fulfillmentMode === 1 || ln.fulfillmentMode === 2 || ln.fulfillmentMode === 3) return;

    const sell = !!ln.isSellable;
    const cons = !!ln.isConsumable;

    if (sell && cons) ln.fulfillmentMode = 3;
    else if (sell) ln.fulfillmentMode = 1;
    else if (cons) ln.fulfillmentMode = 2;
    else ln.fulfillmentMode = null;

    this.applyFlagsFromFulfillmentMode(ln);
  }

  /* ================= fulfillmentMode -> supplyMethod (KEEP DB VALUE) ================= */
  private applySupplyFromFulfillment(ln: SoLine) {
    const f = ln.fulfillmentMode ?? null;
    const hasSupply = (ln.supplyMethod === 1 || ln.supplyMethod === 2);

    if (f === 1) {
      if (!hasSupply) ln.supplyMethod = 2; // Direct DO
      ln.__supplyLocked = true;
      return;
    }

    if (f === 2) {
      if (!hasSupply) ln.supplyMethod = 1; // PP
      ln.__supplyLocked = true;
      return;
    }

    if (f === 3) {
      if (!hasSupply) ln.supplyMethod = null; // user choose
      ln.__supplyLocked = false;
      return;
    }

    if (!hasSupply) ln.supplyMethod = null;
    ln.__supplyLocked = false;
  }

  private applyAutoSupplyMethodIfEmpty(ln: SoLine) {
    this.applySupplyFromFulfillment(ln);
  }

  /* ================= BULK FLAGS BY ITEMID (same as QT) ================= */
  private loadFlagsForSoLines(lines: SoLine[]) {
    const ids = Array.from(
      new Set((lines || [])
        .filter(x => !x.isSetHeader && (x.itemId || 0) > 0)
        .map(x => Number(x.itemId)))
    );
    if (!ids.length) return;

    this.quotationSvc.getItemFlagsBulk(ids).subscribe({
      next: (res: any) => {
        const arr: ItemFlagsDto[] = (res?.data ?? res ?? []) as any;
        const map = new Map<number, ItemFlagsDto>();
        for (const f of arr) map.set(Number((f as any).itemId), f);

        for (const l of (lines || [])) {
          if (l.isSetHeader) continue;

          const f = map.get(Number(l.itemId));
          if (!f) continue;

          l.isSellable = !!(f as any).isSellable;
          l.isConsumable = !!(f as any).isConsumable;
          l.allowManualFulfillment = !!(f as any).allowManualFulfillment;
          if ((f as any).fulfillmentText) l.fulfillmentText = String((f as any).fulfillmentText);

          this.applyFulfillmentFromFlagsIfEmpty(l);
          this.applyAutoSupplyMethodIfEmpty(l);
        }

        this.computeTotals();

        // ✅ after flags/supply are stable -> refresh availability
        this.refreshAvailabilityForAllLines();
      },
      error: (err: any) => console.error('getItemFlagsBulk failed', err)
    });
  }

  /* ================= AVAILABILITY (LocationId + ItemId + SupplyMethodId) ================= */
  private availabilityKey(itemId: number, supplyMethodId: number) {
    return `${itemId}|${supplyMethodId}`;
  }

  private fetchAvailabilityForLine(ln: SoLine) {
    const locId = Number(this.locationId || 0);
    const itemId = Number(ln.itemId || 0);
    const sm = Number(ln.supplyMethod || 0);

    // needs all 3
    if (!(locId > 0) || !(itemId > 0) || !(sm === 1 || sm === 2)) {
      ln.availability = undefined;
      return;
    }

    const key = this.availabilityKey(itemId, sm);
    if (this.availabilityCache.has(key)) {
      ln.availability = this.availabilityCache.get(key)!;
      return;
    }

    // ✅ Angular service method you should have:
    // getAvailability(locationId:number, itemId:number, supplyMethodId:number)
    this.salesOrderService.getAvailability(locId, itemId, sm).subscribe({
      next: (res: any) => {
        const rows: ItemAvailabilityDto[] = (res?.data ?? res ?? []) as any;

        // your SQL is DISTINCT ItemId, ItemName, Available
        const first = rows?.[0];
        const available = Number(first?.available ?? first?.available  ?? 0) || 0;

        this.availabilityCache.set(key, available);
        ln.availability = available;
      },
      error: (err: any) => {
        console.error('getAvailability failed', err);
        ln.availability = undefined;
      }
    });
  }

  private refreshAvailabilityForAllLines() {
    (this.soLines || []).forEach(ln => this.fetchAvailabilityForLine(ln));
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

          const rawFulfill = (l.fulfillmentMode ?? l.FulfillmentMode);
          const fulfillmentMode: FulfillmentMode =
            (rawFulfill === null || rawFulfill === undefined || rawFulfill === '')
              ? null
              : (Number(rawFulfill) as any);

          const rawSupply = (l.SupplyMethodId ?? l.supplyMethodId ?? l.supplyMethod ?? l.SupplyMethod);
          let supplyMethod: SupplyMethod = null;
          const n = Number(rawSupply);
          if (n === 1 || n === 2) supplyMethod = n as SupplyMethod;

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
            supplyMethod,

            isSellable: !!(l.isSellable ?? l.IsSellable),
            isConsumable: !!(l.isConsumable ?? l.IsConsumable),

            warehouses: [],
            availability: undefined
          };

          this.applyFlagsFromFulfillmentMode(ln);
          this.applyFulfillmentFromFlagsIfEmpty(ln);
          this.applySupplyFromFulfillment(ln);
          this.computeLine(ln);

          return ln;
        });

        // ✅ bulk flags -> then availability
        this.loadFlagsForSoLines(this.soLines);

        this.computeTotals();
        this.buildSetGroups();

        // ✅ if you want immediate availability even before flags response:
        this.refreshAvailabilityForAllLines();
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

        this.availabilityCache.clear();

        this.soLines = lines.map((l: any) => {
          const qty = Number(l.qty ?? l.quantity ?? 0);
          const price = Number(l.unitPrice ?? 0);
          const discPct = Number(l.discountPct ?? l.discount ?? 0);
          const mode = this.canonicalTaxMode(l.taxMode ?? l.tax, gst);

          const rawFulfill = (l.fulfillmentMode ?? l.FulfillmentMode);
          const fulfillmentMode: FulfillmentMode =
            (rawFulfill === null || rawFulfill === undefined || rawFulfill === '')
              ? null
              : (Number(rawFulfill) as any);

          const rawSupply = (l.SupplyMethodId ?? l.supplyMethodId ?? l.supplyMethod ?? l.SupplyMethod);
          let supplyMethod: SupplyMethod = null;
          const n = Number(rawSupply);
          if (n === 1 || n === 2) supplyMethod = n as SupplyMethod;

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

            isSellable: !!(l.isSellable ?? l.IsSellable),
            isConsumable: !!(l.isConsumable ?? l.IsConsumable),

            warehouses: Array.isArray(l.warehouses) ? l.warehouses : [],
            availability: undefined
          };

          this.applyFlagsFromFulfillmentMode(ln);
          this.applyFulfillmentFromFlagsIfEmpty(ln);
          this.applySupplyFromFulfillment(ln);
          this.computeLine(ln);

          return ln;
        });

        // ✅ bulk flags -> then availability refresh
        this.loadFlagsForSoLines(this.soLines);

        this.computeTotals();
        this.buildSetGroups();

        // ✅ immediate availability (if supplyMethod already present from quotation line)
        this.refreshAvailabilityForAllLines();
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

  /* ================= DROPDOWN (FULL FIX) ================= */
  private closeAllDropdowns() {
    Object.keys(this.dropdownOpen).forEach(k => (this.dropdownOpen[k] = false));
  }

  openDropdown(field: 'quotationNo' | 'customer' | 'warehouse') {
    if (this.editMode) return;

    Object.keys(this.dropdownOpen).forEach(k => (this.dropdownOpen[k] = false));
    this.dropdownOpen[field] = true;

    if (field === 'quotationNo') this.filteredLists[field] = [...this.quotationList];
    if (field === 'customer') this.filteredLists[field] = [...this.customers];
    if (field === 'warehouse') this.filteredLists[field] = [...this.warehousesMaster];

    this.filter(field);
  }

  toggleDropdown(field: 'quotationNo' | 'customer' | 'warehouse', open?: boolean) {
    if (this.editMode) return;

    const next = open !== undefined ? open : !this.dropdownOpen[field];
    Object.keys(this.dropdownOpen).forEach(k => (this.dropdownOpen[k] = false));
    this.dropdownOpen[field] = next;

    if (next) {
      if (field === 'quotationNo') this.filteredLists[field] = [...this.quotationList];
      if (field === 'customer') this.filteredLists[field] = [...this.customers];
      if (field === 'warehouse') this.filteredLists[field] = [...this.warehousesMaster];
      this.filter(field);
    }
  }

  onInputSearch(field: 'quotationNo' | 'customer' | 'warehouse') {
    if (this.editMode) return;
    if (!this.dropdownOpen[field]) this.openDropdown(field);
    this.filter(field);
  }

  filter(field: 'quotationNo' | 'customer' | 'warehouse') {
    const q = (this.searchTexts[field] || '').toLowerCase().trim();

    if (field === 'quotationNo') {
      this.filteredLists[field] = (this.quotationList || []).filter(x =>
        String(x.number || '').toLowerCase().includes(q)
      );
      return;
    }

    if (field === 'customer') {
      this.filteredLists[field] = (this.customers || []).filter(x =>
        String(x.customerName || x.name || '').toLowerCase().includes(q)
      );
      return;
    }

    this.filteredLists[field] = (this.warehousesMaster || []).filter(x =>
      String(x.warehouseName || '').toLowerCase().includes(q) || String(x.id).includes(q)
    );
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
    this.availabilityCache.clear();

    this.recalcTotals();
  }

  /* ✅ close when clicking outside */
  @HostListener('document:click', ['$event'])
  onDocClick(e: MouseEvent) {
    const el = e.target as HTMLElement;
    if (el.closest('.soDD')) return;
    this.closeAllDropdowns();
  }

  /* ✅ ESC close */
  @HostListener('document:keydown.escape', ['$event'])
  onEsc(ev: KeyboardEvent) {
    this.closeAllDropdowns();
  }

  /* ================= UI EVENTS ================= */
  onSupplyMethodChangedByRef(ln: SoLine) {
    const v: any = ln.supplyMethod;
    const n = (v === null || v === undefined || v === '') ? null : Number(v);
    ln.supplyMethod = (n === 1 || n === 2) ? (n as any) : null;

    this.applySupplyFromFulfillment(ln);

    // ✅ supplyMethod changed => refresh availability for that line
    this.fetchAvailabilityForLine(ln);
  }

  // ✅ call this when Item dropdown selection happens (if you have such event)
  onItemChangedByRef(ln: SoLine) {
    // itemId updated => clear cache for that item/supply pair and refetch
    ln.availability = undefined;
    this.fetchAvailabilityForLine(ln);
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
      warehouses: [],
      availability: undefined
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

    const badFulfill = this.soLines.find(l => l.fulfillmentMode !== 1 && l.fulfillmentMode !== 2 && l.fulfillmentMode !== 3);
    if (badFulfill) {
      Swal.fire({ icon: 'warning', title: 'Required', text: 'Fulfillment (Sellable/Consumable/Both) is missing for some lines.' });
      return false;
    }

    const badSupply = this.soLines.find(l => l.supplyMethod !== 1 && l.supplyMethod !== 2);
    if (badSupply) {
      Swal.fire({ icon: 'warning', title: 'Required', text: 'Please select Supply Method (PP / Direct DO) for all lines.' });
      return false;
    }

    // ✅ optional: validate locationId exists
    if (!(Number(this.locationId || 0) > 0)) {
      Swal.fire({ icon: 'warning', title: 'Location Missing', text: 'LocationId not found in localStorage.' });
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
  locationId: this.locationId, 
        quantity: Number(l.qty) || 0,
        unitPrice: Number(l.unitPrice) || 0,
        discount: Number(l.discountPct) || 0,
        tax: l.taxMode || null,
        taxAmount: Number(l.lineTax || 0),
        total: Number(l.lineTotal) || 0,

        fulfillmentMode: l.fulfillmentMode ?? null,
        SupplyMethodId: l.supplyMethod ?? null,

        createdBy: this.userId,
        updatedBy: this.userId
      })),

      totals: t
    };
  }

  private ensureAvailabilityBeforeSave(): Promise<void> {
  return new Promise<void>((resolve) => {
    // trigger fetch for any lines missing availability
    (this.soLines || []).forEach(ln => {
      if (ln.availability === undefined || ln.availability === null) {
        this.fetchAvailabilityForLine(ln);
      }
    });

    // wait a short tick (since your api is async, we just give UI 1 micro delay)
    // If you want strict, then backend must validate too.
    setTimeout(() => resolve(), 250);
  });
}
async post(): Promise<void> {
  if (!this.validateSO()) return;

  // ✅ ensure availability fetched before checking shortage
  await this.ensureAvailabilityBeforeSave();

  // 🔴 STEP 1: detect Direct DO shortage
  const shortageLines = this.getDirectDoShortageLines();

  if (shortageLines.length) {
    const txt = shortageLines
      .map(l => {
        const req = Number(l.qty) || 0;
        const avl = Number(l.availability ?? 0) || 0;   // ✅ safe
        return `${l.item} | Req: ${req} | Avl: ${avl}`;
      })
      .join('\n');

    const res = await Swal.fire({
      icon: 'warning',
      title: 'Stock Not Available',
      text:
        `Some Direct DO items do not have enough stock.\n\n` +
        `${txt}\n\n` +
        `PR will be auto-created and PO alert will be sent.\nContinue?`,
      showCancelButton: true,
      confirmButtonText: 'Yes, Continue',
      cancelButtonText: 'No',
      confirmButtonColor: '#0e3a4c'
    });

    if (!res.isConfirmed) return;
  }

  // 🔴 STEP 2: Save SO normally
  const payload = this.buildPayload();

  const req$ = this.editMode
    ? this.salesOrderService.updateSO(payload)
    : this.salesOrderService.insertSO(payload);

  req$.subscribe({
    next: (res: any) => {
      const prCreated = !!res?.data?.prCreated;
      const poAlert = !!res?.data?.poAlertSent;
      const prNos = res?.data?.prNos || [];

      let html = 'Sales Order saved successfully.';

      if (prCreated) {
        html += `<br/><br/><b>PR Auto Created</b>`;
        if (prNos.length) {
          html += `<br/>PR No: ${prNos.join(', ')}`;
        }
      }

      if (poAlert) {
        html += `<br/><b>PO Team Alert Sent</b>`;
      }

      Swal.fire({
        icon: 'success',
        title: 'Success',
        html,
        confirmButtonColor: '#0e3a4c'
      }).then(() => {
        this.router.navigate(['/Sales/Sales-Order-list']);
      });
    },
    error: (err) => {
      Swal.fire({
        icon: 'error',
        title: 'Error',
        text: err?.error?.message || 'Failed to save Sales Order',
        confirmButtonColor: '#d33'
      });
    }
  });
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

  private getDirectDoShortageLines() {
  return (this.soLines || []).filter(l =>
    Number(l.supplyMethod) === 2 &&           // Direct DO
    Number(l.itemId || 0) > 0 &&
    (Number(l.qty) || 0) > 0 &&
    Number(l.availability ?? 0) < Number(l.qty)
  );
}
  cancel() {
    this.router.navigate(['/Sales/Sales-Order-list']);
  }
}


function safeJsonParse<T>(txt: string, fallback: T): T {
  try { return JSON.parse(txt) as T; } catch { return fallback; }
}