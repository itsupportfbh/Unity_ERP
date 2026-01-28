import { Component, HostListener, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { forkJoin } from 'rxjs';
import { POService } from '../purchase-order.service';
import { IncotermsService } from 'app/main/master/incoterms/incoterms.service';
import { LocationService } from 'app/main/master/location/location.service';
import { CurrencyService } from 'app/main/master/currency/currency.service';
import { PaymentTermsService } from 'app/main/master/payment-terms/payment-terms.service';
import { ApprovallevelService } from 'app/main/master/approval-level/approvallevel.service';
import Swal from 'sweetalert2';
import { ItemsService } from 'app/main/master/items/items.service';
import { ChartofaccountService } from 'app/main/financial/chartofaccount/chartofaccount.service';
import { PurchaseService } from '../../purchase.service';
import { SupplierService } from 'app/main/businessPartners/supplier/supplier.service';
import { RecurringService } from 'app/main/master/recurring/recurring.service';
import { TaxCodeService } from 'app/main/master/taxcode/taxcode.service';
import { CountriesService } from 'app/main/master/countries/countries.service';
type LineRow = { [k: string]: any };
import * as feather from 'feather-icons';
import { POTempService } from '../purchase-order-temp.service';
import { switchMap } from 'rxjs/operators';
import { ItemMasterService } from 'app/main/inventory/item-master/item-master.service';

@Component({
  selector: 'app-purchase-order-create',
  templateUrl: './purchase-order-create.component.html',
  styleUrls: ['./purchase-order-create.component.scss']
})
export class PurchaseOrderCreateComponent implements OnInit {
  hover = false;
  poHdr: any = {
    id: 0,
    purchaseOrderNo: '',
    supplierId: 0,
    approveLevelId: 0,
    paymentTermId: 0,
    currencyId: 0,
    incotermsId: 0,
    poDate: '',
    deliveryDate: '',
    remarks: '',
    fxRate: 0,
    tax: 0,
    location:'',
    contactNumber:'',
    shipping: 0.00,
    discount: 0.00,
    subTotal: 0,
    netTotal: 0,
    approvalStatus: '',
    StockReorderId: 0
  };
  purchaseOrderId: any;
  approvalLevel: any;
  suppliers: any
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
  showShipping: boolean = false;

  lockHeaderByPR: boolean = false;


  formatDate(date: Date | string): string {
    if (!date) return '';
    const d = new Date(date);
    const day = ('0' + d.getDate()).slice(-2);
    const month = ('0' + (d.getMonth() + 1)).slice(-2);
    const year = d.getFullYear();
    return `${day}-${month}-${year}`;
  }
  poLines: any[] = [];

  searchTexts: { [key: string]: string } = {
    approval: '',
    supplier: '',
    paymentTerms: '',
    currency: '',
    incoterms: '',
    deliveryLoc: ''
  };

  dropdownOpen: { [key: string]: boolean } = {
    approval: false,
    supplier: false,
    paymentTerms: false,
    currency: false,
    incoterms: false,
     deliveryLoc: false
  };

  filteredLists: { [key: string]: any[] } = {
    approval: [],
    supplier: [],
    paymentTerms: [],
    currency: [],
    incoterms: [],
    deliveryLoc: [] 
  };

  requiredKeys = ['supplier', 'approval', 'paymentTerms']; // add more if needed

  isEmpty(v: any): boolean {
    return (v ?? '').toString().trim() === '';
  }

  // default load supplier price for item ///
    // ✅ cache: itemId -> price rows (supplierId, price...)
private supplierPriceCache: { [itemId: number]: any[] } = {};
private loadingPriceFor: { [itemId: number]: boolean } = {};

private normalizeCode(v: any): string {
  return (v ?? '').toString().trim().toLowerCase();
}

private getItemIdFromLine(line: any): number {
  const itemText = (line?.item || '').toString().trim();
  if (!itemText) return 0;

  // ✅ 1) Best case: your display format is "CODE - NAME" (space-dash-space)
  let codeFromText = itemText.includes(' - ')
    ? itemText.split(' - ')[0].trim()
    : '';

  // ✅ 2) Fallback: if string is like "CS-2586-Ginger Flower" or extra hyphens,
  // capture first pattern like ABC-1234
  if (!codeFromText) {
    const m = itemText.match(/^[A-Za-z0-9]+-\d+/); // ex: CS-2586
    if (m?.[0]) codeFromText = m[0].trim();
  }

  // ✅ 3) Last fallback
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
  if (this.supplierPriceCache[itemId]) return; // already loaded
  if (this.loadingPriceFor[itemId]) return;    // avoid duplicate calls
  this.loadingPriceFor[itemId] = true;

  this.itemsSvc.getSupplierPrices(itemId).subscribe({
    next: (res: any) => {
      this.supplierPriceCache[itemId] = res?.data || [];
      this.loadingPriceFor[itemId] = false;

      // ✅ if supplier already selected, immediately apply default for that item
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
      l.price = row.price;     // ✅ set default
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

    // ensure prices loaded
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


  // default load supplier price for item ///

  ///// for temp data------////
  private cleanHash = '';

  private computeHash(): string {
    // keep only the data that matters
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
    debugger
    return this.computeHash() !== this.cleanHash;
  }

  private fromReorderPrId: number | null = null;
  private fromAlertPrId: number | null = null;


  ///// for temp data------////


  constructor(private poService: POService, private router: Router,
    private route: ActivatedRoute, private approvalLevelService: ApprovallevelService,
    private paymentTermsService: PaymentTermsService, private currencyService: CurrencyService,
    private locationService: LocationService, private incotermsService: IncotermsService,
    private itemsService: ItemsService, private chartOfAccountService: ChartofaccountService,
    private purchaseService: PurchaseService, private _SupplierService: SupplierService,
    private recurringService: RecurringService, private taxCodeService: TaxCodeService,
    private _countriesService: CountriesService, private poTempService: POTempService,
    private itemsSvc: ItemMasterService,
  ) { this.userId = localStorage.getItem('id') || 'System'; }


  ngOnInit() {
    debugger
    this.setMinDate();
    this.route.queryParamMap.subscribe(q => {
      const dId = Number(q.get('draftId'));
      this.draftId = Number.isFinite(dId) && dId > 0 ? dId : null;

      const rId = Number(q.get('fromReorderPrId'));
      this.fromReorderPrId = Number.isFinite(rId) && rId > 0 ? rId : null;
    });
    this.route.queryParamMap.subscribe(q => {
      const dId = Number(q.get('draftId'));
      this.draftId = Number.isFinite(dId) && dId > 0 ? dId : null;

      const rId = Number(q.get('fromReorderPrId'));
      this.fromReorderPrId = Number.isFinite(rId) && rId > 0 ? rId : null;

      // ✅ NEW: From Pending PR Alert
      const pId = Number(q.get('prId'));
      this.fromAlertPrId = Number.isFinite(pId) && pId > 0 ? pId : null;
    });
    this.route.paramMap.subscribe((params: any) => {
      this.purchaseOrderId = parseInt(params.get('id'));

      if (this.purchaseOrderId) {
        // ✅ Edit mode
        forkJoin({
          approval: this.approvalLevelService.getAllApprovalLevel(),
          suppliers: this._SupplierService.GetAllSupplier(),
          paymentTerms: this.paymentTermsService.getAllPaymentTerms(),
          currency: this.currencyService.getAllCurrency(),
          incoterms: this.incotermsService.getAllIncoterms(),
          // prlist: this.purchaseService.getAll(),
          prlist: this.purchaseService.GetAvailablePurchaseRequests(),
          items: this.itemsService.getAllItem(),
          accounthead: this.chartOfAccountService.getAllChartOfAccount(),
          recurring: this.recurringService.getRecurring(),
          taxcode: this.taxCodeService.getTaxCode(),
          delivery: this.locationService.getLocation(),
          country: this._countriesService.getCountry(),
          poHdr: this.poService.getPOById(this.purchaseOrderId)
        }).subscribe((results: any) => {
          this.approvalLevel = results.approval.data;
          this.suppliers = results.suppliers.data;
          this.paymentTerms = results.paymentTerms.data;
          this.currencies = results.currency.data;
          this.incoterms = results.incoterms.data;
          this.allPrNos = results.prlist.data;
          this.allItems = results.items.data;
          this.accounthead = results.accounthead.data
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
            poDate: this.toISODate(new Date(results.poHdr.data.poDate)),
            deliveryDate: this.toISODate(new Date(results.poHdr.data.deliveryDate))
          };

          this.filteredLists.deliveryLoc = [...(this.deliveries || [])];
          this.searchTexts['deliveryLoc'] = this.poHdr.location || '';  // show selected value


          this.filteredLists = {
            approval: [...this.approvalLevel],
            supplier: [...this.suppliers],
            paymentTerms: [...this.paymentTerms],
            currency: [...this.currencies],
            incoterms: [...this.incoterms],
            deliveryLoc: [...(this.deliveries || [])] 
          };


          const selectedApproveLevel = this.approvalLevel?.find((d: any) => d.id === this.poHdr.approveLevelId);
          if (selectedApproveLevel) {
            this.searchTexts['approval'] = selectedApproveLevel.name;
          }
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
            if(selectedCurrency.currencyName?.trim().toUpperCase() === "SGD"){
              this.showShipping = false
            }else{
              this.showShipping = true
            }
          }
          const selectedIncoterms = this.incoterms?.find((d: any) => d.id === this.poHdr.incotermsId);
          if (selectedIncoterms) {
            this.searchTexts['incoterms'] = selectedIncoterms.incotermsName;
          }

          this.poLines = JSON.parse(results.poHdr.data.poLines);
          this.updateHeaderLockState();
          this.calculateFxTotal()
          this.mastersLoaded = true;
        });
      } else {
        debugger
        // ✅ Create mode
        forkJoin({
          approval: this.approvalLevelService.getAllApprovalLevel(),
          suppliers: this._SupplierService.GetAllSupplier(),
          paymentTerms: this.paymentTermsService.getAllPaymentTerms(),
          currency: this.currencyService.getAllCurrency(),
          incoterms: this.incotermsService.getAllIncoterms(),
          // prlist: this.purchaseService.getAll(),
          prlist: this.purchaseService.GetAvailablePurchaseRequests(),
          items: this.itemsService.getAllItem(),
          accounthead: this.chartOfAccountService.getAllChartOfAccount(),
          recurring: this.recurringService.getRecurring(),
          taxcode: this.taxCodeService.getTaxCode(),
          delivery: this.locationService.getLocation(),
          country: this._countriesService.getCountry(),
        }).subscribe((results: any) => {
          this.approvalLevel = results.approval.data;
          this.suppliers = results.suppliers.data;
          this.paymentTerms = results.paymentTerms.data;
          this.currencies = results.currency.data;
          this.incoterms = results.incoterms.data;
          //this.allPrNos = results.prlist.data;
          this.allItems = results.items.data;
          this.accounthead = results.accounthead.data
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
            approval: [...this.approvalLevel],
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

          // 1) Launched from Reorder popup → lock to that PR (which is a reorder PR)
          if (this.fromReorderPrId) {
            debugger
            const pr = list.find(x => Number(x.id) === Number(this.fromReorderPrId));
            this.allPrNos = pr ? [pr] : [];

            const lines = this.safeParsePrLines(pr?.prLines);

            // auto-pick supplier if unique
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
                this.select('supplier', supplier); // sets header + currency/GST
              } else {
                this.poHdr.supplierId = sid;
              }
            }

            // ✅ Map PR lines into PO lines immediately
            this.poLines = lines.map((l: any) => this.mapPRLineToPOLine(pr.purchaseRequestNo, l));
            // cleanup totals
            this.poLines.forEach(x => this.calculateLineTotal(x));
            this.recalculateTotals();
          }
          // ✅ NEW: Launched from Pending PR Alert → load that PR lines in table
          else if (this.fromAlertPrId) {
            const pr = list.find(x => Number(x.id) === Number(this.fromAlertPrId));
            this.allPrNos = pr ? [pr] : [];   // dropdown also show only this PR (optional)

            const lines = this.safeParsePrLines(pr?.prLines);

            // auto-pick supplier if unique (same logic)
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

            // ✅ Map PR lines → PO lines default load
            this.poLines = lines.map((l: any) => this.mapPRLineToPOLine(pr?.purchaseRequestNo, l));
            this.poLines.forEach(x => this.calculateLineTotal(x));
            this.recalculateTotals();
          }
          // 2) Normal PO create → show NON-reorder PRs only
          else {
            this.allPrNos = list.filter(p => !isYes(p.isReorder));
          }
          this.mastersLoaded = true;
        });
      }
    });
    setTimeout(() => this.markClean());
  }
  ngAfterViewChecked(): void {
    feather.replace();  // remove the guard so icons refresh every cycle
  }
  ngAfterViewInit(): void {
    feather.replace();
  }
  private loadDraftIntoCreate(id: number) {
    this.poTempService.getPODraftById(id).subscribe({
      next: (res: any) => {
        const raw = res?.data;
        if (!raw) return;

        // 1) normalize keys/casing and coerce numbers/dates
        const d = {
          id: Number(raw.id ?? raw.Id ?? 0),
          purchaseOrderNo: raw.purchaseOrderNo ?? raw.PurchaseOrderNo ?? '',
          supplierId: Number(raw.supplierId ?? raw.SupplierId ?? 0),
          approveLevelId: Number(raw.approveLevelId ?? raw.ApproveLevelId ?? 0),
          paymentTermId: Number(raw.paymentTermId ?? raw.PaymentTermId ?? 0),
          currencyId: Number(raw.currencyId ?? raw.CurrencyId ?? 0),
          incotermsId: Number(raw.incotermsId ?? raw.IncotermsId ?? 0),
          poDate: raw.poDate ?? raw.PoDate,
          deliveryDate: raw.deliveryDate ?? raw.DeliveryDate,
          location:raw.location ?? raw.location,
          contactNumber:raw.contactNumber ?? raw.contactNumber,
          remarks: raw.remarks ?? raw.Remarks ?? '',
          fxRate: Number(raw.fxRate ?? raw.FxRate ?? 0),
          tax: Number(raw.tax ?? raw.Tax ?? 0),
          shipping: Number(raw.shipping ?? raw.Shipping ?? 0),
          discount: Number(raw.discount ?? raw.Discount ?? 0),
          subTotal: Number(raw.subTotal ?? raw.SubTotal ?? 0),
          netTotal: Number(raw.netTotal ?? raw.NetTotal ?? 0),
          approvalStatus: Number(
            raw.approvalStatus ?? raw.ApprovalStatus ?? 0
          ),
          poLines: raw.poLines ?? raw.PoLines ?? '[]',
        };

        // 2) set header (stay in CREATE mode → id = 0)
        this.poHdr = {
          ...this.poHdr,
          id: 0,
          purchaseOrderNo: d.purchaseOrderNo,
          supplierId: d.supplierId,
          approveLevelId: d.approveLevelId,
          paymentTermId: d.paymentTermId,
          currencyId: d.currencyId,
          incotermsId: d.incotermsId,
          poDate: d.poDate ? this.toISODate(new Date(d.poDate)) : '',
          deliveryDate: d.deliveryDate ? this.toISODate(new Date(d.deliveryDate)) : '',
          location:d.location,
          contactNumber:d.contactNumber,
          remarks: d.remarks,
          fxRate: d.fxRate,
          tax: d.tax,
          shipping: d.shipping,
          discount: d.discount,
          approvalStatus: d.approvalStatus
        };

        // 3) bind visible dropdown texts from master lists (by Id)
        const approve = this.approvalLevel?.find((x: any) => x.id === d.approveLevelId);
        const supplier = this.suppliers?.find((x: any) => x.id === d.supplierId);
        const payTerm = this.paymentTerms?.find((x: any) => x.id === d.paymentTermId);
        const currency = this.currencies?.find((x: any) => x.id === d.currencyId);
        const inco = this.incoterms?.find((x: any) => x.id === d.incotermsId);

        this.searchTexts['approval'] = approve?.name ?? '';
        this.searchTexts['supplier'] = supplier?.name ?? '';
        this.searchTexts['paymentTerms'] = payTerm?.paymentTermsName ?? '';
        this.searchTexts['currency'] = currency?.currencyName ?? '';
        this.searchTexts['incoterms'] = inco?.incotermsName ?? '';

        // keep currencyName/fxRate consistent with your existing logic
        this.poHdr.currencyName = currency?.currencyName ?? '';
        this.poHdr.fxRate = (this.poHdr.currencyName || '').toUpperCase() === 'SGD' ? (this.poHdr.fxRate || 1) : (this.poHdr.fxRate || 0);

        // 4) lines
        try {
          this.poLines = Array.isArray(d.poLines) ? d.poLines : JSON.parse(d.poLines || '[]');
        } catch { this.poLines = []; }

        // 5) totals and clean state
        this.calculateFxTotal();
        this.markClean();
      },
      error: (err) => console.error('Failed to load PO draft', err)
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
      'md:grid-cols-6': cols === 6,
    };
  }

  setApprovalStatus(status) {
    debugger
    this.disabledButton = true
    this.poHdr.approvalStatus = status;
    // this.notify(`PO ${status} at ${this.poHdr.approvalLevel} level`);
    this.saveRequest()
  }


  @HostListener('document:click', ['$event'])
  onDocumentClick(event: Event) {
    const target = event.target as HTMLElement;

    // Check if click is outside any dropdown
    this.poLines.forEach(line => {
      if (!target.closest('.dropdown-cell')) {
        line.dropdownOpen = '';
      }
    });
    if (!target.closest('.relative')) {
      for (let key in this.dropdownOpen) {
        this.dropdownOpen[key] = false;
      }
    }
  }

  toggleDropdown(field: string, open?: boolean) {
    debugger
    this.dropdownOpen[field] = open !== undefined ? open : !this.dropdownOpen[field];
    if (this.dropdownOpen[field]) {
      switch (field) {
        case 'approval': this.filteredLists[field] = [...this.approvalLevel]; break;
        case 'supplier': this.filteredLists[field] = [...this.suppliers]; break;
        case 'paymentTerms': this.filteredLists[field] = [...this.paymentTerms]; break;
        case 'currency': this.filteredLists[field] = [...this.currencies]; break;
        case 'incoterms': this.filteredLists[field] = [...this.incoterms]; break;
        case 'deliveryLoc': this.filteredLists[field] = [...(this.deliveries || [])]; break;
      }
    }
  }

  // Filter function
  filter(field: string) {

    const search = this.searchTexts[field].toLowerCase();

    switch (field) {
      case 'approval':
        this.filteredLists[field] = this.approvalLevel.filter((s: any) => s.name.toLowerCase().includes(search));
        break;
      case 'supplier':
        this.filteredLists[field] = this.suppliers.filter((s: any) => s.name.toLowerCase().includes(search));
        break;
      case 'paymentTerms':
        this.filteredLists[field] = this.paymentTerms.filter((p: any) => p.paymentTermsName.toLowerCase().includes(search));
        break;
      case 'currency':
        this.filteredLists[field] = this.currencies.filter((s: any) => s.currencyName.toLowerCase().includes(search));
        break;
      case 'incoterms':
        this.filteredLists[field] = this.incoterms.filter((s: any) => s.incotermsName.toLowerCase().includes(search));
        break;
      case 'deliveryLoc':
        this.filteredLists[field] = (this.deliveries || [])
          .filter((x: any) => (x?.name || '').toLowerCase().includes(search));
        break;  
    }
  }

  //  Select item
  select(field: string, item: any) {

    this.searchTexts[field] = item.name || item.paymentTermsName || item.currencyName || item.incotermsName;
    switch (field) {
      case 'approval':
        this.poHdr.approveLevelId = item.id;
        break;
      case 'supplier':
        this.poHdr.supplierId = item.id;

        const found = this.currencies.find(x => x.id === item.currencyId);
        this.poHdr.currencyId = item.currencyId;
        this.poHdr.currencyName = found?.currencyName || found?.name || '';
        this.poHdr.fxRate = this.poHdr.currencyName === 'SGD' ? 1 : 0;
        this.searchTexts['currency'] = this.poHdr.currencyName;

        if(this.poHdr.currencyName === 'SGD'){
        const foundGst = this.countries.find(x => x.id === item.countryId);
        this.poHdr.tax = foundGst?.gstPercentage;
        this.showShipping = false
        }else{
          this.poHdr.tax = 0
          this.showShipping = true
        }
        
         
        const foundTerms = this.paymentTerms.find(x => x.id === item.termsId);
        this.searchTexts['paymentTerms'] = foundTerms.paymentTermsName;
        this.poHdr.paymentTermId  = foundTerms.id


        // 🔹 Recalculate all line taxes with new GST%
        this.poLines.forEach(l => this.calculateLineTotal(l));

        // ✅ NEW: when supplier changes, auto fill price for all existing lines
        this.applySupplierPricesToAllLines();
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
        // auto-fill contact number (only if not locked)
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
  // Clear search
  onClearSearch(field: string) {
    this.searchTexts[field] = '';
    this.dropdownOpen[field] = false;
  }


  //--------------- table ----------//

  openDropdown(index: number, field: string) {
    debugger
    this.poLines[index].dropdownOpen = field;
    // show all initially
    if (field === 'prNo') {
      this.poLines[index].filteredOptions = [...(this.allPrNos || [])];
    }
    if (field === 'item') {
      this.poLines[index].filteredOptions = [...(this.allItems || [])];
    }
    if (field === 'budget') {
      this.poLines[index].filteredOptions = [...(this.allBudgets || [])];
    }
    if (field === 'recurring') {
      this.poLines[index].filteredOptions = [...(this.allRecurring || [])];
    }
    if (field === 'taxCode') {
      this.poLines[index].filteredOptions = [...(this.allTaxCodes || [])];
    }
    if (field === 'location') {
      this.poLines[index].filteredOptions = [...(this.deliveries || [])];
    }
  }

  filterOptions(index: number, field: string) {
    debugger
    const searchValue = (this.poLines[index][field] || '').toLowerCase();

    if (field === 'prNo') {
      const src = this.allPrNos || [];
      this.poLines[index].filteredOptions = src
        .filter((x: any) => (x?.purchaseRequestNo || '').toLowerCase().includes(searchValue));
    }

    if (field === 'item') {
      const src = this.allItems || [];
      this.poLines[index].filteredOptions = src
        .filter((x: any) =>
          (x?.itemCode || '').toLowerCase().includes(searchValue) ||
          (x?.itemName || '').toLowerCase().includes(searchValue)
        );
    }

    if (field === 'budget') {
      const src = this.allBudgets || [];
      this.poLines[index].filteredOptions = src
        .filter((x: any) => (x?.label || '').toLowerCase().includes(searchValue));
    }

    if (field === 'recurring') {
      const src = this.allRecurring || [];
      this.poLines[index].filteredOptions = src
        .filter((x: any) => (x?.recurringName || '').toLowerCase().includes(searchValue));
    }

    if (field === 'taxCode') {
      const src = this.allTaxCodes || [];
      this.poLines[index].filteredOptions = src
        .filter((x: any) => (x?.name || '').toLowerCase().includes(searchValue));
    }
    if (field === 'location') {
      const src = this.deliveries || [];
      this.poLines[index].filteredOptions = src
        .filter((x: any) => (x?.name || '').toLowerCase().includes(searchValue));
    }
  }

  selectOption(index: number, field: string, option: any) {
    debugger
    if (field === 'prNo') {
      const chosenNo: string = option?.purchaseRequestNo ?? option;
      const pr = this.allPrNos.find((p: any) => p.purchaseRequestNo === chosenNo);
      if (!pr) return;

      // Close dropdown on the clicked row
      this.poLines[index].dropdownOpen = '';
      this.poLines[index].filteredOptions = [];

      // ✅ Append PR lines
      this.appendPRToPOLines(pr);

      // ✅ NEW: after PR lines appended, fetch supplier prices for those items
      for (const l of this.poLines) {
        const itemId = this.getItemIdFromLine(l);
        if (itemId) this.fetchSupplierPricesForItem(itemId);
      }

      // ✅ if supplier already selected, auto-fill prices now
      this.applySupplierPricesToAllLines();


      // ✅ Remove the picker row if it's empty or only has PR No
      if (this.isOnlyPrNo(this.poLines[index]) || this.isEmptyLine(this.poLines[index])) {
        this.poLines.splice(index, 1);
        this.recalculateTotals();
      }

      return;
    }

    // Other fields
    if (field === 'item') {
      this.poLines[index].item = `${option.itemCode} - ${option.itemName}`;

        // optional: auto-fill description
        if (!this.poLines[index].description?.trim()) {
          this.poLines[index].description = option?.description || option?.name || option?.itemName || '';
        }

        // default tax code if empty
        if (!this.poLines[index].taxCode) {
          this.poLines[index].taxCode = this.getDefaultTaxName();
        }

        // ✅ load supplier price for this item (if supplier already selected)
        const itemId = Number(option?.id || 0);
        if (itemId) {
          this.fetchSupplierPricesForItem(itemId);
          // apply if supplier already selected
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

    this.poLines[index].dropdownOpen = ''; // close dropdown
  }

  /** ========= APPEND PR → PO LINES (no replace) ========= */
  private appendPRToPOLines(pr: any) {
    const lines = this.safeParsePrLines(pr?.prLines);
    if (!lines.length) return;

    const newPOLines = lines.map((l: any) =>
      this.mapPRLineToPOLine(pr.purchaseRequestNo, l)
    );

    // ✅ 1) Remove ALL empty/placeholder rows before appending
    this.poLines = this.poLines.filter(line => !this.isEmptyLine(line) && !this.isOnlyPrNo(line));

    // ✅ 2) Append new PR lines (avoid duplicates — or merge qty)
    for (const nl of newPOLines) {
      const dupIdx = this.poLines.findIndex(pl => this.isSameLine(pl, nl));
      if (dupIdx === -1) {
        this.poLines.push(nl);
      } else {
        // If you prefer merging quantities for identical lines, uncomment:
        // this.poLines[dupIdx].qty = (Number(this.poLines[dupIdx].qty) || 0) + (Number(nl.qty) || 0);
      }
    }

    // refresh totals
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

    // Prefer "code - name" if both exist; fallback to whatever is present
    const itemCode = line.itemCode ?? line.itemSearch ?? '';
    const itemName = line.itemName ?? line.itemSearch ?? '';
    po.item = itemName && itemCode ? `${itemCode} - ${itemName}` : (itemCode || itemName || '');

    po.description = line.remarks ?? '';
    po.budget = line.budget ?? '';
    // po.location = line.location ?? line.locationSearch ?? '';
    this.poHdr.location = line.location ?? line.locationSearch ?? '';

    // Safe lookup for contact number from deliveries list
    try {
      const loc = (this.deliveries || []).find((x: any) =>
        (x?.name || '').toLowerCase() === (this.poHdr.location || '').toLowerCase()
      );
      // po.contactNumber = loc?.contactNumber || '';
      this.poHdr.contactNumber = loc?.contactNumber || '';
    } catch {
      // po.contactNumber = '';
      this.poHdr.contactNumber = '';
    }

    po.qty = Number(line.qty) || 0;
    po.taxCode = this.getDefaultTaxName();

    this.searchTexts['deliveryLoc'] = this.poHdr.location || '';

    return po;
  }
  private makeEmptyPOLine() {
    return {
       __fromPR: false, 
      prNo: '',
      item: '',
      description: '',
      budget: '',
      recurring: '',
      taxCode: '',
      // location: '',
      // contactNumber: '',
      qty: 0,
      price: '',
      discount: '',
      // NEW derived fields
      baseAmount: 0,       // qty * unit
      discountAmount: 0,   // discount amount in $
      taxAmount: 0,        // GST amount in $
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
    debugger
    this.poLines.push({
      __fromPR: false,
      prNo: '',
      item: '',
      description: '',
      budget: '',
      // recurring: '',
      taxCode: '',
      // location: '',
      // contactNumber: '',
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



  /** Treat a row with no meaningful data as empty */
  private isEmptyLine(line: any): boolean {
    return !line?.prNo &&
      !line?.item &&
      !line?.budget &&
      !line?.location &&
      !String(line?.description ?? '').trim() &&
      (Number(line?.qty) || 0) === 0;
  }

  /** Row that has ONLY a PR number (typical "picker" row after selection) */
  private isOnlyPrNo(line: any): boolean {
    const empty = (v: any) => !String(v ?? '').trim();
    return !!line?.prNo &&
      empty(line?.item) &&
      empty(line?.budget) &&
      empty(line?.location) &&
      empty(line?.description) &&
      (Number(line?.qty) || 0) === 0;
  }

  /** Equality used to prevent duplicate rows */
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
    const copy = [...this.poLines]; copy[i] = { ...copy[i], [key]: val }; this.poLines = copy;
  }

  trackByIndex = (i: number, _: any) => i;

  calculateLineTotal(line: any) {
    if (!line) { return; }

    // quantity (non-negative)
    const qty = Math.max(0, +line.qty || 0);
    line.qty = qty;

    const unit = +line.price || 0;          // unit price
    const discPct = +line.discount || 0;    // discount %
    const gstPct = +this.poHdr.tax || 0;    // GST % from supplier country
    const taxMode = this.getTaxFlag(line);
    const hasTax = !!line.taxCode && gstPct > 0;

    // ---- base + discount ----
    const rawBase = qty * unit;                           // qty * price
    const discountAmt = rawBase * (discPct / 100);        // discount in $
    const baseAfterDisc = +(rawBase - discountAmt).toFixed(2);

    let taxAmt = 0;
    let lineNet = 0;

    if (!hasTax || taxMode === 'EXEMPT') {
      // No GST or Exempt – just discounted base
      lineNet = baseAfterDisc;
      taxAmt = 0;
    } else if (taxMode === 'EXCLUSIVE') {
      // Exclusive – add GST on top of discounted base
      taxAmt = +(baseAfterDisc * (gstPct / 100)).toFixed(2);
      lineNet = baseAfterDisc + taxAmt;
    } else {
      // INCLUSIVE  – price already includes GST
      // baseAfterDisc = GST-inclusive amount
      lineNet = baseAfterDisc;
      // split GST portion out (e.g. 12% of 1120 -> 120)
      taxAmt = +(lineNet * (gstPct / (100 + gstPct))).toFixed(2);
    }

    // store back on the line
    line.baseAmount = +rawBase.toFixed(2);
    line.discountAmount = +discountAmt.toFixed(2);
    line.taxAmount = +taxAmt.toFixed(2);
    line.total = +lineNet.toFixed(2);

    // refresh totals
    this.recalculateTotals();
  }

  recalculateTotals() {
    // Just force Angular change detection by re-assigning the header object
    this.poHdr = { ...this.poHdr };
    this.calculateFxTotal();
  }


  /** Compute totals dynamically */
  /** Totals getter used in template */
  get poTotals() {
    // return this.calcTotals(this.poLines, this.poHdr.shipping, this.poHdr.discount, this.poHdr.tax);
    return this.calcTotals(this.poLines, this.poHdr.shipping, this.poHdr.discount);
  }

  /** 
   * subtotal       = sum of all (qty * price)  -> baseAmount
   * lineDiscount   = sum of all discountAmount
   * shippingWithTax = shipping + (shipping * GST%)
   * netTotal       = subtotal - lineDiscount - headerDiscount + lineTax + shippingWithTax
   */
  // calcTotals(lines: any[], shipping = 0, headerDiscount = 0, gstPercent = 0) {
  //   let subTotal = 0;
  //   let lineDiscountTotal = 0;
  //   let lineTaxTotal = 0;

  //   for (const l of lines || []) {
  //     subTotal += Number(l.baseAmount) || 0;
  //     lineDiscountTotal += Number(l.discountAmount) || 0;
  //     lineTaxTotal += Number(l.taxAmount) || 0;
  //   }

  //   const ship = Number(shipping) || 0;
  //   const hdrDisc = Number(headerDiscount) || 0;
  //   const gst = Number(gstPercent) || 0;

  //   const shippingTax = gst > 0 ? ship * (gst / 100) : 0;
  //   const shippingWithTax = ship + shippingTax;

  //   const netTotal =
  //     subTotal
  //     - lineDiscountTotal
  //     - hdrDisc
  //     + lineTaxTotal
  //     + shippingWithTax;

  //   return {
  //     subTotal: this.round(subTotal),
  //     lineDiscountTotal: this.round(lineDiscountTotal),
  //     lineTaxTotal: this.round(lineTaxTotal),
  //     shipping: this.round(ship),
  //     shippingTax: this.round(shippingTax),
  //     shippingWithTax: this.round(shippingWithTax),
  //     netTotal: this.round(netTotal)
  //   };
  // }

calcTotals(lines: any[], shipping = 0, headerDiscount = 0) {
  let subTotal = 0;                 // display subtotal
  let lineDiscountTotal = 0;        // display discount
  let lineTaxTotal = 0;
  let linesGrandTotal = 0;

  const gst = Math.max(0, +this.poHdr.tax || 0);
  const gstFactor = gst > 0 ? (1 + gst / 100) : 1;

  for (const l of lines || []) {
    const tax = Number(l.taxAmount) || 0;
    const disc = Number(l.discountAmount) || 0; // currently tax-included for inclusive
    const total = Number(l.total) || 0;

    const mode = (this.getTaxFlag(l) || '').toString().toUpperCase();

    lineTaxTotal += tax;
    linesGrandTotal += total;

    if (mode === 'INCLUSIVE' && gst > 0 && tax > 0) {
      // ✅ Convert to EXCL TAX (to look like Exclusive summary)

      const afterDiscExclTax = total - tax;         // (incl total - tax) => excl after discount
      const discExclTax = disc / gstFactor;         // ✅ discount shown like exclusive
      const beforeDiscExclTax = afterDiscExclTax + discExclTax;

      subTotal += beforeDiscExclTax;
      lineDiscountTotal += discExclTax;             // ✅ FIX
    } else {
      // ✅ keep old behavior for Exclusive/Exempt
      subTotal += Number(l.baseAmount) || 0;
      lineDiscountTotal += disc;
    }
  }

  const ship = Number(shipping) || 0;
  const hdrDisc = Number(headerDiscount) || 0;

  const foundGst = this.countries.find(
  x => x.countryName?.toLowerCase() === 'singapore'
  );

  const shippingWithTax = ship + (ship * (foundGst?.gstPercentage) / 100);

  // ✅ Net Total always based on line.total
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
    const fx = Number(this.poHdr.fxRate) || 1;
    const netTotal = this.poTotals?.netTotal || 0;

    if (this.isSGDCurrency()) {
      // Base currency = SGD → no conversion needed
      this.poHdr.netTotalBase = netTotal;
    } else {
      // Convert to base SGD
      this.poHdr.netTotalBase = Number((netTotal * fx).toFixed(2));
    }
  }
  notify(msg: string) {
    alert(msg);
  }
  deliveryChange() {
    this.iserrorDelivery = false
  }
  poDateChange() {
    this.iserrorPoDate = false
  }
  validatePO(): boolean {

    // Case 1: No lines
    if (this.poLines.length === 0) {
      Swal.fire({ icon: 'warning', title: 'Required', text: 'Please add at least one line item.' });
      return false;
    }

    // ⭐ NEW: Missing Item
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
    // ⭐ NEW: Missing Tax Code
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

    // Case 2: Missing or invalid price
    // const invalidLine = this.poLines.find(line => !line.price || line.price <= 0);
    const invalidLine = this.poLines.find(line =>
      line.item && (!line.price || Number(line.price) <= 0)
    );
    if (invalidLine) {
      Swal.fire({ icon: 'warning', title: 'Required', text: 'Please enter a valid price for all Line items.' });
      return false;
    }

    return true; // ✅ everything is okay
  }

  private normalizeLinesBeforeSave(): void {
  this.poLines = (this.poLines || []).map(l => ({
    ...l,
    prNo: (l.prNo || '').toString().trim()
  }));
}
 private getRequiredKeysForSave(): string[] {
  const base = ['supplier', 'approval', 'paymentTerms'];
  if (!this.lockHeaderByPR) base.push('deliveryLoc'); // ✅ required only when no PR
  return base;
}

  saveRequest() {
    debugger

    if (this.draftId) {

      this.submitted = true;
      if (!this.poHdr.deliveryDate) {
        this.iserrorDelivery = true
      } else {
        this.iserrorDelivery = false;
      }
      if (!this.poHdr.poDate) {
        this.iserrorPoDate = true
      } else {
        this.iserrorPoDate = false;
      }

      const missing = this.getRequiredKeysForSave().filter(k => this.isEmpty(this.searchTexts[k]))
      if (missing.length || this.iserrorDelivery || this.iserrorPoDate) {

        Swal.fire({
          icon: 'warning',
          title: 'Required',
          text: 'Please fill required Fields',
          confirmButtonColor: '#0e3a4c'
        });
        this.disabledButton = false
        return;
      }


      if (!this.validatePO()) return;
      this.normalizeLinesBeforeSave();
      const draftPayload = this.buildPayloadForSaveDraft();

      this.poTempService.updatePODraft(this.draftId, draftPayload).pipe(
        // 2) Only after save succeeds, promote
        switchMap(() => this.poTempService.promotePODraft(this.draftId, this.userId))
      ).subscribe({
        next: (res) => {
          const newPoId = res?.data?.id;
          Swal.fire({ icon: 'success', title: 'Converted', text: 'Draft converted to PO' });
          this.router.navigate(['/purchase/list-purchaseorder']);
        },
        error: () => Swal.fire({ icon: 'error', title: 'Error', text: 'Failed to convert draft' })
      });
      return;
    }

    this.submitted = true;
    if (!this.poHdr.deliveryDate) {
      this.iserrorDelivery = true
    } else {
      this.iserrorDelivery = false;
    }
    if (!this.poHdr.poDate) {
      this.iserrorPoDate = true
    } else {
      this.iserrorPoDate = false;
    }

    const missing = this.getRequiredKeysForSave().filter(k => this.isEmpty(this.searchTexts[k]))
    if (missing.length || this.iserrorDelivery || this.iserrorPoDate) {

      Swal.fire({
        icon: 'warning',
        title: 'Required',
        text: 'Please fill required Fields',
        confirmButtonColor: '#0e3a4c'
      });
      this.disabledButton = false
      return;
    }


    if (!this.validatePO()) return;

    this.normalizeLinesBeforeSave();

    const payload = {
      id: this.poHdr.id ? this.poHdr.id : 0,
      purchaseOrderNo: this.poHdr.purchaseOrderNo ? this.poHdr.purchaseOrderNo : '',
      supplierId: this.poHdr.supplierId,
      approveLevelId: this.poHdr.approveLevelId,
      paymentTermId: this.poHdr.paymentTermId,
      currencyId: this.poHdr.currencyId,
      fxRate: this.poHdr.fxRate,
      incotermsId: this.poHdr.incotermsId,
      poDate: this.poHdr.poDate,
      deliveryDate: this.poHdr.deliveryDate,
      location:this.poHdr.location,
      contactNumber: this.poHdr.contactNumber,
      remarks: this.poHdr.remarks,
      tax: this.poHdr.tax,
      shipping: this.poHdr.shipping,
      discount: this.poHdr.discount,
      subTotal: Number(this.poTotals.subTotal.toFixed(2)),
      netTotal: Number(this.poTotals.netTotal.toFixed(2)),
      approvalStatus: this.poHdr.approvalStatus,
      poLines: JSON.stringify(this.poLines),
      StockReorderId: this.poHdr.stockReorderId
    };

    if (this.poHdr.id && this.poHdr.id > 0) {
      // 🔹 Update request
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
          this.router.navigateByUrl(`/purchase/list-purchaseorder`)

        },
        error: () => {
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
      // 🔹 Create request
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
          this.router.navigateByUrl(`/purchase/list-purchaseorder`)

        },
        error: () => {
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

  cancel() {
    this.router.navigate(['/purchase/list-purchaseorder']);
  }

  allowOnlyNumbers(event: KeyboardEvent) {
    const invalidKeys = ['e', 'E', '+', '-', '.'];
    if (invalidKeys.includes(event.key)) {
      event.preventDefault();
    }
  }
 sanitizeNumberInput(field: string, index: number) {
  let val = (this.poLines[index][field] ?? '').toString();

  // allow only digits and dot
  val = val.replace(/[^0-9.]/g, '');

  // keep only first dot
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
    // default if nothing found or “Exclusive (add GST)”
    return 'EXCLUSIVE';
  }
  onTaxCodeChange(i: number): void {
    const line = this.poLines[i];
    if (!line) { return; }

    // Recalculate using current qty, price, discount, GST% and tax mode
    this.calculateLineTotal(line);
  }
  private getDefaultTaxName(): string {
  // try to find "EXCLUSIVE" from master list, else fallback
  const def = (this.allTaxCodes || []).find((x: any) =>
    (x?.name || '').toString().toUpperCase().includes('EXCLUSIVE')
  );
  return def?.name || 'Exclusive';
  }

  ///// for temp data------////

  async goToPurchaseorder() {
    if (this.purchaseOrderId) {
      this.router.navigate(['/purchase/list-purchaseorder']);
      return;
    }
    if (this.draftId) {
      if (this.isDirty) {
        const ok = await this.saveDraft(); // this calls updatePODraft(draftId, payload)
        if (!ok) return;                   // stop if save failed
      }
      this.router.navigate(['/purchase/list-purchaseorder']);
      return;
    }
    const ok = await this.confirmLeave();
    if (ok) this.router.navigate(['/purchase/list-purchaseorder']);

  }
  async confirmLeave(): Promise<boolean> {
    debugger
    // Never prompt in EDIT mode
    if (this.purchaseOrderId) return true;

    // Only prompt if user actually changed something
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

    if (result.isConfirmed) return await this.saveDraft(); // save then leave
    if (result.isDenied) return true;                       // discard and leave
    return false;                                           // stay
  }


  private buildPayloadForSaveDraft() {
    debugger
    return {
      id: this.draftId ?? 0,
      purchaseOrderNo: this.poHdr.purchaseOrderNo || '',
      supplierId: this.poHdr.supplierId || 0,
      approveLevelId: this.poHdr.approveLevelId || 0,
      paymentTermId: this.poHdr.paymentTermId || 0,
      currencyId: this.poHdr.currencyId || 0,
      fxRate: this.poHdr.fxRate || 0,
      incotermsId: this.poHdr.incotermsId || 0,
      poDate: this.poHdr.poDate,
      deliveryDate: this.poHdr.deliveryDate || null,
      location:this.poHdr.location,
      contactNumber: this.poHdr.contactNumber,
      remarks: this.poHdr.remarks || '',
      tax: this.poHdr.tax || 0,
      shipping: this.poHdr.shipping || 0,
      discount: this.poHdr.discount || 0,
      subTotal: Number(this.poTotals.subTotal.toFixed(2)),
      netTotal: Number(this.poTotals.netTotal.toFixed(2)),
      approvalStatus: this.poHdr.approvalStatus === '' || this.poHdr.approvalStatus == null ? 0 : this.poHdr.approvalStatus,
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
          // if create, remember new draft id
          if (!this.draftId) {
            // API returns { success, message, data: { id } }
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
          Swal.fire({ icon: 'error', title: 'Error', text: 'Draft save failed', confirmButtonColor: '#d33' });
          resolve(false);
        }
      });
    });
  }
  ///// for temp data------////
}
