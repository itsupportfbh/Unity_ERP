import { Component, OnInit, AfterViewInit, ViewEncapsulation } from '@angular/core';
import feather from 'feather-icons';
import { CoreSidebarService } from '@core/components/core-sidebar/core-sidebar.service';
import { ReportsService } from '../reports.service';
import { FilterApplyPayload } from '../reports-filters/reports-filters.component';

type SortKey =
  | ''
  | 'salesInvoiceDate'
  | 'customerName'
  | 'netSales'
  | 'costOfSales'
  | 'marginAmount'
  | 'marginPct'
  | 'location'
  | 'salesPerson';

@Component({
  selector: 'app-reports-avarage-margin',
  templateUrl: './reports-avarage-margin.component.html',
  styleUrls: ['./reports-avarage-margin.component.scss'],
  encapsulation: ViewEncapsulation.None
})
export class ReportsAvarageMarginComponent implements OnInit, AfterViewInit {
  rows: any[] = [];          // shown in table after filter + sort + search
  filteredRows: any[] = [];  // after filter + sort (no search)
  allRows: any[] = [];       // original data from API

  selectedOption = 10;
  searchValue = '';

  // dropdown data (id==name used for filter component)
  customers: Array<{ id: string; name: string }> = [];
  branches: Array<{ id: string; name: string }> = [];
  salespersons: Array<{ id: string; name: string }> = [];

  lastFilters: FilterApplyPayload | null = null;

  // sort
  sortBy: SortKey = '';
  sortDir: 'asc' | 'desc' = 'asc';

  constructor(
    private _sidebarService: CoreSidebarService,
    private _reportsService: ReportsService
  ) {}

  ngOnInit(): void {
    this.loadAverageMarginReport();
  }

  ngAfterViewInit(): void {
    setTimeout(() => feather.replace(), 0);
  }

  onLimitChange(event: any) {
    this.selectedOption = +event.target.value;
  }

  filterUpdate(event: any) {
    const val = (event.target.value || '').toLowerCase();
    this.searchValue = val;
    this.applyFiltersSortSearch();
  }

  openFilters() {
    this.toggleSidebar('reports-filters-sidebar');
  }

  private toggleSidebar(name: string): void {
    const sb = this._sidebarService.getSidebarRegistry(name);
    if (sb) sb.toggleOpen();
  }

  // === called from <app-reports-filters> ===
  onFiltersApplied(payload: FilterApplyPayload) {
    this.lastFilters = payload;
    this.applyFiltersSortSearch();
    this.toggleSidebar('reports-filters-sidebar');
  }

  onFilterCanceled() {
    this.toggleSidebar('reports-filters-sidebar');
  }

  // === load data from API ===
  loadAverageMarginReport() {
    this._reportsService.GetSalesMarginAsync().subscribe((res: any) => {
      if (res && res.isSuccess) {
        const data = res.data || [];

        // Normalize numeric values and ensure properties exist
        this.allRows = data.map((r: any) => ({
          ...r,
          // if backend didn't send qty, try to compute later; default 0
          qty: this.toNum(r.qty),
          netSales: this.toNum(r.netSales),
          costOfSales: this.toNum(r.costOfSales),
          marginAmount: this.toNum(r.marginAmount),
          marginPct: this.toNum(r.marginPct),
          // dates: keep as is; template uses date pipe
          salesInvoiceDate: r.salesInvoiceDate || null
        }));

        this.buildFilterLists();
        this.applyFiltersSortSearch();
        setTimeout(() => feather.replace(), 0);
      } else {
        this.allRows = [];
        this.rows = [];
        this.filteredRows = [];
      }
    });
  }

  private buildFilterLists() {
    const custSet = new Set<string>();
    const branchSet = new Set<string>();
    const spSet = new Set<string>();

    this.allRows.forEach((r: any) => {
      if (r.customerName) custSet.add(r.customerName);
      if (r.location) branchSet.add(r.location);
      if (r.salesPerson) spSet.add(r.salesPerson);
    });

    this.customers = Array.from(custSet).map(c => ({ id: c, name: c }));
    this.branches = Array.from(branchSet).map(b => ({ id: b, name: b }));
    this.salespersons = Array.from(spSet).map(s => ({ id: s, name: s }));
  }

  // ==== SORT HANDLERS ====
  onSortChange() {
    this.applyFiltersSortSearch();
  }

  toggleSortDir() {
    this.sortDir = this.sortDir === 'asc' ? 'desc' : 'asc';
    this.applyFiltersSortSearch();
  }

  // ==== FILTER + SORT + SEARCH PIPELINE ====
  private applyFiltersSortSearch() {
    let data = [...this.allRows];

    // 1) FILTERS
    if (this.lastFilters) {
      const f = this.lastFilters;

      // Date range
      if (f.startDate || f.endDate) {
        const start = f.startDate ? new Date(f.startDate) : null;
        const end = f.endDate ? new Date(f.endDate) : null;

        data = data.filter(r => {
          const dtRaw = r.salesInvoiceDate || r.createdDate;
          if (!dtRaw) return false;
          const dt = new Date(dtRaw);

          if (start && dt < start) return false;
          if (end) {
            const endPlus = new Date(end);
            endPlus.setHours(23, 59, 59, 999);
            if (dt > endPlus) return false;
          }
          return true;
        });
      }

      // customer filter (your filter component sends id as name)
      if (f.customerId) data = data.filter(r => r.customerName === f.customerId);

      // branch filter
      if (f.branchId) data = data.filter(r => r.location === f.branchId);

      // salesperson filter
      if (f.salespersonId) data = data.filter(r => r.salesPerson === f.salespersonId);
    }

    // 2) SORT
    data = this.applySort(data);

    this.filteredRows = data;

    // 3) SEARCH
    if (this.searchValue) {
      const val = this.searchValue.toLowerCase();
      this.rows = this.filteredRows.filter((r: any) => {
        const invoice = (r.salesInvoiceNo || '').toLowerCase();
        const cust = (r.customerName || '').toLowerCase();
        const item = (r.itemName || '').toLowerCase();
        const cat = (r.category || '').toLowerCase();
        return (
          invoice.includes(val) ||
          cust.includes(val) ||
          item.includes(val) ||
          cat.includes(val)
        );
      });
    } else {
      this.rows = [...this.filteredRows];
    }
  }

  private applySort(data: any[]): any[] {
    if (!this.sortBy) return data;

    const dir = this.sortDir === 'asc' ? 1 : -1;
    const key = this.sortBy;

    return data.sort((a, b) => {
      const av = a[key];
      const bv = b[key];

      if (av == null && bv == null) return 0;
      if (av == null) return 1;
      if (bv == null) return -1;

      // date sort
      if (key === 'salesInvoiceDate') {
        const ad = new Date(av).getTime();
        const bd = new Date(bv).getTime();
        if (ad === bd) return 0;
        return ad > bd ? 1 * dir : -1 * dir;
      }

      // numeric sort
      const aNum = this.toNum(av);
      const bNum = this.toNum(bv);
      const bothNum = !isNaN(aNum) && !isNaN(bNum);

      if (bothNum) {
        if (aNum === bNum) return 0;
        return aNum > bNum ? 1 * dir : -1 * dir;
      }

      // string sort
      const aStr = String(av).toLowerCase();
      const bStr = String(bv).toLowerCase();
      if (aStr === bStr) return 0;
      return aStr > bStr ? 1 * dir : -1 * dir;
    });
  }

  // ==== formatting helpers ====
  toNum(v: any): number {
    if (v == null || v === '') return 0;
    const n = typeof v === 'number' ? v : parseFloat(String(v));
    return isNaN(n) ? 0 : n;
  }

  formatMoney(v: any): string {
    const n = this.toNum(v);
    // keep simple; currency pipe also ok but this is fast and clean
    return n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }

  formatPct(v: any): string {
    const n = this.toNum(v);
    return n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + '%';
  }

  getMarginClass(v: any): string {
    const n = this.toNum(v);
    if (n < 0) return 'text-danger fw-600';
    if (n > 0) return 'text-success fw-600';
    return 'text-muted fw-600';
  }
}