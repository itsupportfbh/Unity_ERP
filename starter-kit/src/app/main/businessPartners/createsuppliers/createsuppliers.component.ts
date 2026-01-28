import { Component, OnInit, ViewEncapsulation } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { forkJoin, of } from 'rxjs';
import { switchMap } from 'rxjs/operators';
import Swal from 'sweetalert2';

import { CurrencyService } from 'app/main/master/currency/currency.service';
import { IncotermsService } from 'app/main/master/incoterms/incoterms.service';
import { ItemsService } from 'app/main/master/items/items.service';
import { PaymentTermsService } from 'app/main/master/payment-terms/payment-terms.service';
import { SupplierService } from '../supplier/supplier.service';
import { CountriesService } from 'app/main/master/countries/countries.service';
import { ChartofaccountService } from 'app/main/financial/chartofaccount/chartofaccount.service';

/* =========================
   Types
========================= */
type Country = { id: number; countryName: string; isActive?: boolean };
type Term = { id: number; paymentTermsName: string; isActive?: boolean };
type Currency = { id: number; currencyName: string; currencyCode?: string; isActive?: boolean };
type Incoterm = { id: number; incotermsName: string; code?: string; name?: string; isActive?: boolean };
type Item = { id: number; itemName: string; isActive?: boolean };
type StatusOption = { id: number; name: 'Active' | 'Inactive' | 'On Hold' };

type BudgetLine = {
  id: number;
  headCode: number | string;
  headLevel: number;
  headName: string;
  headType?: string;
  headCodeName?: string | null;   // full breadcrumb text
  isGl?: boolean | null;
  isTransaction?: boolean | null;
};

interface SupplierModel {
  id?: number;
  name: string;
  code?: string;
  statusId: number;
  leadTime: number | null;
  countryId: number | null;
  termsId: number | null;
  currencyId: number | null;
  taxReg: string;
  incotermsId: number | null;
  contact: string;
  email: string;
  phone: string;
  address: string;
  bank: {
    name: string;
    acc: string;
    swift: string;
    branch: string;
  };

  /** Budget line / COA id */
  budgetLineId: number | null;
}

/** We keep both base64 (for API) and dataUrl (for preview) — NO blob: */
interface ComplianceFile {
  name: string;
  base64: string;
  mimeType: string;
  size: number;
  dataUrl: string;
}

interface ComplianceDoc {
  name: string;
  number: string | null;
  expiry: string | null; // yyyy-mm-dd
  files: ComplianceFile[];
}

@Component({
  selector: 'app-createsuppliers',
  templateUrl: './createsuppliers.component.html',
  styleUrls: ['./createsuppliers.component.scss'],
  encapsulation: ViewEncapsulation.None
})
export class CreatesuppliersComponent implements OnInit {

  /* =========================
     Master lists / selections
  ========================= */
  CountryList: Country[] = [];
  filteredCountry: Country[] = [];
  selectedCountry: Country | null = null;

  PaymentTermsList: Term[] = [];
  filteredTerms: Term[] = [];
  selectedTerm: Term | null = null;

  CurrencyList: Currency[] = [];
  filteredCurrencies: Currency[] = [];
  selectedCurrency: Currency | null = null;

  incotermsList: Incoterm[] = [];
  filteredIncoterms: Incoterm[] = [];
  selectedIncoterm: Incoterm | null = null;

  rows: Item[] = [];
  filteredItems: Item[] = [];
  preferredItems: Item[] = [];

  // Budget line / chart of account
  BudgetList: BudgetLine[] = [];
  BudgetFiltered: BudgetLine[] = [];
  BudgetSearch = '';
  budgetDropdownOpen = false;
  selectedBudget: BudgetLine | null = null;

  /* =========================
     UI helpers
  ========================= */
  hover = false;
  preferredText = '';

  countryDropdownOpen = false;
  countrySearch = '';

  termsDropdownOpen = false;
  termsSearch = '';

  currencyDropdownOpen = false;
  currencySearch = '';

  incotermDropdownOpen = false;
  incotermSearch = '';

  statuses: StatusOption[] = [
    { id: 1, name: 'Active' },
    { id: 2, name: 'Inactive' },
    { id: 3, name: 'On Hold' }
  ];
  filteredStatus: StatusOption[] = [...this.statuses];
  statusSearch = '';
  statusDropdownOpen = false;
  selectedStatus: StatusOption | null = null;

  /* =========================
     Supplier model
  ========================= */
  supplier: SupplierModel = {
    name: '',
    code: '',
    statusId: 1,
    leadTime: null,
    countryId: null,
    termsId: null,
    currencyId: null,
    taxReg: '',
    incotermsId: null,
    contact: '',
    email: '',
    phone: '',
    address: '',
    bank: { name: '', acc: '', swift: '', branch: '' },
    budgetLineId: null
  };

  /* =========================
     Compliance docs
  ========================= */
  docs: ComplianceDoc[] = [
    { name: '', number: '', expiry: null, files: [] }
  ];

  constructor(
    private route: ActivatedRoute,
    private _countriesService: CountriesService,
    private paymentTermsService: PaymentTermsService,
    private _SupplierService: SupplierService,
    private CurrencyService: CurrencyService,
    private incotermsService: IncotermsService,
    private itemsService: ItemsService,
    private _chartOfAccountService: ChartofaccountService,
    private router: Router
  ) {}

  /* =========================
     Lifecycle
  ========================= */
  ngOnInit(): void {
    const idParam = this.route.snapshot.paramMap.get('id');
    const id = idParam ? +idParam : null;

    this.loadMasterData()
      .pipe(switchMap(() => id ? this.loadSupplierById(id) : of(null)))
      .subscribe({
        next: () => {
          if (!id) {
            const s = this.statuses.find(x => x.id === this.supplier.statusId) ?? this.statuses[0];
            this.selectedStatus = s;
            this.statusSearch = s.name;
          }
        },
        error: (err) => console.error('Init failed', err)
      });

    this._countriesService.getCountry().subscribe((res: any) => {
      this.CountryList = (res?.data ?? []).filter((x: any) => x.isActive);
      this.filteredCountry = [...this.CountryList];
    });

    this.loadBudgetLine();
  }

  /* =========================
     Master Data Loader
  ========================= */
  private loadMasterData() {
    return forkJoin({
      terms: this.paymentTermsService.getAllPaymentTerms(),
      currencies: this.CurrencyService.getAllCurrency(),
      incoterms: this.incotermsService.getAllIncoterms(),
      items: this.itemsService.getAllItem()
    }).pipe(
      switchMap(({ terms, currencies, incoterms, items }) => {
        this.PaymentTermsList = (terms?.data ?? []).filter((x: any) => x.isActive === true);
        this.filteredTerms = [...this.PaymentTermsList];

        this.CurrencyList = (currencies?.data ?? []).filter((x: any) => x.isActive === true);
        this.filteredCurrencies = [...this.CurrencyList];

        this.incotermsList = (incoterms?.data ?? []).filter((x: any) => x.isActive === true);
        this.filteredIncoterms = [...this.incotermsList];

        this.rows = (items?.data ?? []).filter((x: any) => x.isActive === true);
        return of(true);
      })
    );
  }

  /* =========================
     Load Budget / Chart of Account
  ========================= */
  loadBudgetLine(): void {
    this._chartOfAccountService.getAllChartOfAccount().subscribe((res: any) => {
      const data = (res?.data || []).filter((x: any) => x.isActive === true);

      // normalise + build breadcrumb
      this.BudgetList = data.map((head: any) => {
        const headCode = Number(head.headCode ?? head.HeadCode ?? 0);
        const headLevel = Number(head.headLevel ?? head.HeadLevel ?? 0);
        const headName = String(head.headName ?? head.HeadName ?? '');
        const headType = String(head.headType ?? head.HeadType ?? '');
        const path = this.buildFullPath(
          { headCode, parentHead: head.parentHead ?? head.ParentHead, headName },
          data
        );
        const headCodeName = `${headCode} - ${path}`;

        return {
          id: Number(head.id ?? head.Id ?? 0),
          headCode,
          headLevel,
          headName,
          headType,
          headCodeName,
          isGl: head.isGl ?? head.IsGl ?? null,
          isTransaction: head.isTransaction ?? head.IsTransaction ?? null
        } as BudgetLine;
      });

      this.BudgetFiltered = [...this.BudgetList];

      // if editing existing supplier, sync selected budget text
      this.syncSelectedBudgetFromId();
    });
  }

  /** Build breadcrumb like: Parent >> Child >> This */
  private buildFullPath(item: any, all: any[]): string {
    let path = String(item.headName ?? '').trim();
    let parentCode = Number(item.parentHead ?? 0);

    while (parentCode) {
      const current = all.find((x: any) =>
        Number(x.headCode ?? x.HeadCode ?? 0) === parentCode
      );
      if (!current) break;

      const name = String(current.headName ?? current.HeadName ?? '').trim();
      if (name) {
        path = `${name} >> ${path}`;
      }

      parentCode = Number(current.parentHead ?? current.ParentHead ?? 0);
    }

    return path;
  }

  /* =========================
     GET BY ID (Hydrate)
  ========================= */
  private loadSupplierById(id: number) {
    return this._SupplierService.getSupplierById(id).pipe(
      switchMap((api: any) => {
        try {
          this.hydrateFromApi(api);
        } catch (e) {
          console.error('Hydrate failed', e);
          Swal.fire('Error', 'Failed to parse supplier data', 'error');
        }
        return of(true);
      })
    );
  }

  private hydrateFromApi(api: any) {
    const item = (api?.data && Array.isArray(api.data) ? api.data[0] : api?.data) ?? api;
    if (!item) return;

    this.supplier = {
      id: item.id,
      name: item.name ?? '',
      code: item.code ?? '',
      statusId: item.statusId ?? 1,
      leadTime: item.leadTime ?? null,
      countryId: item.countryId ?? null,
      termsId: item.termsId ?? null,
      currencyId: item.currencyId ?? null,
      taxReg: item.taxReg ?? '',
      incotermsId: item.incotermsId ?? null,
      contact: item.contact ?? '',
      email: item.email ?? '',
      phone: item.phone ?? '',
      address: item.address ?? '',
      bank: {
        name: item.bankName ?? '',
        acc: item.bankAcc ?? '',
        swift: item.bankSwift ?? '',
        branch: item.bankBranch ?? ''
      },
      budgetLineId: item.budgetLineId ?? item.BudgetLineId ?? null
    };

    this.selectedStatus = this.statuses.find(x => x.id === this.supplier.statusId) ?? this.statuses[0];
    this.statusSearch = this.selectedStatus.name;

    this.selectedCountry = this.supplier.countryId
      ? (this.CountryList.find(x => x.id === this.supplier.countryId) || null)
      : null;
    this.countrySearch = this.selectedCountry?.countryName ?? '';

    this.selectedTerm = this.supplier.termsId
      ? (this.PaymentTermsList.find(x => x.id === this.supplier.termsId) || null)
      : null;
    this.termsSearch = this.selectedTerm?.paymentTermsName ?? '';

    this.selectedCurrency = this.supplier.currencyId
      ? (this.CurrencyList.find(x => x.id === this.supplier.currencyId) || null)
      : null;
    this.currencySearch = this.selectedCurrency?.currencyName ?? '';

    this.selectedIncoterm = this.supplier.incotermsId
      ? (this.incotermsList.find(x => x.id === this.supplier.incotermsId) || null)
      : null;
    this.incotermSearch = this.selectedIncoterm?.incotermsName ?? '';

    this.syncSelectedBudgetFromId();

    const csv = (item.itemID ?? item.ItemID ?? '').toString().trim();
    if (csv) {
      const ids = csv.split(',').map((v: string) => +v.trim()).filter((n: number) => !Number.isNaN(n));
      this.preferredItems = this.rows.filter(r => ids.includes(r.id));
    } else {
      this.preferredItems = [];
    }
    this.preferredText = '';
    this.filteredItems = [];

    const rawDocs = item.complianceDocuments ?? item.ComplianceDocuments;
    this.docs = this.parseComplianceDocsToBase64Model(rawDocs);
    if (!this.docs.length) {
      this.docs = [{ name: '', number: '', expiry: null, files: [] }];
    }
  }

  private parseComplianceDocsToBase64Model(raw: any): ComplianceDoc[] {
    if (!raw) return [];
    let arr: any[] = [];
    try { arr = typeof raw === 'string' ? JSON.parse(raw) : raw; } catch { return []; }
    if (!Array.isArray(arr)) return [];

    return arr.map((d: any) => {
      const filesIn: any[] = Array.isArray(d?.files) ? d.files : [];
      const files: ComplianceFile[] = filesIn.map((f) => {
        const name = f?.fileName || f?.name || 'file';
        const url = f?.fileUrl || f?.url || '';
        let base64 = '';
        let dataUrl = '';
        let mimeType = f?.mimeType || 'application/octet-stream';

        if (url.startsWith('data:')) {
          const comma = url.indexOf(',');
          base64 = comma >= 0 ? url.substring(comma + 1) : '';
          const m = url.match(/^data:([^;]+);base64,/i);
          if (m) mimeType = m[1];
          dataUrl = url;
        } else if (/^[A-Za-z0-9+/=]+$/.test(url) && url.length > 40) {
          base64 = url;
          dataUrl = `data:${mimeType};base64,${base64}`;
        } else if (url.startsWith('blob:')) {
          base64 = '';
          dataUrl = '';
        } else {
          base64 = '';
          dataUrl = url;
        }

        const size = typeof f?.size === 'number' ? f.size : 0;
        return { name, base64, mimeType, size, dataUrl };
      });

      return {
        name: d?.name ?? '',
        number: d?.number ?? '',
        expiry: this.toYMD(d?.expiry),
        files
      };
    });
  }

  /* =========================
     Utils
  ========================= */
  private toYMD(v: any): string | null {
    if (!v) return null;
    if (typeof v === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(v)) return v;
    const t = Date.parse(v);
    if (Number.isNaN(t)) return null;
    const d = new Date(t);
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    return `${d.getFullYear()}-${mm}-${dd}`;
  }

  private ymdToIso(v?: string | null): string | null {
    if (!v) return null;
    const [y, m, d] = v.split('-').map(n => +n);
    if (!y || !m || !d) return null;
    const dt = new Date(y, m - 1, d);
    return dt.toISOString();
  }

  private readFileAsDataURL(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const fr = new FileReader();
      fr.onload = () => resolve(fr.result as string);
      fr.onerror = reject;
      fr.readAsDataURL(file);
    });
  }

  /** Sync selectedBudget & BudgetSearch from supplier.budgetLineId */
  private syncSelectedBudgetFromId() {
    const id = this.supplier?.budgetLineId;
    if (!id || !this.BudgetList.length) {
      if (!id) {
        this.selectedBudget = null;
        this.BudgetSearch = '';
      }
      return;
    }

    this.selectedBudget = this.BudgetList.find(x => x.id === id) || null;
    this.BudgetSearch = this.selectedBudget
      ? (this.selectedBudget.headCodeName ||
         `${this.selectedBudget.headCode} - ${this.selectedBudget.headName}`)
      : '';
  }

  /* =========================
     Grid helper
  ========================= */
  gridColsClass(cols: number) {
    switch (cols) {
      case 1: return 'grid grid-cols-1 gap-3';
      case 2: return 'grid grid-cols-1 md:grid-cols-2 gap-3';
      case 3: return 'grid grid-cols-1 md:grid-cols-3 gap-3';
      case 4: return 'grid grid-cols-1 md:grid-cols-4 gap-3';
      default: return 'grid grid-cols-1 gap-3';
    }
  }

  trackByIndex(index: number) { return index; }

  /* =========================
     Country / Terms / Currency / Incoterms / Status
  ========================= */
  filterCountry() {
    const q = (this.countrySearch || '').toLowerCase();
    this.filteredCountry = this.CountryList.filter(t =>
      t.countryName.toLowerCase().includes(q)
    );
  }
  selectCountry(t: Country) {
    this.selectedCountry = t;
    this.countrySearch = t.countryName;
    this.supplier.countryId = t.id;
    this.countryDropdownOpen = false;
  }

  filterTerms() {
    const q = (this.termsSearch || '').toLowerCase();
    this.filteredTerms = this.PaymentTermsList.filter(t =>
      t.paymentTermsName.toLowerCase().includes(q)
    );
  }
  selectTerm(t: Term) {
    this.selectedTerm = t;
    this.termsSearch = t.paymentTermsName;
    this.supplier.termsId = t.id;
    this.termsDropdownOpen = false;
  }

  filterCurrencies() {
    const q = (this.currencySearch || '').toLowerCase();
    this.filteredCurrencies = this.CurrencyList.filter(c =>
      c.currencyName.toLowerCase().includes(q) || c.currencyCode?.toLowerCase().includes(q)
    );
  }
  selectCurrency(c: Currency) {
    this.selectedCurrency = c;
    this.currencySearch = c.currencyName;
    this.supplier.currencyId = c.id;
    this.currencyDropdownOpen = false;
  }

  filterIncoterms() {
    const q = (this.incotermSearch || '').toLowerCase();
    this.filteredIncoterms = this.incotermsList.filter(i =>
      (i.incotermsName || '').toLowerCase().includes(q) ||
      (i.code || '').toLowerCase().includes(q) ||
      (i.name || '').toLowerCase().includes(q)
    );
  }
  selectIncoterm(i: Incoterm) {
    this.selectedIncoterm = i;
    this.incotermSearch = i.incotermsName;
    this.supplier.incotermsId = i.id;
    this.incotermDropdownOpen = false;
  }

  filterStatus() {
    const q = (this.statusSearch || '').toLowerCase();
    this.filteredStatus = this.statuses.filter(s => s.name.toLowerCase().includes(q));
  }
  selectStatus(s: StatusOption) {
    this.selectedStatus = s;
    this.statusSearch = s.name;
    this.supplier.statusId = s.id;
    this.statusDropdownOpen = false;
  }

  /* =========================
     Budget Line dropdown
  ========================= */
  filterBudget() {
    const q = (this.BudgetSearch || '').toLowerCase();
    this.BudgetFiltered = this.BudgetList.filter(b =>
      (b.headCodeName || `${b.headCode} - ${b.headName}`).toLowerCase().includes(q)
    );
  }

  selectBudget(b: BudgetLine) {
    this.selectedBudget = b;
    this.BudgetSearch = b.headCodeName || `${b.headCode} - ${b.headName}`;
    this.supplier.budgetLineId = b.id;
    this.budgetDropdownOpen = false;
  }

  /* =========================
     Preferred Items (chips)
  ========================= */
  filterItems(): void {
    const q = (this.preferredText || '').toLowerCase();
    const chosen = new Set(this.preferredItems.map(p => p.id));
    this.filteredItems = this.rows
      .filter(item => item.itemName.toLowerCase().includes(q))
      .filter(item => !chosen.has(item.id));
  }
  selectPreferred(item: Item): void {
    if (!this.preferredItems.some(p => p.id === item.id)) {
      this.preferredItems.push(item);
    }
    this.preferredText = '';
    this.filteredItems = [];
  }
  selectFirstFilteredItem(event: KeyboardEvent): void {
    event.preventDefault();
    if (this.filteredItems.length) this.selectPreferred(this.filteredItems[0]);
  }
  removePreferred(index: number): void {
    this.preferredItems.splice(index, 1);
  }

  /* =========================
     Docs Repeater
  ========================= */
  addDoc() {
    this.docs.push({ name: '', number: '', expiry: null, files: [] });
  }
  removeDoc(i: number) {
    this.docs.splice(i, 1);
  }

  /* =========================
     File Upload
  ========================= */
  async onFileSelected(event: Event, rowIndex: number): Promise<void> {
    const input = event.target as HTMLInputElement;
    if (!input.files || input.files.length === 0) return;

    const files = Array.from(input.files);
    for (const file of files) {
      try {
        const dataUrl = await this.readFileAsDataURL(file);
        const commaIdx = dataUrl.indexOf(',');
        const base64 = commaIdx >= 0 ? dataUrl.substring(commaIdx + 1) : '';
        const mimeMatch = dataUrl.match(/^data:([^;]+);base64,/i);
        const mimeType = mimeMatch?.[1] || file.type || 'application/octet-stream';

        const entry: ComplianceFile = {
          name: file.name,
          base64,
          mimeType,
          size: file.size,
          dataUrl
        };
        this.docs[rowIndex].files.push(entry);
      } catch (err) {
        console.error('Failed to read file as base64:', err);
        Swal.fire('Error', `Failed to read file ${file.name}`, 'error');
      }
    }

    input.value = '';
  }

  removeFile(rowIndex: number, fileIndex: number): void {
    this.docs[rowIndex].files.splice(fileIndex, 1);
  }

  /* =========================
     Save
  ========================= */
  save() {
    const preferredItemIds = (this.preferredItems ?? []).map(p => p.id).join(',');

    const complianceDocsForApi = this.docs.map(d => ({
      name: (d.name || '').trim(),
      number: d.number ?? null,
      expiry: this.ymdToIso(d.expiry),
      files: d.files.map(f => ({
        fileName: f.name,
        fileUrl: f.base64,
        mimeType: f.mimeType,
        size: f.size
      }))
    }));

    const payload: any = {
      id: this.supplier.id ?? 0,
      name: this.supplier.name,
      code: this.supplier.code ?? '',
      leadTime: this.supplier.leadTime,
      taxReg: this.supplier.taxReg,
      contact: this.supplier.contact,
      email: this.supplier.email,
      phone: this.supplier.phone,
      address: this.supplier.address,

      statusId: this.supplier.statusId ?? null,
      countryId: this.supplier.countryId ?? null,
      termsId: this.supplier.termsId ?? null,
      currencyId: this.supplier.currencyId ?? null,
      incotermsId: this.supplier.incotermsId ?? null,

      budgetLineId: this.supplier.budgetLineId ?? null,

      itemID: preferredItemIds,
      ComplianceDocuments: JSON.stringify(complianceDocsForApi),

      bankName: this.supplier.bank?.name ?? null,
      bankAcc: this.supplier.bank?.acc ?? null,
      bankSwift: this.supplier.bank?.swift ?? null,
      bankBranch: this.supplier.bank?.branch ?? null,

      createdBy: 'admin',
      updatedBy: 'admin'
    };

    console.log(payload);

    const request$ = payload.id && payload.id > 0
      ? this._SupplierService.updateSupplier(payload)
      : this._SupplierService.insertSupplier(payload);

    request$.subscribe({
      next: (res: any) => {
        if (res?.isSuccess) {
          Swal.fire({
            title: 'Success',
            text: res.message ?? (payload.id > 0 ? 'Supplier updated' : 'Supplier saved'),
            icon: 'success',
            allowOutsideClick: false
          });
          if (payload.id === 0) this.new();
          this.router.navigate(['/Businesspartners/supplier']);
        } else {
          Swal.fire('Info', res?.message ?? 'Could not save supplier', 'info');
        }
      },
      error: (err) => {
        console.error('Save supplier failed:', err);
        Swal.fire({
          title: 'Error',
          text: err?.error?.title || 'Failed to save supplier.',
          icon: 'error'
        });
      }
    });
  }

  /* =========================
     Reset
  ========================= */
  new() {
    this.supplier = {
      id: 0,
      name: '',
      code: '',
      statusId: 1,
      leadTime: null,
      countryId: null,
      termsId: null,
      currencyId: null,
      taxReg: '',
      incotermsId: null,
      contact: '',
      email: '',
      phone: '',
      address: '',
      bank: { name: '', acc: '', swift: '', branch: '' },
      budgetLineId: null
    };

    this.selectedStatus = this.statuses[0];
    this.statusSearch = this.selectedStatus.name;

    this.selectedTerm = null;       this.termsSearch = '';
    this.selectedCurrency = null;   this.currencySearch = '';
    this.selectedIncoterm = null;   this.incotermSearch = '';

    this.selectedBudget = null;     this.BudgetSearch = '';

    this.preferredItems = []; this.preferredText = ''; this.filteredItems = [];
    this.docs = [{ name: '', number: '', expiry: null, files: [] }];
  }
  cancel(){
     this.router.navigate(['/Businesspartners/supplier']);
  }
}
