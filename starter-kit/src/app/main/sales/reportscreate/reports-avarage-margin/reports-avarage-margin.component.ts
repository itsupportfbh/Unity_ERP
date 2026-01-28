import {
  Component,
  OnInit,
  AfterViewInit,
  ViewEncapsulation
} from '@angular/core';
import feather from 'feather-icons';
import { CoreSidebarService } from '@core/components/core-sidebar/core-sidebar.service';
import { ReportsService } from '../reports.service';
import { FilterApplyPayload } from '../reports-filters/reports-filters.component';

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

  // dropdown data
  customers:   Array<{ id: string; name: string }> = [];
  branches:    Array<{ id: string; name: string }> = [];
  salespersons:Array<{ id: string; name: string }> = [];

  lastFilters: FilterApplyPayload | null = null;

  // ==== SORT STATE ====
  // keys must match row property names coming from backend
  sortBy:
    | ''
    | 'salesInvoiceDate'
    | 'customerName'
    | 'netSales'
    | 'marginAmount'
    | 'marginPct'
    | 'location' = '';

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

    this.rows = this.filteredRows.filter((r: any) =>
      Object.values(r).some(v => v != null && String(v).toLowerCase().includes(val))
    );
  }

  toggleSidebar(name: string): void {
    this._sidebarService.getSidebarRegistry(name).toggleOpen();
  }

  openFilters() {
    this.toggleSidebar('reports-filters-sidebar');
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
        this.allRows = res.data || [];

        this.buildFilterLists();
        this.applyFiltersSortSearch(); // initial apply (no filters, but sort/search pipeline set up)
      }
    });
  }

  // Build lists for customer / branch / salesperson from loaded data
  private buildFilterLists() {
    const custSet = new Set<string>();
    const branchSet = new Set<string>();
    const spSet = new Set<string>();

    this.allRows.forEach((r: any) => {
      if (r.customerName) custSet.add(r.customerName);
      if (r.location)     branchSet.add(r.location);
      if (r.salesPerson)  spSet.add(r.salesPerson);
    });

    this.customers   = Array.from(custSet).map(c => ({ id: c, name: c }));
    this.branches    = Array.from(branchSet).map(b => ({ id: b, name: b }));
    this.salespersons= Array.from(spSet).map(s => ({ id: s, name: s }));
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

      // Date range (use SalesInvoiceDate or fallback to CreatedDate)
      if (f.startDate || f.endDate) {
        const start = f.startDate ? new Date(f.startDate) : null;
        const end   = f.endDate   ? new Date(f.endDate)   : null;

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

      // customer filter
      if (f.customerId) {
        data = data.filter(r => r.customerName === f.customerId);
      }

      // branch / location filter
      if (f.branchId) {
        data = data.filter(r => r.location === f.branchId);
      }

      // salesperson filter
      if (f.salespersonId) {
        data = data.filter(r => r.salesPerson === f.salespersonId);
      }
    }

    // 2) SORT
    data = this.applySort(data);

    // store filtered + sorted set
    this.filteredRows = data;

    // 3) SEARCH
    if (this.searchValue) {
      const val = this.searchValue.toLowerCase();
      this.rows = this.filteredRows.filter((r: any) =>
        Object.values(r).some(v => v != null && String(v).toLowerCase().includes(val))
      );
    } else {
      this.rows = [...this.filteredRows];
    }
  }

  private applySort(data: any[]): any[] {
    if (!this.sortBy) return data; // no sort selected

    const dir = this.sortDir === 'asc' ? 1 : -1;

    return data.sort((a, b) => {
      const av = a[this.sortBy];
      const bv = b[this.sortBy];

      if (av == null && bv == null) return 0;
      if (av == null) return 1;   // nulls last
      if (bv == null) return -1;

      // numeric vs string
      const aNum = typeof av === 'number' ? av : parseFloat(av);
      const bNum = typeof bv === 'number' ? bv : parseFloat(bv);

      if (!isNaN(aNum) && !isNaN(bNum)) {
        if (aNum === bNum) return 0;
        return aNum > bNum ? 1 * dir : -1 * dir;
      }

      const aStr = String(av).toLowerCase();
      const bStr = String(bv).toLowerCase();
      if (aStr === bStr) return 0;
      return aStr > bStr ? 1 * dir : -1 * dir;
    });
  }
}
