import {
  Component,
  OnInit,
  AfterViewInit,
  ViewEncapsulation
} from '@angular/core';
import { CoreSidebarService } from '@core/components/core-sidebar/core-sidebar.service';
import feather from 'feather-icons';
import { ReportsService } from '../reports.service';
import { FilterApplyPayload } from '../reports-filters/reports-filters.component';

@Component({
  selector: 'app-reports-sales-by-item',
  templateUrl: './reports-sales-by-item.component.html',
  styleUrls: ['./reports-sales-by-item.component.scss'],
  encapsulation: ViewEncapsulation.None
})
export class ReportsSalesByItemComponent implements OnInit, AfterViewInit {

  rows: any[] = [];          // table display (after filter + sort + search)
  filteredRows: any[] = [];  // after filters + sort (no search)
  allRows: any[] = [];       // raw API data

  selectedOption = 10;
  searchValue = '';

  // dropdown lists for filters (built from data)
  categories:   Array<{ id: string; name: string }> = [];
  branches:     Array<{ id: string; name: string }> = [];
  salespersons: Array<{ id: string; name: string }> = [];

  lastFilters: FilterApplyPayload | null = null;

  // === SORT STATE ===
  sortBy: '' | 'itemName' | 'category' | 'quantity' | 'netSales' | 'grossSales' | 'marginPct' = '';
  sortDir: 'asc' | 'desc' = 'asc';

  constructor(
    private _coreSidebarService: CoreSidebarService,
    private _salesReportService: ReportsService
  ) {}

  ngOnInit(): void {
    this.loadSalesByItemReport();
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

    // search applies on filteredRows (already filtered + sorted)
    this.rows = this.filteredRows.filter((r: any) =>
      Object.values(r).some(v => v != null && String(v).toLowerCase().includes(val))
    );
  }

  toggleSidebar(name: string): void {
    this._coreSidebarService.getSidebarRegistry(name).toggleOpen();
  }

  openFilters() {
    this.toggleSidebar('reports-filters-sidebar');
  }

  // from <app-reports-filters>
  onFiltersApplied(payload: FilterApplyPayload) {
    this.lastFilters = payload;
    this.applyFiltersSortSearch();
    this.toggleSidebar('reports-filters-sidebar');
  }

  onFilterCanceled() {
    this.toggleSidebar('reports-filters-sidebar');
  }

  // ================== LOAD DATA ==================
  loadSalesByItemReport() {
    this._salesReportService.GetSalesByItemAsync().subscribe((res: any) => {
      if (res && res.isSuccess) {
        this.allRows = res.data || [];
        this.buildFilterLists();

        // initial: no external filters, just apply sort+search
        this.applyFiltersSortSearch();
      }
    });
  }

  private buildFilterLists() {
    const catSet = new Set<string>();
    const branchSet = new Set<string>();
    const spSet = new Set<string>();

    this.allRows.forEach((r: any) => {
      if (r.category)    catSet.add(r.category);
      if (r.location)    branchSet.add(r.location);
      if (r.salesPerson) spSet.add(r.salesPerson);
    });

    this.categories   = Array.from(catSet).map(c => ({ id: c, name: c }));
    this.branches     = Array.from(branchSet).map(b => ({ id: b, name: b }));
    this.salespersons = Array.from(spSet).map(s => ({ id: s, name: s }));
  }

  // ================== SORT HANDLERS ==================
  onSortChange() {
    this.applyFiltersSortSearch();
  }

  toggleSortDir() {
    this.sortDir = this.sortDir === 'asc' ? 'desc' : 'asc';
    this.applyFiltersSortSearch();
  }

  // ================== FILTER + SORT + SEARCH PIPELINE ==================
  private applyFiltersSortSearch() {
    // 1) FILTERS (date/category/branch/salesperson)
    let data = [...this.allRows];

    if (this.lastFilters) {
      const f = this.lastFilters;

      // date range on createdDate
      if (f.startDate || f.endDate) {
        const start = f.startDate ? new Date(f.startDate) : null;
        const end   = f.endDate ? new Date(f.endDate) : null;

        data = data.filter(r => {
          const dtRaw = r.createdDate;
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

      // category
      if (f.categoryId) {
        data = data.filter(r => r.category === f.categoryId);
      }

      // branch / location
      if (f.branchId) {
        data = data.filter(r => r.location === f.branchId);
      }

      // salesperson
      if (f.salespersonId) {
        data = data.filter(r => r.salesPerson === f.salespersonId);
      }
    }

    // 2) SORT
    data = this.applySort(data);

    // Save sorted, filtered list
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
    if (!this.sortBy) return data;  // no sort selected

    const dir = this.sortDir === 'asc' ? 1 : -1;

    return data.sort((a, b) => {
      const av = a[this.sortBy];
      const bv = b[this.sortBy];

      // null/undefined handling
      if (av == null && bv == null) return 0;
      if (av == null) return 1;  // nulls last
      if (bv == null) return -1;

      // numeric vs string
      const aNum = typeof av === 'number' ? av : parseFloat(av);
      const bNum = typeof bv === 'number' ? bv : parseFloat(bv);

      if (!isNaN(aNum) && !isNaN(bNum)) {
        return aNum === bNum ? 0 : (aNum > bNum ? 1 * dir : -1 * dir);
      }

      const aStr = String(av).toLowerCase();
      const bStr = String(bv).toLowerCase();
      if (aStr === bStr) return 0;
      return aStr > bStr ? 1 * dir : -1 * dir;
    });
  }
}
