// reports-filters.component.ts
import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import { NgForm } from '@angular/forms';

export type DateRangeValue =
  | 'today' | 'yesterday'
  | 'last7' | 'last30'
  | 'thisMonth' | 'lastMonth'
  | 'custom';

export interface FilterModel {
  dateRange: DateRangeValue | null;
  fromDate: string | null;
  toDate: string | null;
  customerId: string | null;    // <-- changed to string | null (we won’t use here)
  branchId: string | null;      // location name
  status: string | null;
  salespersonId: string | null; // salesperson name
  categoryId: string | null;    // category name
}

export interface FilterApplyPayload extends FilterModel {
  startDate?: string | null;
  endDate?: string | null;
}

@Component({
  selector: 'app-reports-filters',
  templateUrl: './reports-filters.component.html',
  styleUrls: ['./reports-filters.component.scss']
})
export class ReportsFiltersComponent implements OnInit {
  /* What fields to show for this report */
  @Input() showCustomer    = false; // not used for "Sales by Item"
  @Input() showBranch      = true;
  @Input() showStatus      = false;
  @Input() showSalesperson = true;
  @Input() showCategory    = true;

  /* Lookup lists coming from parent (dynamic from API) */
  @Input() customers:   Array<{ id: string; name: string }> = [];
  @Input() branches:    Array<{ id: string; name: string }> = [];
  @Input() salespersons:Array<{ id: string; name: string }> = [];
  @Input() categories:  Array<{ id: string; name: string }> = [];
  @Input() statuses:    Array<{ value: string; label: string }> = [];

  @Output() saved    = new EventEmitter<FilterApplyPayload>();
  @Output() canceled = new EventEmitter<void>();

  dateRangeOptions: Array<{ value: DateRangeValue; label: string }> = [
    { value: 'today',     label: 'Today' },
    { value: 'yesterday', label: 'Yesterday' },
    { value: 'last7',     label: 'Last 7 days' },
    { value: 'last30',    label: 'Last 30 days' },
    { value: 'thisMonth', label: 'This Month' },
    { value: 'lastMonth', label: 'Last Month' },
    { value: 'custom',    label: 'Custom Range' }
  ];

  filterModel: FilterModel = {
    dateRange: 'last30',
    fromDate: null,
    toDate: null,
    customerId: null,
    branchId: null,
    status: null,
    salespersonId: null,
    categoryId: null
  };

  constructor() {}

  ngOnInit(): void {}

  private toggleSidebar(name: string) {
    // integrate with your CoreSidebarService if you want, or just let parent close it
  }

  onSubmit(form: NgForm) {
    form.control.markAllAsTouched();

    if (!this.filterModel.dateRange) return;

    if (this.filterModel.dateRange === 'custom') {
      if (!this.filterModel.fromDate || !this.filterModel.toDate) return;
      if (this.filterModel.fromDate > this.filterModel.toDate) return;
    }

    const payload = this.resolveRange(this.filterModel);
    this.saved.emit(payload);
    this.toggleSidebar('reports-filters-sidebar');
  }

  onCancel() {
    this.canceled.emit();
    this.toggleSidebar('reports-filters-sidebar');
  }

  onReset() {
    this.filterModel = {
      dateRange: 'last30',
      fromDate: null,
      toDate: null,
      customerId: null,
      branchId: null,
      status: null,
      salespersonId: null,
      categoryId: null
    };
  }

  private resolveRange(model: FilterModel): FilterApplyPayload {
    const today = new Date();
    const ymd = (d: Date) =>
      `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

    let startDate: string | null = null;
    let endDate: string | null = null;

    const firstDayThisMonth = new Date(today.getFullYear(), today.getMonth(), 1);
    const lastDayThisMonth  = new Date(today.getFullYear(), today.getMonth() + 1, 0);
    const firstDayLastMonth = new Date(today.getFullYear(), today.getMonth() - 1, 1);
    const lastDayLastMonth  = new Date(today.getFullYear(), today.getMonth(), 0);

    switch (model.dateRange) {
      case 'today': {
        startDate = endDate = ymd(today);
        break;
      }
      case 'yesterday': {
        const d = new Date(today);
        d.setDate(d.getDate() - 1);
        startDate = endDate = ymd(d);
        break;
      }
      case 'last7': {
        const d = new Date(today);
        d.setDate(d.getDate() - 6);
        startDate = ymd(d);
        endDate   = ymd(today);
        break;
      }
      case 'last30': {
        const d = new Date(today);
        d.setDate(d.getDate() - 29);
        startDate = ymd(d);
        endDate   = ymd(today);
        break;
      }
      case 'thisMonth': {
        startDate = ymd(firstDayThisMonth);
        endDate   = ymd(lastDayThisMonth);
        break;
      }
      case 'lastMonth': {
        startDate = ymd(firstDayLastMonth);
        endDate   = ymd(lastDayLastMonth);
        break;
      }
      case 'custom': {
        startDate = model.fromDate;
        endDate   = model.toDate;
        break;
      }
      default: {
        startDate = null;
        endDate   = null;
        break;
      }
    }

    return { ...model, startDate, endDate };
  }
}
