import { Component, OnInit, ViewEncapsulation } from '@angular/core';
import { CoreSidebarService } from '@core/components/core-sidebar/core-sidebar.service';
import { FilterApplyPayload } from '../reports-filters/reports-filters.component';
type DeliveryStatus = 'PLANNED' | 'IN TRANSIT' | 'DELIVERED' | 'DELAYED' | 'CANCELLED';

interface DeliveryRow {
  doNo: string;
  customerName: string;
  branch: string;
  plannedDate: Date | string;
  actualDate?: Date | string | null; // null/undefined if not yet delivered
  status: DeliveryStatus;
  orderedQty: number;   // for % calc
  deliveryQty: number;  // delivered so far
  driver: string;
  vehicle: string;
  remarks?: string;
}

@Component({
  selector: 'app-reports-deliveries',
  templateUrl: './reports-deliveries.component.html',
  styleUrls: ['./reports-deliveries.component.scss'],
  encapsulation: ViewEncapsulation.None
})
export class ReportsDeliveriesComponent implements OnInit {
rows: DeliveryRow[] = [];
allRows: DeliveryRow[] = []
  selectedOption = 10;
  searchValue = '';
  lastFilters: FilterApplyPayload;
   customers: Array<{ id: string; name: string }> = [];
  branches:  Array<{ id: string; name: string }> = [];
 statuses:  Array<{ value: string; label: string }> = [
    { value: 'ON_TIME', label: 'On-Time' },
    { value: 'LATE',    label: 'Late' }
  ];
  constructor(private _coreSidebarService : CoreSidebarService) { }

  ngOnInit(): void {
  }
delayDays(row: DeliveryRow): number {
  const planned = new Date(row.plannedDate);
  const basis = row.actualDate ? new Date(row.actualDate) : new Date(); // today if pending
  const ms = basis.setHours(0,0,0,0) - planned.setHours(0,0,0,0);
  return Math.max(Math.floor(ms / (1000 * 60 * 60 * 24)), 0);
}

// Helper: percentage delivered (0–100)
deliveredPct(row: DeliveryRow): number {
  if (!row.orderedQty) return 0;
  return Math.min(100, Math.max(0, (row.deliveryQty / row.orderedQty) * 100));
}
 onLimitChange(event: any) {
    this.selectedOption = +event.target.value;
  }
 filterUpdate(event?: any) {
    this.searchValue = event?.target?.value ?? this.searchValue ?? '';
    this.applyFilters();
  }
  applyFilters(){};
// Optional: status → CSS class
statusClass(st: DeliveryStatus): string {
  switch (st) {
    case 'DELIVERED': return 'pill pill-success';
    case 'IN TRANSIT': return 'pill pill-info';
    case 'PLANNED': return 'pill pill-neutral';
    case 'DELAYED': return 'pill pill-warning';
    case 'CANCELLED': return 'pill pill-danger';
    default: return 'pill';
  }
}
 onFiltersApplied(payload: FilterApplyPayload) {
    this.lastFilters = payload;
    // TODO: apply filters when your DO report API is ready
    // for now just close the sidebar
    this.toggleSidebar('reports-filters-sidebar');
  }

  onFilterCanceled() {
    this.toggleSidebar('reports-filters-sidebar');
  }

// Update your global search (applyFilters or filterUpdate) to search across these fields
// Example inside applyFilters():
// const hit = [r.doNo, r.customerName, r.branch, r.driver, r.vehicle, r.status, r.remarks ?? '']
//   .some(v => String(v).toLowerCase().includes(search));

// Replace your loadMockData() with this:
private loadMockData() {
  this.allRows = [
    {
      doNo: 'DO-2025-01021',
      customerName: 'AB Builders Pvt Ltd',
      branch: 'Chennai',
      plannedDate: new Date('2025-11-10'),
      actualDate: new Date('2025-11-11'),
      status: 'DELIVERED',
      orderedQty: 120,
      deliveryQty: 120,
      driver: 'Ravi Kumar',
      vehicle: 'TN-09-AB-1234',
      remarks: 'Delivered to site gate'
    },
    {
      doNo: 'DO-2025-01022',
      customerName: 'South Cement Traders',
      branch: 'Madurai',
      plannedDate: new Date('2025-11-11'),
      actualDate: null, // not yet delivered
      status: 'IN TRANSIT',
      orderedQty: 300,
      deliveryQty: 180,
      driver: 'Selvi',
      vehicle: 'TN-58-CC-7788',
      remarks: 'Partial shipment; rest tomorrow'
    },
    {
      doNo: 'DO-2025-01023',
      customerName: 'Orbit Constructions',
      branch: 'Coimbatore',
      plannedDate: new Date('2025-11-09'),
      actualDate: null,
      status: 'DELAYED',
      orderedQty: 75,
      deliveryQty: 0,
      driver: 'Anand',
      vehicle: 'TN-66-XY-9921',
      remarks: 'Truck maintenance delay'
    },
    {
      doNo: 'DO-2025-01024',
      customerName: 'Metro Infra',
      branch: 'Chennai',
      plannedDate: new Date('2025-11-12'),
      actualDate: null,
      status: 'PLANNED',
      orderedQty: 45,
      deliveryQty: 0,
      driver: 'Devi',
      vehicle: 'TN-10-ZZ-1010',
      remarks: ''
    },
    {
      doNo: 'DO-2025-01025',
      customerName: 'Prime Estates',
      branch: 'Madurai',
      plannedDate: new Date('2025-11-08'),
      actualDate: new Date('2025-11-10'),
      status: 'DELIVERED',
      orderedQty: 60,
      deliveryQty: 60,
      driver: 'Murali',
      vehicle: 'TN-59-AA-4312',
      remarks: 'Received by Mr. Karthik'
    }
  ];
  this.rows = [...this.allRows];
}

 toggleSidebar(name): void {
    this._coreSidebarService.getSidebarRegistry(name).toggleOpen();
  }
}
