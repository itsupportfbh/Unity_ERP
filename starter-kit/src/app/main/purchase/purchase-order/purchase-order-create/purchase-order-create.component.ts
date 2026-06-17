import { Component, HostListener, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { forkJoin } from 'rxjs';
import { switchMap } from 'rxjs/operators';
import Swal from 'sweetalert2';
import * as feather from 'feather-icons';

import { POService } from '../purchase-order.service';
import { IncotermsService } from 'app/main/master/incoterms/incoterms.service';
import { LocationService } from 'app/main/master/location/location.service';
import { CurrencyService } from 'app/main/master/currency/currency.service';
import { PaymentTermsService } from 'app/main/master/payment-terms/payment-terms.service';
import { ItemsService } from 'app/main/master/items/items.service';
import { ChartofaccountService } from 'app/main/financial/chartofaccount/chartofaccount.service';
import { PurchaseService } from '../../purchase.service';
import { SupplierService } from 'app/main/businessPartners/supplier/supplier.service';
import { RecurringService } from 'app/main/master/recurring/recurring.service';
import { TaxCodeService } from 'app/main/master/taxcode/taxcode.service';
import { CountriesService } from 'app/main/master/countries/countries.service';
import { POTempService } from '../purchase-order-temp.service';
import { ItemMasterService } from 'app/main/inventory/item-master/item-master.service';
import { HttpClient } from '@angular/common/http';
import { environment } from 'environments/environment';

@Component({
  selector: 'app-purchase-order-create',
  templateUrl: './purchase-order-create.component.html',
  styleUrls: ['./purchase-order-create.component.scss']
})
export class PurchaseOrderCreateComponent implements OnInit {
  private suppressNextFocusOpen: { [key: string]: boolean } = {};

  hover = false;

  poHdr: any = {
    id: 0,
    purchaseOrderNo: '',
    supplierId: 0,
    paymentTermId: 0,
    currencyId: 0,
    incotermsId: 0,
    poDate: '',
    deliveryDate: '',
    remarks: '',
    fxRate: 0,
    tax: 0,
    location: '',
    contactNumber: '',
    shipping: 0.00,
    discount: 0.00,
    subTotal: 0,
    netTotal: 0,
    approvalStatus: '',
    isOverseas: false,
    StockReorderId: 0
  };

  hasPendingSoPrAlert = false;
  pendingSoPrCount = 0;
  pendingSoPrList: any[] = [];

  purchaseOrderId: any;
  suppliers: any;
  paymentTerms: any;
  currencies: any;
  incoterms: any;
  allPrNos: any[] = [];
  allItems: any[] = [];
  accounthead: any[] = [];
  allBudgets: any[] = [];
  allRecurring: any[] = [];
  allTaxCodes: any[] = [];
  deliveries: any[] = [];
  countries: any[] = [];

  submitted: boolean;
  iserrorDelivery: boolean;
  iserrorPoDate: boolean;
  minDate = '';

  private draftId: number | null = null;
  userId: string;
  mastersLoaded = false;
  disabledButton: boolean;
  showShipping = false;

  lockHeaderByPR = false;

  ddOL = {
    open: false,
    index: -1 as number,
    field: '' as 'prNo' | 'item' | 'taxCode' | '',
    options: [] as any[],
    anchorEl: null as HTMLElement | null,
    left: 0,
    top: 0,
    width: 260,
    openUp: false
  };

  poLines: any[] = [];

  searchTexts: { [key: string]: string } = {
    supplier: '',
    paymentTerms: '',
    currency: '',
    incoterms: '',
    deliveryLoc: ''
  };

  dropdownOpen: { [key: string]: boolean } = {
    supplier: false,
    paymentTerms: false,
    currency: false,
    incoterms: false,
    deliveryLoc: false
  };

  filteredLists: { [key: string]: any[] } = {
    supplier: [],
    paymentTerms: [],
    currency: [],
    incoterms: [],
    deliveryLoc: []
  };

  requiredKeys = ['supplier', 'paymentTerms'];

  private supplierPriceCache: { [itemId: number]: any[] } = {};
  private loadingPriceFor: { [itemId: number]: boolean } = {};

  private cleanHash = '';
  private fromReorderPrId: number | null = null;
  private fromAlertPrId: number | null = null;
exchangeRate: number | null = null;
exchangeRateLoading = false;
companyCurrencyId = Number(localStorage.getItem('companyCurrencyId') || 0);
  constructor(
    private poService: POService,
    private router: Router,
    private route: ActivatedRoute,
    private paymentTermsService: PaymentTermsService,
    private currencyService: CurrencyService,
    private locationService: LocationService,
    private incotermsService: IncotermsService,
    private itemsService: ItemsService,
    private chartOfAccountService: ChartofaccountService,
    private purchaseService: PurchaseService,
    private _SupplierService: SupplierService,
    private recurringService: RecurringService,
    private taxCodeService: TaxCodeService,
    private _countriesService: CountriesService,
    private poTempService: POTempService,
    private itemsSvc: ItemMasterService,
    private http: HttpClient, 
  ) {
    this.userId = localStorage.getItem('id') || 'System';
  }

  ngOnInit() {
    this.setMinDate();

    this.route.queryParamMap.subscribe(q => {
      const dId = Number(q.get('draftId'));
      this.draftId = Number.isFinite(dId) && dId > 0 ? dId : null;

      const rId = Number(q.get('fromReorderPrId'));
      this.fromReorderPrId = Number.isFinite(rId) && rId > 0 ? rId : null;

      const pId = Number(q.get('prId'));
      this.fromAlertPrId = Number.isFinite(pId) && pId > 0 ? pId : null;
    });

    this.route.paramMap.subscribe((params: any) => {
      this.purchaseOrderId = parseInt(params.get('id'), 10);

      if (this.purchaseOrderId) {
        forkJoin({
          suppliers: this._SupplierService.GetAllSupplier(),
          paymentTerms: this.paymentTermsService.getAllPaymentTerms(),
          currency: this.currencyService.getAllCurrency(),
          incoterms: this.incotermsService.getAllIncoterms(),
          prlist: this.purchaseService.GetAvailablePurchaseRequests(),
          items: this.itemsService.getAllItem(),
          accounthead: this.chartOfAccountService.getAllChartOfAccount(),
          recurring: this.recurringService.getRecurring(),
          taxcode: this.taxCodeService.getTaxCode(),
          delivery: this.locationService.getLocation(),
          country: this._countriesService.getCountry(),
          poHdr: this.poService.getPOById(this.purchaseOrderId)
        }).subscribe({
          next: (results: any) => {
          this.suppliers = results.suppliers.data;
          this.paymentTerms = results.paymentTerms.data;
          this.currencies = results.currency.data;
          this.incoterms = results.incoterms.data;
          this.allPrNos = results.prlist.data;
          this.allItems = results.items.data;
          this.accounthead = results.accounthead.data;

          this.allBudgets = this.accounthead.map((head: any) => ({
            value: head.id,
            label: this.buildFullPath(head)
          }));

          this.allRecurring = results.recurring.data;
          this.allTaxCodes = results.taxcode.data;
          this.deliveries = results.delivery.data;
          this.countries = results.country.data;

          this.poHdr = {
            ...results.poHdr.data,
            isOverseas: !!(results.poHdr.data.isOverseas ?? results.poHdr.data.IsOverseas),
            poDate: this.toISODate(new Date(results.poHdr.data.poDate)),
            deliveryDate: this.toISODate(new Date(results.poHdr.data.deliveryDate))
          };

          delete this.poHdr.approveLevelId;
          delete this.poHdr.ApproveLevelId;

          this.filteredLists.deliveryLoc = [...(this.deliveries || [])];
          this.searchTexts['deliveryLoc'] = this.poHdr.location || '';

          this.filteredLists = {
            supplier: [...this.suppliers],
            paymentTerms: [...this.paymentTerms],
            currency: [...this.currencies],
            incoterms: [...this.incoterms],
            deliveryLoc: [...(this.deliveries || [])]
          };

          const selectedSupplier = this.suppliers?.find((d: any) => d.id === this.poHdr.supplierId);
          if (selectedSupplier) {
            this.searchTexts['supplier'] = selectedSupplier.name;
          }

          const selectedPaymentTerms = this.paymentTerms?.find((d: any) => d.id === this.poHdr.paymentTermId);
          if (selectedPaymentTerms) {
            this.searchTexts['paymentTerms'] = selectedPaymentTerms.paymentTermsName;
          }

          const selectedCurrency = this.currencies?.find((d: any) => d.id === this.poHdr.currencyId);
          if (selectedCurrency) {
            this.searchTexts['currency'] = selectedCurrency.currencyName;
            this.poHdr.isOverseas = this.poHdr.isOverseas || selectedCurrency.currencyName?.trim().toUpperCase() !== 'SGD';
            this.showShipping = !!this.poHdr.isOverseas;
            if (this.poHdr.fxRate === 0) {
    this.fetchExchangeRate(selectedCurrency.id, selectedCurrency.currencyName);
  }
          }

          const selectedIncoterms = this.incoterms?.find((d: any) => d.id === this.poHdr.incotermsId);
          if (selectedIncoterms) {
            this.searchTexts['incoterms'] = selectedIncoterms.incotermsName;
          }

          try {
            this.poLines = JSON.parse(results.poHdr.data.poLines || '[]');
          } catch {
            this.poLines = [];
          }

          this.updateHeaderLockState();
          this.calculateFxTotal();
          this.mastersLoaded = true;
          this.markClean();
          },
          error: (err) => this.handleInitialLoadError(err)
        });
      } else {
        forkJoin({
          suppliers: this._SupplierService.GetAllSupplier(),
          paymentTerms: this.paymentTermsService.getAllPaymentTerms(),
          currency: this.currencyService.getAllCurrency(),
          incoterms: this.incotermsService.getAllIncoterms(),
          prlist: this.purchaseService.GetAvailablePurchaseRequests(),
          items: this.itemsService.getAllItem(),
          accounthead: this.chartOfAccountService.getAllChartOfAccount(),
          recurring: this.recurringService.getRecurring(),
          taxcode: this.taxCodeService.getTaxCode(),
          delivery: this.locationService.getLocation(),
          country: this._countriesService.getCountry()
        }).subscribe({
          next: (results: any) => {
          this.suppliers = results.suppliers.data;
          this.paymentTerms = results.paymentTerms.data;
          this.currencies = results.currency.data;
          this.incoterms = results.incoterms.data;
          this.allItems = results.items.data;
          this.accounthead = results.accounthead.data;

          this.allBudgets = this.accounthead.map((head: any) => ({
            value: head.id,
            label: this.buildFullPath(head)
          }));

          this.allRecurring = results.recurring.data;
          this.allTaxCodes = results.taxcode.data;
          this.deliveries = results.delivery.data;
          this.countries = results.country.data;

          this.filteredLists.deliveryLoc = [...(this.deliveries || [])];
          this.searchTexts['deliveryLoc'] = this.poHdr.location || '';

          this.filteredLists = {
            supplier: [...this.suppliers],
            paymentTerms: [...this.paymentTerms],
            currency: [...this.currencies],
            incoterms: [...this.incoterms],
            deliveryLoc: [...(this.deliveries || [])]
          };

          if (this.draftId) {
            this.loadDraftIntoCreate(this.draftId);
          }

          const list = results.prlist.data || [];

          const isYes = (v: any) =>
            v === true || v === 1 || v === '1' ||
            (typeof v === 'string' && ['true', 'yes', 'y', '1'].includes(v.trim().toLowerCase()));

          if (this.fromReorderPrId) {
            const pr = list.find(x => Number(x.id) === Number(this.fromReorderPrId));
            this.allPrNos = pr ? [pr] : [];

            const lines = this.safeParsePrLines(pr?.prLines);

            const supplierIds = Array.from(
              new Set(
                lines.map((l: any) => Number(l?.supplierId)).filter((n) => Number.isFinite(n) && n > 0)
              )
            );

            if (supplierIds.length === 1) {
              const sid = supplierIds[0];
              const supplier = (this.suppliers || []).find((s: any) => s.id === sid);

              if (supplier) {
                this.searchTexts['supplier'] = supplier.name;
                this.select('supplier', supplier);
              } else {
                this.poHdr.supplierId = sid;
              }
            }

            this.poLines = lines.map((l: any) => this.mapPRLineToPOLine(pr.purchaseRequestNo, l));
            this.poLines.forEach(x => this.calculateLineTotal(x));
            this.recalculateTotals();
          } else if (this.fromAlertPrId) {
            const pr = list.find(x => Number(x.id) === Number(this.fromAlertPrId));
            this.allPrNos = pr ? [pr] : [];

            const lines = this.safeParsePrLines(pr?.prLines);

            const supplierIds = Array.from(
              new Set(lines.map((l: any) => Number(l?.supplierId)).filter((n) => Number.isFinite(n) && n > 0))
            );

            if (supplierIds.length === 1) {
              const sid = supplierIds[0];
              const supplier = (this.suppliers || []).find((s: any) => s.id === sid);

              if (supplier) {
                this.searchTexts['supplier'] = supplier.name;
                this.select('supplier', supplier);
              } else {
                this.poHdr.supplierId = sid;
              }
            }

            this.poLines = lines.map((l: any) => this.mapPRLineToPOLine(pr?.purchaseRequestNo, l));
            this.poLines.forEach(x => this.calculateLineTotal(x));
            this.recalculateTotals();
          } else {
            this.allPrNos = list.filter(p => !isYes(p.isReorder));
          }

          if (!this.draftId && !this.fromReorderPrId && !this.fromAlertPrId) {
            this.applyRfqDraftToPo(this.getRfqPoDraft());
          }

          this.mastersLoaded = true;
          this.markClean();
          },
          error: (err) => this.handleInitialLoadError(err)
        });
      }
    });

    setTimeout(() => this.markClean());
  }
fetchExchangeRate(currencyId: number, currencyName?: string): void {
  const fromCurrencyId = Number(currencyId || 0); // Supplier currency: SGD
  const toCurrencyId = Number(this.companyCurrencyId || 0); // Company currency: INR

  if (!fromCurrencyId || !toCurrencyId) {
    this.poHdr.fxRate = 0;
    Swal.fire({
      icon: 'warning',
      title: 'Company Currency Missing',
      text: 'Company base currency not found. Please set companyCurrencyId.',
      confirmButtonColor: '#0e3a4c'
    });
    return;
  }

  if (fromCurrencyId === toCurrencyId) {
    this.poHdr.fxRate = 1;
    this.exchangeRate = 1;
    this.calculateFxTotal();
    return;
  }

  this.exchangeRateLoading = true;
  const today = new Date().toISOString().substring(0, 10);

  this.http.get<any>(`${environment.apiUrl}/ExchangeRate/GetRate`, {
    params: {
      fromCurrencyId: fromCurrencyId.toString(),
      toCurrencyId: toCurrencyId.toString(),
      rateDate: today
    }
  }).subscribe({
    next: (res) => {
      this.exchangeRateLoading = false;

      if (res?.isSuccess && res?.data?.rate) {
        this.poHdr.fxRate = Number(res.data.rate); // 62
        this.exchangeRate = Number(res.data.rate);
      } else {
        this.poHdr.fxRate = 0;
        this.exchangeRate = null;

        Swal.fire({
          icon: 'warning',
          title: 'No Exchange Rate',
          text: `No rate found for ${currencyName || 'selected currency'}.`,
          confirmButtonColor: '#0e3a4c'
        });
      }

      this.calculateFxTotal();
    },
    error: () => {
      this.exchangeRateLoading = false;
      this.poHdr.fxRate = 0;
      this.exchangeRate = null;
      this.calculateFxTotal();
    }
  });
}
isBaseCurrency(): boolean {
  return Number(this.poHdr.currencyId || 0) === Number(this.companyCurrencyId || 0);
}
  ngAfterViewChecked(): void {
    feather.replace();
  }

  ngAfterViewInit(): void {
    feather.replace();
  }

  closeOverlay() {
    this.ddOL.open = false;
    this.ddOL.index = -1;
    this.ddOL.field = '';
    this.ddOL.options = [];
    this.ddOL.anchorEl = null;

    (this.poLines || []).forEach(l => (l.dropdownOpen = ''));
  }

  formatDate(date: Date | string): string {
    if (!date) return '';

    const d = new Date(date);
    const day = ('0' + d.getDate()).slice(-2);
    const month = ('0' + (d.getMonth() + 1)).slice(-2);
    const year = d.getFullYear();

    return `${day}-${month}-${year}`;
  }

  isEmpty(v: any): boolean {
    return (v ?? '').toString().trim() === '';
  }

  private normalizeCode(v: any): string {
    return (v ?? '').toString().trim().toLowerCase();
  }

  private getItemIdFromLine(line: any): number {
    const itemText = (line?.item || '').toString().trim();
    if (!itemText) return 0;

    let codeFromText = itemText.includes(' - ')
      ? itemText.split(' - ')[0].trim()
      : '';

    if (!codeFromText) {
      const m = itemText.match(/^[A-Za-z0-9]+-\d+/);
      if (m?.[0]) codeFromText = m[0].trim();
    }

    if (!codeFromText) codeFromText = itemText.trim();

    const code = this.normalizeCode(codeFromText);
    if (!code) return 0;

    const found = (this.allItems || []).find((x: any) =>
      this.normalizeCode(x?.itemCode) === code
    );

    return Number(found?.id || 0);
  }

  private fetchSupplierPricesForItem(itemId: number) {
    if (!itemId) return;
    if (this.supplierPriceCache[itemId]) return;
    if (this.loadingPriceFor[itemId]) return;

    this.loadingPriceFor[itemId] = true;

    this.itemsSvc.getSupplierPrices(itemId).subscribe({
      next: (res: any) => {
        this.supplierPriceCache[itemId] = res?.data || [];
        this.loadingPriceFor[itemId] = false;
        this.applySupplierPriceToLinesByItem(itemId);
      },
      error: () => {
        this.supplierPriceCache[itemId] = [];
        this.loadingPriceFor[itemId] = false;
      }
    });
  }

  private applySupplierPriceToLinesByItem(itemId: number) {
    const sid = Number(this.poHdr?.supplierId || 0);
    if (!sid || !itemId) return;

    const prices = this.supplierPriceCache[itemId] || [];
    const row = prices.find((p: any) => Number(p.supplierId) === sid);
    if (!row) return;

    for (const l of this.poLines || []) {
      const lid = this.getItemIdFromLine(l);
      if (lid === itemId) {
        l.price = row.price;
        this.calculateLineTotal(l);
      }
    }

    this.recalculateTotals();
  }

  private applySupplierPricesToAllLines() {
    const sid = Number(this.poHdr?.supplierId || 0);
    if (!sid) return;

    for (const l of this.poLines || []) {
      const itemId = this.getItemIdFromLine(l);
      if (!itemId) continue;

      this.fetchSupplierPricesForItem(itemId);

      const prices = this.supplierPriceCache[itemId] || [];
      const row = prices.find((p: any) => Number(p.supplierId) === sid);

      if (row) {
        l.price = row.price;
        this.calculateLineTotal(l);
      }
    }

    this.recalculateTotals();
  }

  private getRfqPoDraft(): any | null {
    const navState = this.router.getCurrentNavigation()?.extras?.state || window.history.state || {};
    const fromState = (navState as any)?.rfqPoDraft;

    if (fromState?.source === 'RFQ') {
      return fromState;
    }

    try {
      const raw = sessionStorage.getItem('rfqPoDraft');
      if (!raw) return null;

      const parsed = JSON.parse(raw);
      return parsed?.source === 'RFQ' ? parsed : null;
    } catch {
      return null;
    }
  }

  private applyRfqDraftToPo(draft: any | null): void {
    if (!draft || !Array.isArray(draft.lines) || !draft.lines.length) return;

    const supplierName = (draft.supplierName || '').toString().trim();
    const supplier = (this.suppliers || []).find((s: any) =>
      this.normalizeText(s?.name) === this.normalizeText(supplierName)
    );

    if (supplier) {
      this.select('supplier', supplier);
      this.applySupplierDefaults(supplier);
    } else if (supplierName) {
      this.searchTexts['supplier'] = supplierName;
      Swal.fire({
        icon: 'warning',
        title: 'Supplier Not Found',
        text: `${supplierName} is not available in supplier master. Please create/select supplier before saving PO.`,
        confirmButtonColor: '#0e3a4c'
      });
    }

    if (!this.poHdr.deliveryDate && draft.validUntil) {
      this.poHdr.deliveryDate = draft.validUntil;
    }

    const rfqNote = `Created from RFQ winner: ${supplierName || 'selected supplier'}`;
    this.poHdr.remarks = this.poHdr.remarks
      ? `${this.poHdr.remarks}\n${rfqNote}`
      : rfqNote;

    this.poLines = draft.lines.map((line: any) => this.mapRfqLineToPOLine(line));
    this.poLines.forEach(x => this.calculateLineTotal(x));
    this.recalculateTotals();
    this.updateHeaderLockState();

    sessionStorage.removeItem('rfqPoDraft');

    Swal.fire({
      icon: 'success',
      title: 'RFQ Draft Loaded',
      text: 'Winner supplier and quote lines are loaded into this purchase order.',
      confirmButtonColor: '#0e3a4c'
    });
  }

  private applySupplierDefaults(supplier: any): void {
    const paymentTermId = Number(
      supplier?.paymentTermId || supplier?.paymentTermsId || supplier?.paymentTermsID || 0
    );

    if (paymentTermId && !Number(this.poHdr.paymentTermId || 0)) {
      const term = (this.paymentTerms || []).find((x: any) => Number(x?.id) === paymentTermId);
      if (term) this.select('paymentTerms', term);
    }

    const incotermId = Number(supplier?.incotermsId || supplier?.incotermId || 0);
    if (incotermId && !Number(this.poHdr.incotermsId || 0)) {
      const incoterm = (this.incoterms || []).find((x: any) => Number(x?.id) === incotermId);
      if (incoterm) this.select('incoterms', incoterm);
    }
  }

  private mapRfqLineToPOLine(line: any): any {
    const po = this.makeEmptyPOLine();
    const itemName = (line?.itemName || line?.item || '').toString().trim();
    const item = this.findRfqItem(itemName);

    po.__fromRFQ = true;
    po.prNo = 'RFQ';
    po.item = item ? this.formatItemText(item) : itemName;
    po.description = item?.description || itemName;
    po.qty = Number(line?.qty || 0);
    po.price = Number(line?.price || 0);
    po.taxCode = this.getDefaultTaxName();

    return po;
  }

  private findRfqItem(itemName: string): any | null {
    const target = this.normalizeText(itemName);
    if (!target) return null;

    return (this.allItems || []).find((x: any) => {
      const code = this.normalizeText(x?.itemCode || x?.sku);
      const name = this.normalizeText(x?.itemName || x?.name);
      const combined = this.normalizeText(this.formatItemText(x));

      return target === code || target === name || target === combined;
    }) || null;
  }

  private formatItemText(item: any): string {
    const code = (item?.itemCode || item?.sku || '').toString().trim();
    const name = (item?.itemName || item?.name || '').toString().trim();

    return code && name ? `${code} - ${name}` : (code || name);
  }

  private normalizeText(value: any): string {
    return (value || '').toString().trim().toLowerCase();
  }

  private computeHash(): string {
    const data = {
      poHdr: this.poHdr,
      poLines: this.poLines
    };

    return JSON.stringify(data);
  }

  private markClean(): void {
    this.cleanHash = this.computeHash();
  }

  get isDirty(): boolean {
    return this.computeHash() !== this.cleanHash;
  }

  private loadDraftIntoCreate(id: number) {
    this.poTempService.getPODraftById(id).subscribe({
      next: (res: any) => {
        const raw = res?.data;
        if (!raw) return;

        const d = {
          id: Number(raw.id ?? raw.Id ?? 0),
          purchaseOrderNo: raw.purchaseOrderNo ?? raw.PurchaseOrderNo ?? '',
          supplierId: Number(raw.supplierId ?? raw.SupplierId ?? 0),
          paymentTermId: Number(raw.paymentTermId ?? raw.PaymentTermId ?? 0),
          currencyId: Number(raw.currencyId ?? raw.CurrencyId ?? 0),
          incotermsId: Number(raw.incotermsId ?? raw.IncotermsId ?? 0),
          poDate: raw.poDate ?? raw.PoDate,
          deliveryDate: raw.deliveryDate ?? raw.DeliveryDate,
          location: raw.location ?? raw.Location ?? '',
          contactNumber: raw.contactNumber ?? raw.ContactNumber ?? '',
          remarks: raw.remarks ?? raw.Remarks ?? '',
          fxRate: Number(raw.fxRate ?? raw.FxRate ?? 0),
          tax: Number(raw.tax ?? raw.Tax ?? 0),
          shipping: Number(raw.shipping ?? raw.Shipping ?? 0),
          isOverseas: !!(raw.isOverseas ?? raw.IsOverseas),
          discount: Number(raw.discount ?? raw.Discount ?? 0),
          subTotal: Number(raw.subTotal ?? raw.SubTotal ?? 0),
          netTotal: Number(raw.netTotal ?? raw.NetTotal ?? 0),
          approvalStatus: Number(raw.approvalStatus ?? raw.ApprovalStatus ?? 0),
          poLines: raw.poLines ?? raw.PoLines ?? '[]'
        };

        this.poHdr = {
          ...this.poHdr,
          id: 0,
          purchaseOrderNo: d.purchaseOrderNo,
          supplierId: d.supplierId,
          paymentTermId: d.paymentTermId,
          currencyId: d.currencyId,
          incotermsId: d.incotermsId,
          poDate: d.poDate ? this.toISODate(new Date(d.poDate)) : '',
          deliveryDate: d.deliveryDate ? this.toISODate(new Date(d.deliveryDate)) : '',
          location: d.location,
          contactNumber: d.contactNumber,
          remarks: d.remarks,
          fxRate: d.fxRate,
          tax: d.tax,
          shipping: d.shipping,
          isOverseas: d.isOverseas,
          discount: d.discount,
          approvalStatus: d.approvalStatus
        };

        delete this.poHdr.approveLevelId;
        delete this.poHdr.ApproveLevelId;

        const supplier = this.suppliers?.find((x: any) => x.id === d.supplierId);
        const payTerm = this.paymentTerms?.find((x: any) => x.id === d.paymentTermId);
        const currency = this.currencies?.find((x: any) => x.id === d.currencyId);
        const inco = this.incoterms?.find((x: any) => x.id === d.incotermsId);

        this.searchTexts['supplier'] = supplier?.name ?? '';
        this.searchTexts['paymentTerms'] = payTerm?.paymentTermsName ?? '';
        this.searchTexts['currency'] = currency?.currencyName ?? '';
        this.searchTexts['incoterms'] = inco?.incotermsName ?? '';
        this.searchTexts['deliveryLoc'] = d.location || '';

        this.poHdr.currencyName = currency?.currencyName ?? '';
        this.poHdr.isOverseas = this.poHdr.isOverseas || (this.poHdr.currencyName || '').toUpperCase() !== 'SGD';
        this.showShipping = !!this.poHdr.isOverseas;
        this.poHdr.fxRate = (this.poHdr.currencyName || '').toUpperCase() === 'SGD'
          ? (this.poHdr.fxRate || 1)
          : (this.poHdr.fxRate || 0);

        try {
          this.poLines = Array.isArray(d.poLines) ? d.poLines : JSON.parse(d.poLines || '[]');
        } catch {
          this.poLines = [];
        }

        this.calculateFxTotal();
        this.markClean();
      },
      error: (err) => Swal.fire('Error', err?.error?.message || err?.message || 'Failed to load PO draft.', 'error')
    });
  }

  private handleInitialLoadError(err: any): void {
    this.mastersLoaded = false;
    this.suppliers = [];
    this.paymentTerms = [];
    this.currencies = [];
    this.incoterms = [];
    this.allPrNos = [];
    this.allItems = [];
    this.accounthead = [];
    this.allBudgets = [];
    this.allRecurring = [];
    this.allTaxCodes = [];
    this.deliveries = [];
    this.countries = [];

    Swal.fire({
      icon: 'error',
      title: 'Error',
      text: err?.error?.message || err?.message || 'Unable to load Purchase Order master data.',
      confirmButtonColor: '#d33'
    });
  }

  setMinDate() {
    const d = new Date();
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');

    this.minDate = `${yyyy}-${mm}-${dd}`;
  }

  buildFullPath(item: any): string {
    let path = item.headName;
    let current = this.accounthead.find((x: any) => x.id === item.parentHead);

    while (current) {
      path = `${current.headName} >> ${path}`;
      current = this.accounthead.find((x: any) => x.id === current.parentHead);
    }

    return path;
  }

  toISODate(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');

    return `${year}-${month}-${day}`;
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

  setApprovalStatus(status: any) {
    this.disabledButton = true;
    this.poHdr.approvalStatus = status;
    this.saveRequest();
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent) {
    const target = event.target as HTMLElement;

    if (target.closest('.dropdown-scope')) return;

    Object.keys(this.dropdownOpen).forEach(k => (this.dropdownOpen[k] = false));
    (this.poLines || []).forEach(line => (line.dropdownOpen = ''));

    this.closeOverlay();
  }

  toggleDropdown(field: string, open?: boolean, ev?: Event) {
    ev?.stopPropagation();

    Object.keys(this.dropdownOpen).forEach(k => {
      if (k !== field) this.dropdownOpen[k] = false;
    });

    this.dropdownOpen[field] = open !== undefined ? open : !this.dropdownOpen[field];

    if (this.dropdownOpen[field]) {
      switch (field) {
        case 'supplier':
          this.filteredLists[field] = [...this.suppliers];
          break;
        case 'paymentTerms':
          this.filteredLists[field] = [...this.paymentTerms];
          break;
        case 'currency':
          this.filteredLists[field] = [...this.currencies];
          break;
        case 'incoterms':
          this.filteredLists[field] = [...this.incoterms];
          break;
        case 'deliveryLoc':
          this.filteredLists[field] = [...(this.deliveries || [])];
          break;
      }
    }
  }

  filter(field: string) {
    const search = (this.searchTexts[field] || '').toLowerCase();

    switch (field) {
      case 'supplier':
        this.filteredLists[field] = this.suppliers.filter((s: any) =>
          (s.name || '').toLowerCase().includes(search)
        );
        break;

      case 'paymentTerms':
        this.filteredLists[field] = this.paymentTerms.filter((p: any) =>
          (p.paymentTermsName || '').toLowerCase().includes(search)
        );
        break;

      case 'currency':
        this.filteredLists[field] = this.currencies.filter((s: any) =>
          (s.currencyName || '').toLowerCase().includes(search)
        );
        break;

      case 'incoterms':
        this.filteredLists[field] = this.incoterms.filter((s: any) =>
          (s.incotermsName || '').toLowerCase().includes(search)
        );
        break;

      case 'deliveryLoc':
        this.filteredLists[field] = (this.deliveries || []).filter((x: any) =>
          (x?.name || '').toLowerCase().includes(search)
        );
        break;
    }
  }

  select(field: string, item: any) {
    this.searchTexts[field] = item.name || item.paymentTermsName || item.currencyName || item.incotermsName || '';

    switch (field) {
  case 'supplier':
  this.poHdr.supplierId = item.id;

  const found = this.currencies?.find((x: any) => x.id === item.currencyId);
  this.poHdr.currencyId   = item.currencyId || 0;
  this.poHdr.currencyName = found?.currencyName || found?.name || '';
  this.searchTexts['currency'] = this.poHdr.currencyName;

  // ✅ item.currencyId use பண்ணு, this.poHdr.currencyId இல்ல
  if (Number(item.currencyId) === Number(this.companyCurrencyId)) {
    this.poHdr.fxRate   = 1;
    this.exchangeRate   = 1;
    this.showShipping   = !!this.poHdr.isOverseas;
    const foundGst = this.countries?.find((x: any) => x.id === item.countryId);
    this.poHdr.tax  = foundGst?.gstPercentage || 0;
    this.calculateFxTotal();
  } else {
    this.poHdr.fxRate  = 0;
    this.poHdr.tax     = 0;
    this.poHdr.isOverseas = true;
    this.showShipping  = true;
    // ✅ item.currencyId pass பண்ணு
    this.fetchExchangeRate(item.currencyId, this.poHdr.currencyName);
  }
  break;
      case 'paymentTerms':
        this.poHdr.paymentTermId = item.id;
        break;

      case 'currency':
        this.poHdr.currencyId = item.id;
        this.poHdr.currencyName = item.currencyName;
        break;

      case 'incoterms':
        this.poHdr.incotermsId = item.id;
        break;

      case 'deliveryLoc':
        this.poHdr.location = item?.name || '';

        if (!this.lockHeaderByPR) {
          this.poHdr.contactNumber = item?.contactNumber || '';
        }
        break;
    }

    this.dropdownOpen[field] = false;
  }

  isSGDCurrency(): boolean {
    const code = (this.poHdr.currencyName || '').toUpperCase();
    return code === 'SGD';
  }

  onClearSearch(field: string) {
    this.searchTexts[field] = '';
    this.dropdownOpen[field] = false;
  }

  openDropdown(index: number, field: string, ev?: Event) {
    ev?.stopPropagation();

    if (this.ddOL.open && this.ddOL.index === index && this.ddOL.field === field) {
      this.closeOverlay();
      return;
    }

    (this.poLines || []).forEach(l => (l.dropdownOpen = ''));
    this.closeOverlay();

    if (field === 'prNo') this.poLines[index].filteredOptions = [...(this.allPrNos || [])];
    if (field === 'item') this.poLines[index].filteredOptions = [...(this.allItems || [])];
    if (field === 'budget') this.poLines[index].filteredOptions = [...(this.allBudgets || [])];
    if (field === 'recurring') this.poLines[index].filteredOptions = [...(this.allRecurring || [])];
    if (field === 'taxCode') this.poLines[index].filteredOptions = [...(this.allTaxCodes || [])];
    if (field === 'location') this.poLines[index].filteredOptions = [...(this.deliveries || [])];

    if (field === 'prNo' || field === 'item' || field === 'taxCode') {
      if (field === 'item' && this.poLines[index].__fromPR) return;

      const t = ev?.target as HTMLElement | null;

      const anchor =
        (t?.closest('.ig') as HTMLElement) ||
        (t?.closest('.ig--cell') as HTMLElement) ||
        (t as HTMLElement);

      this.ddOL.open = true;
      this.ddOL.index = index;
      this.ddOL.field = field as any;
      this.ddOL.options = this.poLines[index].filteredOptions || [];
      this.ddOL.anchorEl = anchor;

      this.poLines[index].dropdownOpen = '';

      this.refreshOverlayPos();
      return;
    }

    this.poLines[index].dropdownOpen = field;
  }

  onFocusOpen(field: string, ev?: Event) {
    ev?.stopPropagation();

    if (this.suppressNextFocusOpen[field]) {
      this.suppressNextFocusOpen[field] = false;
      return;
    }

    this.toggleDropdown(field, true, ev);
  }

  filterOptions(index: number, field: string) {
    const searchValue = (this.poLines[index][field] || '').toLowerCase();

    if (field === 'prNo') {
      const src = this.allPrNos || [];
      this.poLines[index].filteredOptions = src.filter((x: any) =>
        (x?.purchaseRequestNo || '').toLowerCase().includes(searchValue)
      );
    }

    if (field === 'item') {
      const src = this.allItems || [];
      this.poLines[index].filteredOptions = src.filter((x: any) =>
        (x?.itemCode || '').toLowerCase().includes(searchValue) ||
        (x?.itemName || '').toLowerCase().includes(searchValue)
      );
    }

    if (field === 'budget') {
      const src = this.allBudgets || [];
      this.poLines[index].filteredOptions = src.filter((x: any) =>
        (x?.label || '').toLowerCase().includes(searchValue)
      );
    }

    if (field === 'recurring') {
      const src = this.allRecurring || [];
      this.poLines[index].filteredOptions = src.filter((x: any) =>
        (x?.recurringName || '').toLowerCase().includes(searchValue)
      );
    }

    if (field === 'taxCode') {
      const src = this.allTaxCodes || [];
      this.poLines[index].filteredOptions = src.filter((x: any) =>
        (x?.name || '').toLowerCase().includes(searchValue)
      );
    }

    if (field === 'location') {
      const src = this.deliveries || [];
      this.poLines[index].filteredOptions = src.filter((x: any) =>
        (x?.name || '').toLowerCase().includes(searchValue)
      );
    }

    if (this.ddOL.open && this.ddOL.index === index && this.ddOL.field === field) {
      this.ddOL.options = this.poLines[index].filteredOptions || [];
      this.refreshOverlayPos();
    }
  }

  selectOption(index: number, field: string, option: any) {
    if (field === 'prNo') {
      const chosenNo: string = option?.purchaseRequestNo ?? option;
      const pr = this.allPrNos.find((p: any) => p.purchaseRequestNo === chosenNo);
      if (!pr) return;

      this.poLines[index].dropdownOpen = '';
      this.poLines[index].filteredOptions = [];

      this.appendPRToPOLines(pr);

      for (const l of this.poLines) {
        const itemId = this.getItemIdFromLine(l);
        if (itemId) this.fetchSupplierPricesForItem(itemId);
      }

      this.applySupplierPricesToAllLines();

      if (this.isOnlyPrNo(this.poLines[index]) || this.isEmptyLine(this.poLines[index])) {
        this.poLines.splice(index, 1);
        this.recalculateTotals();
      }

      return;
    }

    if (field === 'item') {
      this.poLines[index].item = `${option.itemCode} - ${option.itemName}`;

      if (!this.poLines[index].description?.trim()) {
        this.poLines[index].description = option?.description || option?.name || option?.itemName || '';
      }

      if (!this.poLines[index].taxCode) {
        this.poLines[index].taxCode = this.getDefaultTaxName();
      }

      const itemId = Number(option?.id || 0);

      if (itemId) {
        this.fetchSupplierPricesForItem(itemId);
        this.applySupplierPriceToLinesByItem(itemId);
      }

      this.calculateLineTotal(this.poLines[index]);
      this.poLines[index].dropdownOpen = '';
      return;
    } else if (field === 'budget') {
      this.poLines[index][field] = option.label;
    } else if (field === 'location') {
      this.poLines[index][field] = option.name;
    } else if (field === 'recurring') {
      this.poLines[index][field] = option.recurringName;
    } else if (field === 'taxCode') {
      this.poLines[index][field] = option.name;
      this.onTaxCodeChange(index);
    } else {
      this.poLines[index][field] = option;
    }

    this.poLines[index].dropdownOpen = '';
    this.closeOverlay();
  }

  private appendPRToPOLines(pr: any) {
    const lines = this.safeParsePrLines(pr?.prLines);
    if (!lines.length) return;

    const newPOLines = lines.map((l: any) =>
      this.mapPRLineToPOLine(pr.purchaseRequestNo, l)
    );

    this.poLines = this.poLines.filter(line => !this.isEmptyLine(line) && !this.isOnlyPrNo(line));

    for (const nl of newPOLines) {
      const dupIdx = this.poLines.findIndex(pl => this.isSameLine(pl, nl));

      if (dupIdx === -1) {
        this.poLines.push(nl);
      }
    }

    this.poLines.forEach(x => this.calculateLineTotal(x));
    this.recalculateTotals();
    this.updateHeaderLockState();
  }

  private safeParsePrLines(raw: any): any[] {
    if (Array.isArray(raw)) return raw;
    if (!raw) return [];

    try {
      const parsed = JSON.parse(String(raw));
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }

  private mapPRLineToPOLine(prNo: string, line: any) {
    const po = this.makeEmptyPOLine();

    po.__fromPR = true;
    po.prNo = prNo;

    const itemCode = line.itemCode ?? line.itemSearch ?? '';
    const itemName = line.itemName ?? line.itemSearch ?? '';

    po.item = itemName && itemCode ? `${itemCode} - ${itemName}` : (itemCode || itemName || '');
    po.description = line.remarks ?? '';
    po.budget = line.budget ?? '';

    this.poHdr.location = line.location ?? line.locationSearch ?? '';

    try {
      const loc = (this.deliveries || []).find((x: any) =>
        (x?.name || '').toLowerCase() === (this.poHdr.location || '').toLowerCase()
      );

      this.poHdr.contactNumber = loc?.contactNumber || '';
    } catch {
      this.poHdr.contactNumber = '';
    }

    po.qty = Number(line.qty) || 0;
    po.taxCode = this.getDefaultTaxName();

    this.searchTexts['deliveryLoc'] = this.poHdr.location || '';

    return po;
  }

  private makeEmptyPOLine(): any {
    return {
      __fromPR: false,
      __fromRFQ: false,
      prNo: '',
      item: '',
      description: '',
      budget: '',
      recurring: '',
      taxCode: '',
      qty: 0,
      price: '',
      discount: '',
      baseAmount: 0,
      discountAmount: 0,
      taxAmount: 0,
      total: 0,
      dropdownOpen: '',
      filteredOptions: []
    };
  }

  private updateHeaderLockState(): void {
    this.lockHeaderByPR = (this.poLines || []).some(l => l?.__fromPR === true);
    this.searchTexts['deliveryLoc'] = this.poHdr.location || '';
  }

  poAddLine() {
    this.poLines.push({
      __fromPR: false,
      prNo: '',
      item: '',
      description: '',
      budget: '',
      taxCode: '',
      qty: 0,
      price: '',
      discount: '',
      baseAmount: 0,
      discountAmount: 0,
      taxAmount: 0,
      total: 0,
      dropdownOpen: '',
      filteredOptions: []
    });

    this.poLines = [...this.poLines];
  }

  private isEmptyLine(line: any): boolean {
    return !line?.prNo &&
      !line?.item &&
      !line?.budget &&
      !line?.location &&
      !String(line?.description ?? '').trim() &&
      (Number(line?.qty) || 0) === 0;
  }

  private isOnlyPrNo(line: any): boolean {
    const empty = (v: any) => !String(v ?? '').trim();

    return !!line?.prNo &&
      empty(line?.item) &&
      empty(line?.budget) &&
      empty(line?.location) &&
      empty(line?.description) &&
      (Number(line?.qty) || 0) === 0;
  }

  private isSameLine(a: any, b: any): boolean {
    const norm = (v: any) => String(v ?? '').trim().toLowerCase();

    return (
      norm(a.prNo) === norm(b.prNo) &&
      norm(a.item) === norm(b.item) &&
      norm(a.location) === norm(b.location) &&
      norm(a.budget) === norm(b.budget) &&
      norm(a.description) === norm(b.description)
    );
  }

  poRemoveLine(i: number) {
    this.poLines.splice(i, 1);
    this.updateHeaderLockState();
    this.recalculateTotals();
  }

  poChange(i: number, key: string, val: any) {
    const copy = [...this.poLines];

    copy[i] = {
      ...copy[i],
      [key]: val
    };

    this.poLines = copy;
  }

  trackByIndex = (i: number, _: any) => i;

  calculateLineTotal(line: any) {
    if (!line) return;

    const qty = Math.max(0, +line.qty || 0);
    line.qty = qty;

    const unit = +line.price || 0;
    const discPct = +line.discount || 0;
    const gstPct = +this.poHdr.tax || 0;
    const taxMode = this.getTaxFlag(line);
    const hasTax = !!line.taxCode && gstPct > 0;

    const rawBase = qty * unit;
    const discountAmt = rawBase * (discPct / 100);
    const baseAfterDisc = +(rawBase - discountAmt).toFixed(2);

    let taxAmt = 0;
    let lineNet = 0;

    if (!hasTax || taxMode === 'EXEMPT') {
      lineNet = baseAfterDisc;
      taxAmt = 0;
    } else if (taxMode === 'EXCLUSIVE') {
      taxAmt = +(baseAfterDisc * (gstPct / 100)).toFixed(2);
      lineNet = baseAfterDisc + taxAmt;
    } else {
      lineNet = baseAfterDisc;
      taxAmt = +(lineNet * (gstPct / (100 + gstPct))).toFixed(2);
    }

    line.baseAmount = +rawBase.toFixed(2);
    line.discountAmount = +discountAmt.toFixed(2);
    line.taxAmount = +taxAmt.toFixed(2);
    line.total = +lineNet.toFixed(2);

    this.recalculateTotals();
  }

  recalculateTotals() {
    this.poHdr = { ...this.poHdr };
    this.calculateFxTotal();
  }

  get poTotals() {
    return this.calcTotals(this.poLines, this.poHdr.shipping, this.poHdr.discount);
  }

  calcTotals(lines: any[], shipping = 0, headerDiscount = 0) {
    let subTotal = 0;
    let lineDiscountTotal = 0;
    let lineTaxTotal = 0;
    let linesGrandTotal = 0;

    const gst = Math.max(0, +this.poHdr.tax || 0);
    const gstFactor = gst > 0 ? (1 + gst / 100) : 1;

    for (const l of lines || []) {
      const tax = Number(l.taxAmount) || 0;
      const disc = Number(l.discountAmount) || 0;
      const total = Number(l.total) || 0;
      const mode = (this.getTaxFlag(l) || '').toString().toUpperCase();

      lineTaxTotal += tax;
      linesGrandTotal += total;

      if (mode === 'INCLUSIVE' && gst > 0 && tax > 0) {
        const afterDiscExclTax = total - tax;
        const discExclTax = disc / gstFactor;
        const beforeDiscExclTax = afterDiscExclTax + discExclTax;

        subTotal += beforeDiscExclTax;
        lineDiscountTotal += discExclTax;
      } else {
        subTotal += Number(l.baseAmount) || 0;
        lineDiscountTotal += disc;
      }
    }

    const ship = Number(shipping) || 0;
    const hdrDisc = Number(headerDiscount) || 0;

    const foundGst = this.countries.find(
      x => x.countryName?.toLowerCase() === 'singapore'
    );

    const gstPercentage = Number(foundGst?.gstPercentage || 0);
    const shippingWithTax = ship + (ship * gstPercentage) / 100;

    const netTotal = linesGrandTotal - hdrDisc + shippingWithTax;

    return {
      subTotal: this.round(subTotal),
      lineDiscountTotal: this.round(lineDiscountTotal),
      lineTaxTotal: this.round(lineTaxTotal),
      shipping: this.round(ship),
      shippingWithTax: this.round(shippingWithTax),
      netTotal: this.round(netTotal)
    };
  }

  round(val: number) {
    return Math.round((val + Number.EPSILON) * 100) / 100;
  }
calculateFxTotal() {
  const fx = Number(this.poHdr.fxRate) || 0;
  const netTotal = this.poTotals?.netTotal || 0;

  if (this.isBaseCurrency()) {
    this.poHdr.netTotalBase = netTotal;
  } else {
    this.poHdr.netTotalBase = Number((netTotal * fx).toFixed(2));
  }
}

  notify(msg: string) {
    Swal.fire('Purchase Order', msg, 'info');
  }

  deliveryChange() {
    this.iserrorDelivery = false;
  }

  poDateChange() {
    this.iserrorPoDate = false;
  }

  validatePO(): boolean {
    if (this.poLines.length === 0) {
      Swal.fire({
        icon: 'warning',
        title: 'Required',
        text: 'Please add at least one line item.'
      });
      return false;
    }

    const missingItem = this.poLines.find(line =>
      !line.item || line.item.toString().trim() === ''
    );

    if (missingItem) {
      Swal.fire({
        icon: 'warning',
        title: 'Item required',
        text: 'Please select Item for all line items before saving.',
        confirmButtonColor: '#0e3a4c'
      });
      return false;
    }

    const missingTax = this.poLines.find(line =>
      !line.taxCode || line.taxCode.toString().trim() === ''
    );

    if (missingTax) {
      Swal.fire({
        icon: 'warning',
        title: 'Tax Code required',
        text: 'Please select Tax Code for all line items before saving.',
        confirmButtonColor: '#0e3a4c'
      });
      return false;
    }

    const invalidLine = this.poLines.find(line =>
      line.item && (!line.price || Number(line.price) <= 0)
    );

    if (invalidLine) {
      Swal.fire({
        icon: 'warning',
        title: 'Required',
        text: 'Please enter a valid price for all Line items.'
      });
      return false;
    }

    return true;
  }

  private normalizeLinesBeforeSave(): void {
    this.poLines = (this.poLines || []).map(l => ({
      ...l,
      prNo: (l.prNo || '').toString().trim()
    }));
  }

  private getRequiredKeysForSave(): string[] {
    const base = ['supplier', 'paymentTerms'];

    if (!this.lockHeaderByPR) {
      base.push('deliveryLoc');
    }

    if (this.poHdr.isOverseas) {
      base.push('incoterms');
    }

    return base;
  }

  onOverseasChange(): void {
    this.showShipping = !!this.poHdr.isOverseas;

    if (!this.poHdr.isOverseas) {
      this.poHdr.incotermsId = 0;
      this.searchTexts['incoterms'] = '';
      this.poHdr.shipping = 0;
    }

    this.recalculateTotals();
  }

  saveRequest() {
    this.disabledButton = true;

    if (this.draftId) {
      this.submitted = true;

      this.iserrorDelivery = !this.poHdr.deliveryDate;
      this.iserrorPoDate = !this.poHdr.poDate;

      const missing = this.getRequiredKeysForSave().filter(k => this.isEmpty(this.searchTexts[k]));

      if (missing.length || this.iserrorDelivery || this.iserrorPoDate) {
        Swal.fire({
          icon: 'warning',
          title: 'Required',
          text: 'Please fill required Fields',
          confirmButtonColor: '#0e3a4c'
        });

        this.disabledButton = false;
        return;
      }

      if (!this.validatePO()) {
        this.disabledButton = false;
        return;
      }

      this.normalizeLinesBeforeSave();

      const draftPayload = this.buildPayloadForSaveDraft();

      this.poTempService.updatePODraft(this.draftId, draftPayload).pipe(
        switchMap(() => this.poTempService.promotePODraft(this.draftId, this.userId))
      ).subscribe({
        next: () => {
          Swal.fire({
            icon: 'success',
            title: 'Converted',
            text: 'Draft converted to PO'
          });

          this.router.navigate(['/purchase/list-purchaseorder']);
        },
        error: () => {
          this.disabledButton = false;

          Swal.fire({
            icon: 'error',
            title: 'Error',
            text: 'Failed to convert draft'
          });
        }
      });

      return;
    }

    this.submitted = true;

    this.iserrorDelivery = !this.poHdr.deliveryDate;
    this.iserrorPoDate = !this.poHdr.poDate;

    const missing = this.getRequiredKeysForSave().filter(k => this.isEmpty(this.searchTexts[k]));

    if (missing.length || this.iserrorDelivery || this.iserrorPoDate) {
      Swal.fire({
        icon: 'warning',
        title: 'Required',
        text: 'Please fill required Fields',
        confirmButtonColor: '#0e3a4c'
      });

      this.disabledButton = false;
      return;
    }

    if (!this.validatePO()) {
      this.disabledButton = false;
      return;
    }

    this.normalizeLinesBeforeSave();

    const totals = this.poTotals;

    const payload = {
      id: this.poHdr.id ? this.poHdr.id : 0,
      purchaseOrderNo: this.poHdr.purchaseOrderNo || '',
      supplierId: Number(this.poHdr.supplierId || 0),
      paymentTermId: Number(this.poHdr.paymentTermId || 0),
      currencyId: Number(this.poHdr.currencyId || 0),
      fxRate: Number(this.poHdr.fxRate || 0),
      incotermsId: Number(this.poHdr.incotermsId || 0),
      poDate: this.poHdr.poDate,
      deliveryDate: this.poHdr.deliveryDate,
      location: this.poHdr.location || '',
      contactNumber: (this.poHdr.contactNumber || '').toString(),
      remarks: this.poHdr.remarks || '',
      tax: Number(this.poHdr.tax || 0),
      shipping: Number(this.poHdr.shipping || 0),
      isOverseas: !!this.poHdr.isOverseas,
      discount: Number(this.poHdr.discount || 0),
      subTotal: Number((totals.subTotal || 0).toFixed(2)),
      netTotal: Number((totals.netTotal || 0).toFixed(2)),
      approvalStatus: 1,
      poLines: JSON.stringify(this.poLines || []),
      stockReorderId: Number(this.poHdr.stockReorderId || 0)
    };

    if (this.poHdr.id && this.poHdr.id > 0) {
      this.poService.updatePO(payload).subscribe({
        next: () => {
          Swal.fire({
            icon: 'success',
            title: 'Updated!',
            text: 'PO updated successfully',
            confirmButtonText: 'OK',
            confirmButtonColor: '#0e3a4c'
          });

          this.markClean();
          this.router.navigateByUrl(`/purchase/list-purchaseorder`);
        },
        error: () => {
          this.disabledButton = false;

          Swal.fire({
            icon: 'error',
            title: 'Error',
            text: 'Failed to updated PO',
            confirmButtonText: 'OK',
            confirmButtonColor: '#d33'
          });
        }
      });
    } else {
      this.poService.insertPO(payload).subscribe({
        next: () => {
          Swal.fire({
            icon: 'success',
            title: 'Created!',
            text: 'PO created successfully',
            confirmButtonText: 'OK',
            confirmButtonColor: '#0e3a4c'
          });

          this.markClean();
          this.router.navigateByUrl(`/purchase/list-purchaseorder`);
        },
        error: () => {
          this.disabledButton = false;

          Swal.fire({
            icon: 'error',
            title: 'Error',
            text: 'Failed to created PO',
            confirmButtonText: 'OK',
            confirmButtonColor: '#d33'
          });
        }
      });
    }
  }

 async cancel() {
  const ok = await this.confirmLeave();

  if (ok) {
    this.router.navigate(['/purchase/list-purchaseorder']);
  }
}

  allowOnlyNumbers(event: KeyboardEvent) {
    const invalidKeys = ['e', 'E', '+', '-', '.'];

    if (invalidKeys.includes(event.key)) {
      event.preventDefault();
    }
  }

  sanitizeNumberInput(field: string, index: number) {
    let val = (this.poLines[index][field] ?? '').toString();

    val = val.replace(/[^0-9.]/g, '');

    const firstDot = val.indexOf('.');

    if (firstDot !== -1) {
      val =
        val.substring(0, firstDot + 1) +
        val.substring(firstDot + 1).replace(/\./g, '');
    }

    this.poLines[index][field] = val;
  }

  private getTaxFlag(line: any): 'EXCLUSIVE' | 'INCLUSIVE' | 'EXEMPT' {
    const txt = (line?.taxCode || '').toString().toUpperCase();

    if (txt.includes('EXEMPT')) {
      return 'EXEMPT';
    }

    if (txt.includes('INCLUSIVE')) {
      return 'INCLUSIVE';
    }

    return 'EXCLUSIVE';
  }

  onTaxCodeChange(i: number): void {
    const line = this.poLines[i];
    if (!line) return;

    this.calculateLineTotal(line);
  }

  private getDefaultTaxName(): string {
    const def = (this.allTaxCodes || []).find((x: any) =>
      (x?.name || '').toString().toUpperCase().includes('EXCLUSIVE')
    );

    return def?.name || 'Exclusive';
  }

  refreshOverlayPos() {
    if (!this.ddOL.open || !this.ddOL.anchorEl) return;

    const rect = this.ddOL.anchorEl.getBoundingClientRect();

    this.ddOL.left = rect.left;
    this.ddOL.width = rect.width;

    const menuH = 280;
    const gap = 8;

    const spaceBelow = window.innerHeight - rect.bottom;
    this.ddOL.openUp = spaceBelow < (menuH + 20);

    if (this.ddOL.openUp) {
      this.ddOL.top = Math.max(8, rect.top - gap);
    } else {
      this.ddOL.top = rect.bottom + gap;
    }
  }

  async goToPurchaseorder() {
    if (this.purchaseOrderId) {
      this.router.navigate(['/purchase/list-purchaseorder']);
      return;
    }

    if (this.draftId) {
      if (this.isDirty) {
        const ok = await this.saveDraft();
        if (!ok) return;
      }

      this.router.navigate(['/purchase/list-purchaseorder']);
      return;
    }

    const ok = await this.confirmLeave();

    if (ok) {
      this.router.navigate(['/purchase/list-purchaseorder']);
    }
  }

  async confirmLeave(): Promise<boolean> {
    if (this.purchaseOrderId) return true;
    if (!this.isDirty) return true;

    const result = await Swal.fire({
      icon: 'question',
      title: 'Leave this page?',
      text: 'You have unsaved changes. Save as draft before leaving?',
      showCancelButton: true,
      showDenyButton: true,
      confirmButtonText: 'Save as Draft',
      denyButtonText: 'Discard',
      cancelButtonText: 'Stay',
      confirmButtonColor: '#0e3a4c'
    });

    if (result.isConfirmed) return await this.saveDraft();
    if (result.isDenied) return true;

    return false;
  }

  private buildPayloadForSaveDraft() {
    return {
      id: this.draftId ?? 0,
      purchaseOrderNo: this.poHdr.purchaseOrderNo || '',
      supplierId: this.poHdr.supplierId || 0,
      paymentTermId: this.poHdr.paymentTermId || 0,
      currencyId: this.poHdr.currencyId || 0,
      fxRate: this.poHdr.fxRate || 0,
      incotermsId: this.poHdr.incotermsId || 0,
      poDate: this.poHdr.poDate,
      deliveryDate: this.poHdr.deliveryDate || null,
      location: this.poHdr.location,
      contactNumber: this.poHdr.contactNumber,
      remarks: this.poHdr.remarks || '',
      tax: this.poHdr.tax || 0,
      shipping: this.poHdr.shipping || 0,
      isOverseas: !!this.poHdr.isOverseas,
      discount: this.poHdr.discount || 0,
      subTotal: Number(this.poTotals.subTotal.toFixed(2)),
      netTotal: Number(this.poTotals.netTotal.toFixed(2)),
      approvalStatus: this.poHdr.approvalStatus === '' || this.poHdr.approvalStatus == null
        ? 0
        : this.poHdr.approvalStatus,
      poLines: JSON.stringify(this.poLines || [])
    };
  }

  private saveDraft(): Promise<boolean> {
    const payload = this.buildPayloadForSaveDraft();

    return new Promise<boolean>((resolve) => {
      const obs = this.draftId
        ? this.poTempService.updatePODraft(this.draftId, payload)
        : this.poTempService.createPODraft(payload);

      obs.subscribe({
        next: (res) => {
          if (!this.draftId) {
            this.draftId = res?.data?.id ?? null;
          }

          this.markClean();

          Swal.fire({
            icon: 'success',
            title: 'Saved as Draft',
            text: 'Your PO was saved as draft.',
            timer: 1200,
            showConfirmButton: false
          });

          resolve(true);
        },
        error: () => {
          Swal.fire({
            icon: 'error',
            title: 'Error',
            text: 'Draft save failed',
            confirmButtonColor: '#d33'
          });

          resolve(false);
        }
      });
    });
  }
}
