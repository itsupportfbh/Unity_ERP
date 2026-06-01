import { Component, OnInit, OnDestroy } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { InventoryService } from '../../inventory.service';
import { WarehouseService } from 'app/main/master/warehouse/warehouse.service';

export interface ItemDetailHeader {
  itemId: number;
  sku: string;
  name: string;
  category: string;
  uom: string;
  warehouse: string;
  onHand: number;
  reserved: number;
  available: number;
  reorderQty: number;
  status: 'In Stock' | 'Low Stock' | 'Zero Stock';
}

export interface StockTransaction {
  txnDate: string;
  sourceType: string;
  referenceNo: string;
  qtyIn: number;
  qtyOut: number;
  adjustment: number;
  qtyBefore: number;
  qtyAfter: number;
  unitCost: number;
  totalCost: number;
  reason: string;
  createdBy: string;
  warehouseId?: number;
  warehouseName?: string;
  binId?: number;
  binName?: string;
}

@Component({
  selector: 'app-stock-history-details',
  templateUrl: './stock-history-details.component.html',
  styleUrls: ['./stock-history-details.component.scss']
})
export class StockHistoryDetailsComponent implements OnInit, OnDestroy {

  itemId = 0;
  itemSku = '';

  itemDetail: ItemDetailHeader | null = null;
  allTransactions: StockTransaction[] = [];
  pagedHistory: StockTransaction[] = [];

  warehouses: any[] = [];

  totalIn = 0;
  totalOut = 0;
  totalAdj = 0;
  totalTransactions = 0;

  currentPage = 1;
  pageSize = 10;
  totalPages = 1;
  pageStart = 0;
  pageEnd = 0;
  visiblePages: (number | string)[] = [];

  filters = {
    warehouseId: null as number | null,
    txnType: null as string | null,
    fromDate: '',
    toDate: ''
  };

  txnTypes = [
    { label: 'GRN', value: 'GRN' },
    { label: 'Transfer In', value: 'Transfer In' },
    { label: 'Transfer Out', value: 'Transfer Out' },
    { label: 'Stock Take', value: 'Stock Take' }
  ];

  loading = false;

  private destroy$ = new Subject<void>();

  get avatarLetters(): string {
    if (!this.itemDetail?.name) return 'IT';

    return this.itemDetail.name
      .split(' ')
      .slice(0, 2)
      .map(x => x[0])
      .join('')
      .toUpperCase();
  }

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private inventoryService: InventoryService,
    private warehouseService: WarehouseService
  ) {}

  ngOnInit(): void {
    this.loadWarehouses();

    this.route.queryParams
      .pipe(takeUntil(this.destroy$))
      .subscribe(params => {
        this.itemId = +params['itemId'] || 0;
        this.itemSku = params['sku'] || '';

        const warehouseId = params['warehouseId'] ? +params['warehouseId'] : null;
        if (warehouseId) {
          this.filters.warehouseId = warehouseId;
        }

        if (this.itemId > 0) {
          this.loadData();
        }
      });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  loadWarehouses(): void {
    this.warehouseService.getWarehouse()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (res: any) => {
          this.warehouses = res?.data || res || [];
        },
        error: (err) => {
          console.error('Warehouse load error:', err);
          this.warehouses = [];
        }
      });
  }

  loadData(): void {
    this.loading = true;

    const req = {
      itemId: this.itemId,
      warehouseId: this.filters.warehouseId,
      txnType: this.filters.txnType,
      fromDate: this.filters.fromDate || null,
      toDate: this.filters.toDate || null
    };

    this.inventoryService.getStockHistoryDetail(req)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (res: any) => {
          const data = res?.data || [];

          this.allTransactions = data.map((x: any) => ({
            txnDate: x.movementDate,
            sourceType: x.sourceType,
            referenceNo: x.sourceNo,
            qtyIn: Number(x.inQty || 0),
            qtyOut: Number(x.outQty || 0),
            adjustment: Number(x.netQty || 0),
            qtyBefore: Number(x.beforeQty || 0),
            qtyAfter: Number(x.afterQty || 0),
            unitCost: Number(x.unitCost || 0),
            totalCost: Number(x.totalCost || 0),
            reason: x.remarks || '',
            createdBy: x.createdBy || '',
            warehouseId: Number(x.warehouseId || 0),
            warehouseName: x.warehouseName || '',
            binId: Number(x.binId || 0),
            binName: x.binName || ''
          }));

          this.totalTransactions = this.allTransactions.length;
          this.calcSummary(this.allTransactions);
          this.buildHeader(data);
          this.currentPage = 1;
          this.applyPaging();

          this.loading = false;
        },
        error: (err) => {
          console.error('Stock detail error:', err);

          this.itemDetail = null;
          this.allTransactions = [];
          this.pagedHistory = [];
          this.totalTransactions = 0;
          this.calcSummary([]);
          this.applyPaging();

          this.loading = false;
        }
      });
  }

  private buildHeader(data: any[]): void {
    const first = data?.[0];

    const selectedWarehouse = this.warehouses.find(
      x => Number(x.id || x.Id) === Number(this.filters.warehouseId)
    );

    const onHand = this.getDisplayOnHand();

    const available = onHand;

    this.itemDetail = {
      itemId: this.itemId,
      sku: first?.sku || this.itemSku,
      name: first?.itemName || '-',
      category: '-',
      uom: '-',
      warehouse: this.filters.warehouseId
        ? (selectedWarehouse?.name || selectedWarehouse?.Name || first?.warehouseName || '-')
        : 'All Warehouses',
      onHand: onHand,
      reserved: 0,
      available: available,
      reorderQty: 0,
      status: available <= 0 ? 'Zero Stock' : 'In Stock'
    };
  }

  private getDisplayOnHand(): number {
    if (!this.allTransactions.length) return 0;

    if (this.filters.warehouseId) {
      return Number(this.allTransactions[0]?.qtyAfter || 0);
    }

    const latestByWarehouse = new Map<number, StockTransaction>();

    this.allTransactions.forEach(row => {
      const whId = Number(row.warehouseId || 0);
      if (!whId) return;

      if (!latestByWarehouse.has(whId)) {
        latestByWarehouse.set(whId, row);
      }
    });

    let total = 0;
    latestByWarehouse.forEach(row => {
      total += Number(row.qtyAfter || 0);
    });

    return total;
  }

  private calcSummary(txns: StockTransaction[]): void {
    this.totalIn = txns.reduce((s, x) => s + Number(x.qtyIn || 0), 0);
    this.totalOut = txns.reduce((s, x) => s + Number(x.qtyOut || 0), 0);

    this.totalAdj = txns
      .filter(x => x.sourceType === 'Stock Take')
      .reduce((s, x) => s + Number(x.adjustment || 0), 0);
  }

  private applyPaging(): void {
    this.totalPages = Math.ceil(this.totalTransactions / Number(this.pageSize)) || 1;

    if (this.currentPage > this.totalPages) {
      this.currentPage = 1;
    }

    const start = (this.currentPage - 1) * Number(this.pageSize);
    this.pagedHistory = this.allTransactions.slice(start, start + Number(this.pageSize));

    this.updatePageMeta();
    this.buildVisiblePages();
  }

  goToPage(page: number): void {
    if (page < 1 || page > this.totalPages) return;

    this.currentPage = page;
    this.applyPaging();
  }

  onPageSizeChange(): void {
    this.currentPage = 1;
    this.applyPaging();
  }

  private updatePageMeta(): void {
    this.pageStart = this.totalTransactions === 0
      ? 0
      : (this.currentPage - 1) * Number(this.pageSize) + 1;

    this.pageEnd = Math.min(this.currentPage * Number(this.pageSize), this.totalTransactions);
  }

  buildVisiblePages(): void {
    const pages: (number | string)[] = [];
    const total = this.totalPages;
    const cur = this.currentPage;

    if (total <= 7) {
      for (let i = 1; i <= total; i++) pages.push(i);
    } else {
      pages.push(1);

      if (cur > 3) pages.push('...');

      for (let i = Math.max(2, cur - 1); i <= Math.min(total - 1, cur + 1); i++) {
        pages.push(i);
      }

      if (cur < total - 2) pages.push('...');

      pages.push(total);
    }

    this.visiblePages = pages;
  }

  applyFilters(): void {
    this.currentPage = 1;
    this.loadData();
  }

  clearFilters(): void {
    this.filters = {
      warehouseId: null,
      txnType: null,
      fromDate: '',
      toDate: ''
    };

    this.currentPage = 1;
    this.loadData();
  }

  goBack(): void {
    this.router.navigate(['/Inventory/list-stock-history']);
  }

  exportExcel(): void {
    console.log('Export stock history detail', this.allTransactions);
  }

  printPage(): void {
    window.print();
  }
}