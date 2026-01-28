import {
  Component,
  ElementRef,
  HostListener,
  OnInit,
  ViewChild,
  ViewEncapsulation
} from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import Swal from 'sweetalert2';

import { ItemsService } from 'app/main/master/items/items.service';
import { ChartofaccountService } from 'app/main/financial/chartofaccount/chartofaccount.service';
import { UomService } from 'app/main/master/uom/uom.service';
import { CountriesService } from 'app/main/master/countries/countries.service';
import { CustomerMasterService } from 'app/main/businessPartners/customer-master/customer-master.service';
import { CurrencyService } from 'app/main/master/currency/currency.service';
import { PaymentTermsService } from 'app/main/master/payment-terms/payment-terms.service';
import { QuotationHeader, QuotationLine, QuotationsService } from '../quotations.service';
import { ItemsetService } from 'app/main/master/itemset/itemsetservice/itemset.service';

type SimpleItem = { id: number; itemName: string; itemCode?: string; uomId?: number; catagoryName: string };
type LineTaxMode = 'Standard-Rated' | 'Zero-Rated' | 'Exempt';
type Country = { id: number; countryName: string; gstPercentage: number };
type Customer = { id: number; name: string; countryId: number };
type CurrencyRow = { id: number; name: string };
type PaymentTermsRow = { id: number; name: string };
type DiscountType = 'VALUE' | 'PERCENT';
type LineSource = 'ITEM' | 'ITEMSET';
type ItemSetHeaderRow = { id: number; setName: string; description?: string };

type UiLine = Omit<QuotationLine, 'uom' | 'uomId'> & {
  uomId: number | null;
  description?: string;

  taxMode?: LineTaxMode;
  taxCodeId?: number | null;
  lineNet?: number;
  lineTax?: number;
  lineTotal?: number;

  isSetHeader?: boolean;
  itemSetId?: number | null;
  setName?: string;
  isFromSet?: boolean;

  itemName?: string;

  // ✅ extra helper to backfill if needed
  uomName?: string | null;
};

type UiQuotationHeader = Omit<QuotationHeader, 'validityDate'> & {
  deliveryDate: string | null;
  remarks?: string;
  deliveryTo?: string;

  taxPct?: number;
  countryId?: number | null;
  currency?: string;
  paymentTerms?: string;

  discountType: DiscountType;
  discountInput: number;
  docDiscount: number;
  discountManual: boolean;

  lineSource: LineSource;
};

@Component({
  selector: 'app-quotationscreate',
  templateUrl: './quotationscreate.component.html',
  styleUrls: ['./quotationscreate.component.scss'],
  encapsulation: ViewEncapsulation.None
})
export class QuotationscreateComponent implements OnInit {
  // dropdown containers (page)
  @ViewChild('customerBox') customerBox!: ElementRef<HTMLElement>;
  @ViewChild('currencyBox') currencyBox!: ElementRef<HTMLElement>;
  @ViewChild('paymentBox') paymentBox!: ElementRef<HTMLElement>;
  @ViewChild('itemSetBox') itemSetBox!: ElementRef<HTMLElement>;

  // modal refs
  @ViewChild('modalItemBox') modalItemBox!: ElementRef<HTMLElement>;
  @ViewChild('itemSearchInput', { static: false }) itemSearchInput!: ElementRef<HTMLInputElement>;

  header: UiQuotationHeader = {
    status: 0,
    customerId: null,
    currencyId: 0,
    fxRate: 1,
    paymentTermsId: 0,
    deliveryDate: null,

    subtotal: 0,
    taxAmount: 0,
    rounding: 0,
    grandTotal: 0,
    needsHodApproval: false,

    remarks: '',
    deliveryTo: '',

    lines: [],

    taxPct: 0,
    countryId: null,
    currency: '',
    paymentTerms: '',

    discountType: 'PERCENT',
    discountInput: 0,
    docDiscount: 0,
    discountManual: false,

    lineSource: 'ITEM'
  };

  minDate = '';

  // lookups
  customers: Customer[] = [];
  countries: Country[] = [];
  activeCustomerCountry: Country | null = null;

  currenciesSrv: CurrencyRow[] = [];
  currencySearch = '';
  currencyDdOpen = false;
  filteredCurrencies: CurrencyRow[] = [];

  paymentTermsSrv: PaymentTermsRow[] = [];
  paymentTermsSearch = '';
  paymentTermsDdOpen = false;
  filteredPaymentTerms: PaymentTermsRow[] = [];

  customerSearch = '';
  customerDdOpen = false;
  filteredCustomers: Customer[] = [];

  itemsList: SimpleItem[] = [];
  uomList: Array<{ id: number; name: string }> = [];

  // ✅ uomName -> uomId map
  private uomNameToId = new Map<string, number>();

  // grid lines
  lines: UiLine[] = [];
  hoverAdd = false;

  // itemset multi
  itemSets: ItemSetHeaderRow[] = [];
  itemSetSearch = '';
  itemSetDdOpen = false;
  filteredItemSets: ItemSetHeaderRow[] = [];
  selectedItemSets: ItemSetHeaderRow[] = [];
  pendingItemSet: ItemSetHeaderRow | null = null;

  private editId: number | null = null;

  // modal state
  showModal = false;
  editingIndex: number | null = null;

  modal: {
    itemId: number | null;
    itemSearch: string;
    qty: number | null;
    uomId: number | null;
    unitPrice: number | null;
    discountPct: number | null;
    taxMode: LineTaxMode;
    description: string;
    dropdownOpen: boolean;
    filteredItems: SimpleItem[];
  } = {
    itemId: null,
    itemSearch: '',
    qty: null,
    uomId: null,
    unitPrice: null,
    discountPct: 0,
    taxMode: 'Standard-Rated',
    description: '',
    dropdownOpen: false,
    filteredItems: []
  };

  modalPreview: { net: number; tax: number; total: number } | null = null;

  constructor(
    private router: Router,
    private route: ActivatedRoute,
    private qt: QuotationsService,
    private chartOfAccountService: ChartofaccountService,
    private itemsService: ItemsService,
    private uomService: UomService,
    private countriesService: CountriesService,
    private customerService: CustomerMasterService,
    private currencyService: CurrencyService,
    private paymentTermsService: PaymentTermsService,
    private itemSetService: ItemsetService
  ) {}

  // =========================
  // ✅ UOM Helpers
  // =========================
  private normalizeUomName(v: any): string {
    return String(v ?? '').trim().toLowerCase();
  }

  private rebuildUomMap() {
    this.uomNameToId.clear();
    for (const u of this.uomList || []) {
      const key = this.normalizeUomName(u.name);
      if (key) this.uomNameToId.set(key, u.id);
    }
  }

  private getUomIdFromItemMaster(itemId: number): number | null {
    const it = this.itemsList.find(x => x.id === itemId);
    return (it?.uomId ?? null) as any;
  }

  private resolveUomIdFromItemSetRow(row: any, itemId: number): number | null {
    // 1) if API gives uomId
    const rawUomId = row?.uomId ?? row?.UomId;
    if (rawUomId !== null && rawUomId !== undefined && rawUomId !== '') {
      const n = Number(rawUomId);
      if (!Number.isNaN(n) && n > 0) return n;
    }

    // 2) if API gives uomName (your case)
    const uomName = row?.uomName ?? row?.UomName;
    const key = this.normalizeUomName(uomName);
    if (key && this.uomNameToId.has(key)) return this.uomNameToId.get(key)!;

    // 3) fallback from item master
    return this.getUomIdFromItemMaster(itemId);
  }

  private backfillMissingUoms() {
    if (!this.lines?.length) return;
    let changed = false;

    for (const l of this.lines) {
      if (l.isSetHeader) continue;
      if ((l.uomId === null || l.uomId === undefined) && l.uomName) {
        const key = this.normalizeUomName(l.uomName);
        const id = key ? this.uomNameToId.get(key) : null;
        if (id) {
          l.uomId = id;
          changed = true;
        }
      }
    }

    if (changed) this.computeTotals();
  }

  // =========================
  // TaxMode → TaxCodeId mapping
  // =========================
  private taxModeToTaxCodeId(mode?: LineTaxMode): number {
    switch (mode) {
      case 'Standard-Rated': return 1;
      case 'Zero-Rated': return 2;
      case 'Exempt': return 3;
      default: return 1;
    }
  }

  get taxModesForCurrentGst(): LineTaxMode[] {
    const gst = +this.header.taxPct || 0;
    if (gst === 9) return ['Standard-Rated', 'Zero-Rated', 'Exempt'];
    return ['Zero-Rated'];
  }

  ngOnInit(): void {
    this.setMinDate();
    this.loadLookups();

    const idStr = this.route.snapshot.paramMap.get('id');
    this.editId = idStr ? +idStr : null;
  }

  // close dropdowns when clicking outside
  @HostListener('document:click', ['$event'])
  onDocClick(ev: MouseEvent) {
    const t = ev.target as Node;

    if (this.customerDdOpen && this.customerBox && !this.customerBox.nativeElement.contains(t)) this.customerDdOpen = false;
    if (this.currencyDdOpen && this.currencyBox && !this.currencyBox.nativeElement.contains(t)) this.currencyDdOpen = false;
    if (this.paymentTermsDdOpen && this.paymentBox && !this.paymentBox.nativeElement.contains(t)) this.paymentTermsDdOpen = false;
    if (this.itemSetDdOpen && this.itemSetBox && !this.itemSetBox.nativeElement.contains(t)) this.itemSetDdOpen = false;

    // modal dropdown close (outside item box)
    if (this.showModal && this.modal.dropdownOpen && this.modalItemBox && !this.modalItemBox.nativeElement.contains(t)) {
      this.modal.dropdownOpen = false;
    }
  }

  @HostListener('document:keydown.escape')
  onEsc() {
    this.customerDdOpen = this.currencyDdOpen = this.paymentTermsDdOpen = false;
    this.itemSetDdOpen = false;
    if (this.showModal) this.closeModal();
  }

  setMinDate() {
    const d = new Date();
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    this.minDate = `${yyyy}-${mm}-${dd}`;
  }

  round2(n: number) {
    return Math.round((n + Number.EPSILON) * 100) / 100;
  }

  statusLabel(s: number) {
    return ['Draft', 'Submitted', 'Approved', 'Rejected', 'Posted'][s] ?? 'Draft';
  }

  getItemName(id?: number | null) {
    return this.itemsList.find(x => x.id === id)?.itemName;
  }

  getUomName = (id?: number | null) => this.uomList.find(u => u.id === id)?.name ?? '';

  // switch source
  onLineSourceChange() {
    if (this.showModal) this.closeModal();

    if (this.header.lineSource === 'ITEM') {
      this.selectedItemSets = [];
      this.pendingItemSet = null;
      this.itemSetSearch = '';
      this.lines = this.lines.filter(l => !l.isFromSet && !l.isSetHeader);
    }
    this.computeTotals();
  }

  onLineChanged(i: number) {
    const l = this.lines[i];
    if (!l || l.isSetHeader) return;

    const qty = l.qty === null || l.qty === undefined ? 0 : +l.qty;
    const price = l.unitPrice === null || l.unitPrice === undefined ? 0 : +l.unitPrice;

    l.qty = qty < 0 ? 0 : qty;
    l.unitPrice = price < 0 ? 0 : price;

    const disc = +l.discountPct || 0;
    l.discountPct = Math.min(100, Math.max(0, disc));

    l.taxCodeId = this.taxModeToTaxCodeId(l.taxMode);
    this.computeLine(l);
    this.computeTotals();
  }

  // Load lookups
  loadLookups() {
    this.chartOfAccountService.getAllChartOfAccount().subscribe(() => {
      this.itemsService.getAllItem().subscribe((ires: any) => {
        const raw = ires?.data ?? [];
        this.itemsList = raw.map((item: any) => ({
          id: Number(item.id ?? item.itemId ?? 0),
          itemName: item.itemName ?? item.name ?? '',
          itemCode: item.itemCode ?? '',
          uomId: Number(item.uomId ?? item.UomId ?? item.uomid ?? 0),
          catagoryName: item.catagoryName
        })) as SimpleItem[];

        // if modal open and dropdown open -> refresh list
        if (this.showModal && this.modal.dropdownOpen) {
          this.filterModalItemsOnly();
        }
      });
    });

    this.uomService.getAllUom().subscribe((res: any) => {
      this.uomList = (res?.data ?? []).map((u: any) => ({
        id: Number(u.id ?? u.Id),
        name: String(u.name ?? u.Name ?? '').trim()
      }));

      // ✅ build uomName->uomId map
      this.rebuildUomMap();

      // ✅ if itemset lines already added before uomlist comes
      this.backfillMissingUoms();
    });

    this.countriesService.getCountry().subscribe((res: any) => {
      this.countries = (res?.data ?? []).map((c: any) => ({
        id: Number(c.id ?? c.Id),
        countryName: String(c.countryName ?? c.CountryName ?? '').trim(),
        gstPercentage: Number(c.gstPercentage ?? c.GSTPercentage ?? 0)
      }));

      this.customerService.getAllCustomerMaster().subscribe((cres: any) => {
        const arr = cres?.data ?? [];
        this.customers = arr.map((c: any) => ({
          id: Number(c.id ?? c.Id),
          name: String(c.customerName ?? c.CustomerName ?? '').trim(),
          countryId: Number(c.countryId ?? c.CountryId ?? 0)
        }));
      });
    });

    this.currencyService.getAllCurrency().subscribe((res: any) => {
      const data = res?.data ?? res ?? [];
      this.currenciesSrv = data.map((r: any) => ({
        id: Number(r.id ?? r.Id),
        name: String(r.currencyName ?? r.CurrencyName ?? '').trim()
      })) as CurrencyRow[];
    });

    this.paymentTermsService.getAllPaymentTerms().subscribe((res: any) => {
      const data = res?.data ?? res ?? [];
      this.paymentTermsSrv = data.map((r: any) => ({
        id: Number(r.id ?? r.Id),
        name: String(r.paymentTermsName ?? r.PaymentTermsName ?? '').trim()
      })) as PaymentTermsRow[];
    });

    this.itemSetService.getAllItemSet().subscribe((res: any) => {
      const data = res?.data ?? res ?? [];
      this.itemSets = data.map((x: any) => ({
        id: Number(x.id ?? x.Id),
        setName: String(x.setName ?? x.SetName ?? x.name ?? '').trim(),
        description: String(x.description ?? x.Description ?? '').trim()
      })) as ItemSetHeaderRow[];
    });
  }

  // Customer
  openCustomerDropdown() {
    this.customerDdOpen = true;
    this.filteredCustomers = (this.customers || []).slice(0, 50);
  }

  filterCustomers() {
    const q = (this.customerSearch || '').trim().toLowerCase();
    this.filteredCustomers = !q
      ? (this.customers || []).slice(0, 50)
      : (this.customers || []).filter(c => (c.name || '').toLowerCase().includes(q)).slice(0, 50);
    this.customerDdOpen = true;
  }

  selectCustomer(c: Customer) {
    this.customerSearch = c.name;
    this.customerDdOpen = false;
    this.onCustomerChange(c.id);
  }

  onCustomerChange(custId: number | null) {
    this.header.customerId = custId;
    const cust = this.customers.find(x => x.id === custId) || null;
    this.header.countryId = cust?.countryId ?? null;

    const country = this.countries.find(c => c.id === (cust?.countryId ?? -1)) || null;
    this.activeCustomerCountry = country;
    this.header.taxPct = country?.gstPercentage ?? 0;

    const gst = +this.header.taxPct || 0;
    if (gst !== 9) {
      this.lines.forEach(l => {
        if (!l.isSetHeader && (l.taxMode === 'Standard-Rated' || l.taxMode === 'Exempt')) {
          l.taxMode = 'Zero-Rated';
          l.taxCodeId = this.taxModeToTaxCodeId('Zero-Rated');
          this.computeLine(l);
        }
      });
    }

    if (this.showModal) {
      if ((+this.header.taxPct || 0) !== 9 && this.modal.taxMode !== 'Zero-Rated') {
        this.modal.taxMode = 'Zero-Rated';
      }
      this.previewLineTotals();
    }

    this.computeTotals();
  }

  // Currency
  openCurrencyDropdown() {
    this.currencyDdOpen = true;
    this.filteredCurrencies = this.currenciesSrv.slice();
  }

  filterCurrencies() {
    const q = (this.currencySearch || '').trim().toUpperCase();
    this.filteredCurrencies = !q
      ? this.currenciesSrv.slice()
      : this.currenciesSrv.filter(c => c.name.toUpperCase().includes(q));
    this.currencyDdOpen = true;
  }

  selectCurrency(cur: CurrencyRow) {
    this.currencySearch = cur.name;
    this.currencyDdOpen = false;
    this.header.currencyId = cur.id;
    this.header.currency = cur.name;
    this.computeTotals();
  }

  // Payment terms
  openPaymentTermsDropdown() {
    this.paymentTermsDdOpen = true;
    this.filteredPaymentTerms = this.paymentTermsSrv.slice();
  }

  filterPaymentTerms() {
    const q = (this.paymentTermsSearch || '').trim().toLowerCase();
    this.filteredPaymentTerms = !q
      ? this.paymentTermsSrv.slice()
      : this.paymentTermsSrv.filter(p => p.name.toLowerCase().includes(q));
    this.paymentTermsDdOpen = true;
  }

  selectPaymentTerms(p: PaymentTermsRow) {
    this.paymentTermsSearch = p.name;
    this.paymentTermsDdOpen = false;
    this.header.paymentTermsId = p.id;
    this.header.paymentTerms = p.name;
  }

  // ItemSet Multi-select
  trackByItemSetId = (_: number, s: ItemSetHeaderRow) => s.id;

  toggleItemSetDropdown() {
    this.itemSetDdOpen = !this.itemSetDdOpen;
    if (this.itemSetDdOpen) this.filterItemSets();
  }

  openItemSetDropdown() {
    this.itemSetDdOpen = true;
    this.filteredItemSets = (this.itemSets || []).slice(0, 60);
  }

  filterItemSets() {
    const q = (this.itemSetSearch || '').trim().toLowerCase();
    this.filteredItemSets = !q
      ? (this.itemSets || []).slice(0, 60)
      : (this.itemSets || []).filter(s => (s.setName || '').toLowerCase().includes(q)).slice(0, 60);
    this.itemSetDdOpen = true;
  }

  selectItemSetCandidate(s: ItemSetHeaderRow) {
    this.pendingItemSet = s;
    this.itemSetSearch = s.setName;
    this.itemSetDdOpen = false;
  }

  addSelectedItemSet() {
    if (!this.pendingItemSet) return;
    const set = this.pendingItemSet;

    if (this.selectedItemSets.some(x => x.id === set.id)) {
      Swal.fire({ icon: 'info', title: 'Already added', text: 'This item set already added', confirmButtonColor: '#2E5F73' });
      return;
    }

    this.selectedItemSets.push(set);
    this.pendingItemSet = null;
    this.itemSetSearch = '';
    this.itemSetDdOpen = false;

    this.loadItemSetItemsAndAppend(set.id, set.setName);
  }

  removeItemSet(setId: number) {
    this.selectedItemSets = this.selectedItemSets.filter(s => s.id !== setId);
    this.lines = this.lines.filter(l => l.itemSetId !== setId);
    this.computeTotals();
  }

  private loadItemSetItemsAndAppend(itemSetId: number, setName: string) {
    this.itemSetService.getByIdItemSet(itemSetId).subscribe((res: any) => {
      const dto = res?.data ?? res ?? null;
      if (!dto) return;

      const items: any[] = dto.items ?? dto.itemSetItems ?? dto.lines ?? [];

      // set header row
      this.lines.push({
        itemId: 0,
        uomId: null,
        qty: 0,
        unitPrice: 0,
        discountPct: 0,
        taxMode: 'Zero-Rated',
        isSetHeader: true,
        isFromSet: true,
        itemSetId,
        setName,
        description: ''
      } as UiLine);

      const defaultTax: LineTaxMode = (+this.header.taxPct || 0) === 9 ? 'Standard-Rated' : 'Zero-Rated';

      for (const it of items) {
        const itemId = Number(it.itemId ?? it.ItemId ?? it.id ?? it.ItemMasterId ?? 0);
        if (!itemId) continue;

        // ✅ IMPORTANT FIX: resolve uomId from uomName/uomId/itemmaster
        const uomId = this.resolveUomIdFromItemSetRow(it, itemId);

        const line: UiLine = {
          itemId,
          itemName: String(it.itemName ?? it.ItemName ?? this.getItemName(itemId) ?? ''),
          uomId,
          qty: null as any,
          unitPrice: null as any,
          discountPct: 0,
          description: String(it.description ?? it.Description ?? ''),
          taxMode: defaultTax,
          taxCodeId: this.taxModeToTaxCodeId(defaultTax),
          isFromSet: true,
          itemSetId,
          setName,
          isSetHeader: false,

          // keep uomName for backfill if needed
          uomName: it.uomName ?? it.UomName ?? null
        };

        this.computeLine(line);
        this.lines.push(line);
      }

      this.computeTotals();
    });
  }

  // Discount
  onDiscountChange() {
    this.header.discountManual = true;
    this.computeTotals();
  }

  onDiscountTypeChange(raw: string) {
    const newType = (raw === 'VALUE' ? 'VALUE' : 'PERCENT') as DiscountType;

    const subtotal = +this.header.subtotal || 0;
    const input = +this.header.discountInput || 0;

    if (newType === 'VALUE') {
      const pct = Math.min(Math.max(input, 0), 100);
      this.header.discountInput = this.round2(subtotal * (pct / 100));
    } else {
      this.header.discountInput = subtotal > 0 ? this.round2((input * 100) / subtotal) : 0;
    }

    this.header.discountType = newType;
    this.header.discountManual = true;
    this.computeTotals();
  }

  // Line calculation
  private computeLine(l: UiLine): { base: number; discount: number } {
    if (l.isSetHeader) {
      l.lineNet = l.lineTax = l.lineTotal = 0;
      return { base: 0, discount: 0 };
    }

    const qty = l.qty === null || l.qty === undefined ? 0 : +l.qty;
    const price = l.unitPrice === null || l.unitPrice === undefined ? 0 : +l.unitPrice;

    const discP = Math.min(Math.max(+l.discountPct || 0, 0), 100);

    const gross = qty * price;
    const discountAmt = gross * (discP / 100);
    const afterDisc = gross - discountAmt;

    const rate = l.taxMode === 'Standard-Rated' ? +this.header.taxPct || 0 : 0;

    l.lineNet = this.round2(afterDisc);
    l.lineTax = this.round2(rate > 0 ? (afterDisc * rate) / 100 : 0);
    l.lineTotal = this.round2((l.lineNet || 0) + (l.lineTax || 0));

    return { base: gross, discount: discountAmt };
  }

  computeTotals() {
    let baseSubtotal = 0;
    let lineDiscTotal = 0;
    let tax = 0;
    let hod = false;

    for (const l of this.lines) {
      if (l.isSetHeader) continue;

      const { base, discount } = this.computeLine(l);
      baseSubtotal += base;
      lineDiscTotal += discount;
      tax += l.lineTax || 0;

      if ((+l.discountPct || 0) > 10) hod = true;
    }

    this.header.subtotal = this.round2(baseSubtotal);
    this.header.taxAmount = this.round2(tax);

    let discountAmt: number;

    if (this.header.discountManual) {
      const input = +this.header.discountInput || 0;
      if (this.header.discountType === 'PERCENT') {
        discountAmt = this.header.subtotal * (Math.min(Math.max(input, 0), 100) / 100);
      } else {
        discountAmt = input;
      }
    } else {
      discountAmt = lineDiscTotal;
    }

    discountAmt = Math.min(Math.max(discountAmt, 0), this.header.subtotal);
    this.header.docDiscount = this.round2(discountAmt);

    const rounding = this.header.rounding || 0;
    const netAfterDiscount = this.header.subtotal - this.header.docDiscount;
    this.header.grandTotal = this.round2(netAfterDiscount + this.header.taxAmount + rounding);

    this.header.needsHodApproval = hod;
  }

  private validateBeforeSave(): boolean {
    if (this.header.lineSource === 'ITEMSET') {
      for (const l of this.lines) {
        if (l.isSetHeader) continue;
        const q = l.qty === null || l.qty === undefined ? 0 : +l.qty;
        const p = l.unitPrice === null || l.unitPrice === undefined ? 0 : +l.unitPrice;

        if (q <= 0 || p <= 0) {
          Swal.fire({
            icon: 'warning',
            title: 'Enter Qty & Unit Price',
            text: `Please enter Qty & Unit Price for item: ${l.itemName || this.getItemName(l.itemId)}`,
            confirmButtonColor: '#2E5F73'
          });
          return false;
        }
      }
    }
    return true;
  }

  save() {
    if (!this.validateBeforeSave()) return;

    const dto: any = {
      ...this.header,
      remarks: (this.header.remarks || '').trim(),
      deliveryTo: (this.header.deliveryTo || '').trim(),
      deliveryDate: this.header.deliveryDate,
      validityDate: this.header.deliveryDate,
      lineSource: this.header.lineSource,

      lines: this.lines
        .filter(l => !l.isSetHeader)
        .map(l => ({
          ...l,
          description: (l.description || '').trim(),
          uomId: l.uomId ?? null,
          qty: +l.qty || 0,
          unitPrice: +l.unitPrice || 0,
          discountPct: +l.discountPct || 0,
          taxMode: l.taxMode || 'Zero-Rated',
          taxCodeId: l.taxCodeId ?? this.taxModeToTaxCodeId(l.taxMode),
          itemSetId: l.itemSetId ?? null,
          setName: l.setName ?? null,
          isFromSet: !!l.isFromSet
        }))
    };

    if (!dto.number || !dto.number.trim?.()) {
      dto.number = `QT-${new Date().toISOString().replace(/\D/g, '').slice(0, 14)}`;
    }

    if (dto.id) {
      this.qt.update(dto.id, dto).subscribe({
        next: () => {
          Swal.fire({ icon: 'success', title: 'Updated', text: 'Quotation Updated Successfully', confirmButtonColor: '#2E5F73' });
          this.router.navigate(['/Sales/Quotation-list']);
        },
        error: () => Swal.fire({ icon: 'error', title: 'Failed', text: 'Update failed', confirmButtonColor: '#d33' })
      });
    } else {
      this.qt.create(dto).subscribe({
        next: () => {
          Swal.fire({ icon: 'success', title: 'Saved', text: 'Quotation Created Successfully', confirmButtonColor: '#2E5F73' });
          this.router.navigate(['/Sales/Quotation-list']);
        },
        error: () => Swal.fire({ icon: 'error', title: 'Failed', text: 'Create failed', confirmButtonColor: '#d33' })
      });
    }
  }

  goToList() {
    this.router.navigate(['/Sales/Quotation-list']);
  }

  // =========================================================
  // ✅ MODAL (CLICK ONLY DROPDOWN)
  // =========================================================
  trackByItemId = (_: number, it: SimpleItem) => it.id;

  openAdd() {
    if (this.header.lineSource !== 'ITEM') return;

    this.editingIndex = null;
    this.modalPreview = null;

    this.modal = {
      itemId: null,
      itemSearch: '',
      qty: null,
      uomId: null,
      unitPrice: null,
      discountPct: 0,
      taxMode: (+this.header.taxPct || 0) === 9 ? 'Standard-Rated' : 'Zero-Rated',
      description: '',
      dropdownOpen: false,
      filteredItems: []
    };

    this.showModal = true;
    document.body.classList.add('prl-modal-open');

    setTimeout(() => {
      try { this.itemSearchInput?.nativeElement?.focus(); } catch {}
    }, 0);
  }

  openEdit(i: number) {
    if (this.header.lineSource !== 'ITEM') return;

    const l = this.lines[i];
    if (!l || l.isSetHeader || l.isFromSet) return;

    this.editingIndex = i;

    this.modal = {
      itemId: l.itemId || null,
      itemSearch: l.itemName || this.getItemName(l.itemId) || '',
      qty: (l.qty as any) ?? null,
      uomId: l.uomId ?? null,
      unitPrice: (l.unitPrice as any) ?? null,
      discountPct: (l.discountPct as any) ?? 0,
      taxMode: (l.taxMode as LineTaxMode) || 'Zero-Rated',
      description: l.description ?? '',
      dropdownOpen: false,
      filteredItems: []
    };

    this.showModal = true;
    document.body.classList.add('prl-modal-open');

    this.previewLineTotals();

    setTimeout(() => {
      try { this.itemSearchInput?.nativeElement?.focus(); } catch {}
    }, 0);
  }

  closeModal() {
    this.showModal = false;
    this.modal.dropdownOpen = false;
    this.modalPreview = null;
    document.body.classList.remove('prl-modal-open');
  }

  onModalContainer(ev: MouseEvent) {
    ev.stopPropagation();
  }

  // ✅ CLICK ONLY toggle
  toggleModalItemDropdown() {
    this.modal.dropdownOpen = !this.modal.dropdownOpen;
    if (this.modal.dropdownOpen) {
      this.filterModalItemsOnly();
      setTimeout(() => {
        try { this.itemSearchInput?.nativeElement?.focus(); } catch {}
      }, 0);
    }
  }

  // ✅ typing should filter ONLY IF dropdown already open
  onModalItemInput() {
    if (!this.modal.dropdownOpen) return;
    this.filterModalItemsOnly();
  }

  // ✅ filter only (do NOT force open)
  private filterModalItemsOnly() {
    const q = (this.modal.itemSearch || '').trim().toLowerCase();

    this.modal.filteredItems = !q
      ? this.itemsList.slice(0, 120)
      : this.itemsList
          .filter(x =>
            (x.itemName || '').toLowerCase().includes(q) ||
            (x.itemCode || '').toLowerCase().includes(q)
          )
          .slice(0, 120);
  }

  selectModalItem(row: SimpleItem) {
    this.modal.itemId = row.id;
    this.modal.itemSearch = row.itemName;
    this.modal.uomId = row.uomId ?? null; // ✅ item master uomId bind
    this.modal.dropdownOpen = false;
    this.previewLineTotals();
  }

  previewLineTotals() {
    const qty = +(this.modal.qty ?? 0);
    const price = +(this.modal.unitPrice ?? 0);
    const discPct = Math.min(100, Math.max(0, +(this.modal.discountPct ?? 0)));

    const gross = qty * price;
    const discAmt = gross * (discPct / 100);
    const afterDisc = gross - discAmt;

    const gst = +this.header.taxPct || 0;
    const rate = this.modal.taxMode === 'Standard-Rated' ? gst : 0;

    const net = this.round2(afterDisc);
    const tax = this.round2(rate > 0 ? (afterDisc * rate) / 100 : 0);
    const total = this.round2(net + tax);

    if (qty > 0 || price > 0 || discPct > 0) this.modalPreview = { net, tax, total };
    else this.modalPreview = null;
  }

  submitModal() {
    if (!this.modal.itemId) {
      Swal.fire({ icon: 'warning', title: 'Required', text: 'Item is required', confirmButtonColor: '#2E5F73' });
      return;
    }

    const payload: UiLine = {
      itemId: this.modal.itemId!,
      itemName: this.modal.itemSearch,
      uomId: this.modal.uomId ?? null,
      qty: +(this.modal.qty ?? 0),
      unitPrice: +(this.modal.unitPrice ?? 0),
      discountPct: +(this.modal.discountPct ?? 0),
      description: (this.modal.description || '').trim(),
      taxMode: this.modal.taxMode,
      taxCodeId: this.taxModeToTaxCodeId(this.modal.taxMode),
      isFromSet: false,
      isSetHeader: false,
      itemSetId: null,
      setName: ''
    };

    this.computeLine(payload);

    if (this.editingIndex === null) this.lines.push(payload);
    else this.lines[this.editingIndex] = { ...this.lines[this.editingIndex], ...payload };

    this.computeTotals();
    this.closeModal();
  }

  remove(i: number) {
    const l = this.lines[i];
    if (!l) return;

    if (l.isSetHeader && l.itemSetId) {
      this.removeItemSet(l.itemSetId);
      return;
    }

    this.lines.splice(i, 1);
    this.computeTotals();
  }
}
