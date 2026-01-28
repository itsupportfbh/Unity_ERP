// stock-reorder-planning-list.component.ts
import {
  Component, OnInit, ViewChild, ViewEncapsulation, AfterViewInit, AfterViewChecked
} from '@angular/core';
import { Router } from '@angular/router';
import { ColumnMode, DatatableComponent } from '@swimlane/ngx-datatable';
import { DatePipe } from '@angular/common';
import * as feather from 'feather-icons';
import { ReorderPlanningService } from '../stock-reorder-planning.service';

const METHOD_NAME: Record<number, string> = { 1: 'MinMax', 2: 'ROP', 3: 'MRP' };

type PreviewRow = {
  prNo: string;
  itemId: number;
  itemCode: string;
  itemName: string;
  requestedQty: number;
  supplierId?: number | null;
  warehouseId?: number | null;
  location?: string | null;
  deliveryDate?: string | null;
  onHand: number;
  min: number;
  max: number;
  reorderQty: number;
  status:number;
};

@Component({
  selector: 'app-stock-reorder-planning-list',
  templateUrl: './stock-reorder-planning-list.component.html',
  styleUrls: ['./stock-reorder-planning-list.component.scss'],
  encapsulation: ViewEncapsulation.None,
  providers: [DatePipe]
})
export class StockReorderPlanningListComponent implements OnInit, AfterViewInit, AfterViewChecked {

  @ViewChild(DatatableComponent) table!: DatatableComponent;

  public ColumnMode = ColumnMode;
  public selectedOption = 10;
  public searchValue = '';

  rows: any[] = [];
  tempData: any[] = [];
  userId: any = localStorage.getItem('id');

  // Modal
  showLinesModal = false;
  modalLines: PreviewRow[] = [];

  constructor(
    private reorderPlanningService: ReorderPlanningService,
    private router: Router,
    private datePipe: DatePipe
  ) {}

  ngOnInit(): void { this.loadRequests(); }
  ngAfterViewInit(): void { feather.replace(); }
  ngAfterViewChecked(): void { feather.replace(); }

  private N(v: any, d = 0): number {
    const n = Number(v);
    return Number.isFinite(n) ? n : d;
  }

  loadRequests(): void {
    this.reorderPlanningService.getStockReorder().subscribe({
      next: (res: any) => {
        const list = Array.isArray(res?.data) ? res.data : [];
        this.rows = list.map((req: any) => ({
          ...req,
          warehouseName: req?.warehouseName ?? req?.warehouse ?? '-',
          methodName: METHOD_NAME[this.N(req?.methodId)] || '-',
        }));
        this.tempData = [...this.rows];
      },
      error: (err: any) => console.error('Error loading list', err),
    });
  }

  filterUpdate(event: any): void {
    const val = (event?.target?.value ?? '').toString().toLowerCase();
    const has = (s: any) => (s ?? '').toString().toLowerCase().includes(val);
    this.rows = this.tempData.filter(d => !val || has(d?.warehouseName) || has(d?.methodName));
    if (this.table) this.table.offset = 0;
  }

  openCreate(): void {
    this.router.navigate(['/Inventory/create-stockreorderplanning']);
  }

  editStockReorder(row: any): void {
    if (!row?.id) return;
    this.router.navigateByUrl(`/Inventory/edit-stockreorderplanning/${row.id}`);
  }

 openLinesModal(row: any): void {
  const id = Number(row?.id ?? row?.Id);
  if (!Number.isFinite(id) || id <= 0) return;

  this.reorderPlanningService.getReorderPreview(id).subscribe({
    next: (res: any) => {
      // handle both {isSuccess,message,data:[...]} and {data:{...}}
      const payload = Array.isArray(res?.data) ? res.data
                    : Array.isArray(res?.data?.data) ? res.data.data
                    : [];

      const list: PreviewRow[] = payload.map((x: any) => ({
        prNo: String(x?.prNo ?? ''),
        itemId: this.N(x?.itemId),
        itemCode: String(x?.itemCode ?? ''),
        itemName: String(x?.itemName ?? ''),
        requestedQty: this.N(x?.requestedQty),
        supplierId: x?.supplierId ?? null,
        warehouseId: x?.warehouseId ?? null,
        location: String(x?.location ?? '-'),
        deliveryDate: x?.deliveryDate ? String(x.deliveryDate).substring(0, 10) : '-',
        onHand: this.N(x?.onHand),
        min: this.N(x?.minQty),
        max: this.N(x?.maxQty),
        reorderQty: this.N(x?.reorderQty),
        status: this.N(x?.status)
      }));

      this.modalLines = list;          // <-- two rows will show
      this.showLinesModal = true;
    },
    error: (err) => console.error('Preview load failed', err)
  });
}

  closeLinesModal(): void { this.showLinesModal = false; }
}
