import { Component, OnInit, OnDestroy } from '@angular/core';
import { Router } from '@angular/router';
import { Subject } from 'rxjs';
import { debounceTime, distinctUntilChanged, takeUntil } from 'rxjs/operators';
import * as XLSX from 'xlsx';

import { InventoryService } from '../../inventory.service';

export interface StockOverviewItem {
  itemId: number;
  sku: string;
  name: string;
  category: string;
  categoryId?: number | null;
  warehouse: string;
  warehouseId: number;
  onHand: number;
  reserved: number;
  available: number;
  minQty: number;
  maxQty: number;
  reorderQty: number;
  lastMovement: string | null;
  lastTxnType: string | null;
  status: 'In Stock' | 'Low Stock' | 'Zero Stock';
  companyId: number;
}

@Component({
  selector: 'app-stock-history-list',
  templateUrl: './stock-history-list.component.html',
  styleUrls: ['./stock-history-list.component.scss']
})
export class StockHistoryListComponent implements OnInit, OnDestroy {

  allItems: StockOverviewItem[] = [];
  pagedItems: StockOverviewItem[] = [];

  totalItems = 0;
  inStockCount = 0;
  lowStockCount = 0;
  zeroStockCount = 0;

  currentPage = 1;
  pageSize = 10;
  totalPages = 1;
  pageStart = 0;
  pageEnd = 0;
  visiblePages: (number | string)[] = [];

  sortColumn = 'name';
  sortDirection: 'asc' | 'desc' = 'asc';

  filters = {
    search: '',
    warehouseId: null as number | null,
    status: null as string | null,
    categoryId: null as number | null
  };

  warehouses: { id: number; name: string }[] = [];
  categories: { id: number; name: string }[] = [];

  stockStatuses = [
    { label: 'In Stock', value: 'In Stock' },
    { label: 'Low Stock', value: 'Low Stock' },
    { label: 'Zero Stock', value: 'Zero Stock' }
  ];

  loading = false;
  showExportModal = false;

  private searchSubject = new Subject<string>();
  private destroy$ = new Subject<void>();

  constructor(
    private router: Router,
    private inventoryService: InventoryService
  ) {}

  ngOnInit(): void {
    this.setupSearchDebounce();
    this.loadData();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private setupSearchDebounce(): void {
    this.searchSubject
      .pipe(
        debounceTime(400),
        distinctUntilChanged(),
        takeUntil(this.destroy$)
      )
      .subscribe(() => {
        this.currentPage = 1;
        this.loadData();
      });
  }

  loadData(): void {
    this.loading = true;

    this.inventoryService.getStockHistoryList(this.filters)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (res) => {
          const data: StockOverviewItem[] = res?.data || [];

          this.allItems = this.sortItems(data);
          this.totalItems = this.allItems.length;

          this.updateSummary(this.allItems);
          this.buildFilterDropdowns(this.allItems);
          this.applyClientPaging();

          this.loading = false;

          setTimeout(() => {
            if ((window as any).feather) {
              (window as any).feather.replace();
            }
          }, 0);
        },
        error: (err) => {
          console.error('Stock history list error:', err);

          this.allItems = [];
          this.pagedItems = [];
          this.totalItems = 0;
          this.currentPage = 1;
          this.totalPages = 1;

          this.updateSummary([]);
          this.updatePageMeta();
          this.buildVisiblePages();

          this.loading = false;
        }
      });
  }

  private sortItems(items: StockOverviewItem[]): StockOverviewItem[] {
    return [...items].sort((a: any, b: any) => {
      const av = a[this.sortColumn];
      const bv = b[this.sortColumn];

      let cmp = 0;

      if (typeof av === 'number' || typeof bv === 'number') {
        cmp = Number(av || 0) - Number(bv || 0);
      } else {
        cmp = String(av || '').localeCompare(String(bv || ''));
      }

      return this.sortDirection === 'asc' ? cmp : -cmp;
    });
  }

  private applyClientPaging(): void {
    this.totalItems = this.allItems.length;
    this.totalPages = Math.ceil(this.totalItems / Number(this.pageSize)) || 1;

    if (this.currentPage > this.totalPages) {
      this.currentPage = 1;
    }

    const start = (this.currentPage - 1) * Number(this.pageSize);
    this.pagedItems = this.allItems.slice(start, start + Number(this.pageSize));

    this.updatePageMeta();
    this.buildVisiblePages();

    setTimeout(() => {
      if ((window as any).feather) {
        (window as any).feather.replace();
      }
    }, 0);
  }

  private updateSummary(items: StockOverviewItem[]): void {
    this.inStockCount = items.filter(x => x.status === 'In Stock').length;
    this.lowStockCount = items.filter(x => x.status === 'Low Stock').length;
    this.zeroStockCount = items.filter(x => x.status === 'Zero Stock').length;
  }

  private buildFilterDropdowns(items: StockOverviewItem[]): void {
    this.warehouses = Array.from(
      new Map(
        items
          .filter(x => x.warehouseId && x.warehouse)
          .map(x => [
            x.warehouseId,
            {
              id: x.warehouseId,
              name: x.warehouse
            }
          ])
      ).values()
    );

    this.categories = Array.from(
      new Map(
        items
          .filter(x => x.category)
          .map(x => [
            x.categoryId || x.category,
            {
              id: x.categoryId || 0,
              name: x.category
            }
          ])
      ).values()
    ).filter(x => x.id !== 0);
  }

  private updatePageMeta(): void {
    this.pageStart = this.totalItems === 0
      ? 0
      : (this.currentPage - 1) * Number(this.pageSize) + 1;

    this.pageEnd = Math.min(
      this.currentPage * Number(this.pageSize),
      this.totalItems
    );
  }

  goToPage(page: number): void {
    if (page < 1 || page > this.totalPages) {
      return;
    }

    this.currentPage = page;
    this.applyClientPaging();
  }

  onPageSizeChange(): void {
    this.currentPage = 1;
    this.applyClientPaging();
  }

  buildVisiblePages(): void {
    const pages: (number | string)[] = [];
    const total = this.totalPages;
    const cur = this.currentPage;

    if (total <= 7) {
      for (let i = 1; i <= total; i++) {
        pages.push(i);
      }
    } else {
      pages.push(1);

      if (cur > 3) {
        pages.push('...');
      }

      for (
        let i = Math.max(2, cur - 1);
        i <= Math.min(total - 1, cur + 1);
        i++
      ) {
        pages.push(i);
      }

      if (cur < total - 2) {
        pages.push('...');
      }

      pages.push(total);
    }

    this.visiblePages = pages;
  }

  onSearchChange(): void {
    this.searchSubject.next(this.filters.search);
  }

  onFilterChange(): void {
    this.currentPage = 1;
    this.loadData();
  }

  applyFilters(): void {
    this.currentPage = 1;
    this.loadData();
  }

  clearFilters(): void {
    this.filters = {
      search: '',
      warehouseId: null,
      status: null,
      categoryId: null
    };

    this.currentPage = 1;
    this.loadData();
  }

  sortBy(column: string): void {
    this.sortDirection = this.sortColumn === column
      ? this.sortDirection === 'asc' ? 'desc' : 'asc'
      : 'asc';

    this.sortColumn = column;
    this.allItems = this.sortItems(this.allItems);
    this.applyClientPaging();
  }

  viewDetails(item: StockOverviewItem): void {
    this.router.navigate(['/Inventory/details-stock-history'], {
      queryParams: {
        itemId: item.itemId,
        sku: item.sku
      }
    });
  }

  // ───────────────── Export Modal ─────────────────

  openExportModal(): void {
    if (!this.allItems || this.allItems.length === 0) {
      alert('No data available to export');
      return;
    }

    this.showExportModal = true;

    setTimeout(() => {
      if ((window as any).feather) {
        (window as any).feather.replace();
      }
    }, 0);
  }

  closeExportModal(): void {
    this.showExportModal = false;
  }

  exportExcel(): void {
    this.openExportModal();
  }

  private formatDate(value: string | null): string {
    if (!value) {
      return '';
    }

    const d = new Date(value);

    if (isNaN(d.getTime())) {
      return '';
    }

    const dd = String(d.getDate()).padStart(2, '0');
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const yyyy = d.getFullYear();

    return `${dd}-${mm}-${yyyy}`;
  }

  private getExportRows(): any[] {
    return this.allItems.map((x, index) => ({
      'S.No': index + 1,
      'SKU': x.sku || '',
      'Item Name': x.name || '',
      'Category': x.category || '',
      'Total On Hand': Number(x.onHand || 0),
      'Reserved': Number(x.reserved || 0),
      'Available': Number(x.available || 0),
      'Min Qty': Number(x.minQty || 0),
      'Max Qty': Number(x.maxQty || 0),
      'Reorder Qty': Number(x.reorderQty || 0),
      'Status': x.status || '',
    }));
  }

  exportToExcel(): void {
    const rows = this.getExportRows();

    if (!rows.length) {
      alert('No data available to export');
      return;
    }

    const worksheet = XLSX.utils.json_to_sheet(rows);

    worksheet['!cols'] = [
      { wch: 8 },
      { wch: 18 },
      { wch: 38 },
      { wch: 22 },
      { wch: 16 },
      { wch: 14 },
      { wch: 14 },
      { wch: 12 },
      { wch: 12 },
      { wch: 14 },
      { wch: 14 },
      { wch: 16 },
      { wch: 16 }
    ];

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Stock History');

    const today = new Date().toISOString().slice(0, 10);
    XLSX.writeFile(workbook, `Stock_History_${today}.xlsx`);

    this.closeExportModal();
  }

  exportToPdf(): void {
    const rows = this.getExportRows();

    if (!rows.length) {
      alert('No data available to export');
      return;
    }

    const today = this.formatDate(new Date().toISOString());

    const tableRows = rows.map(x => `
      <tr>
        <td>${this.escapeHtml(x['S.No'])}</td>
        <td>${this.escapeHtml(x['SKU'])}</td>
        <td>${this.escapeHtml(x['Item Name'])}</td>
        <td>${this.escapeHtml(x['Category'])}</td>
        <td class="num">${this.escapeHtml(x['Total On Hand'])}</td>
        <td class="num">${this.escapeHtml(x['Reserved'])}</td>
        <td class="num">${this.escapeHtml(x['Available'])}</td>
        <td>${this.escapeHtml(x['Status'])}</td>
      
      </tr>
    `).join('');

    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>Stock History</title>
          <style>
            * {
              box-sizing: border-box;
            }

            body {
              font-family: Arial, Helvetica, sans-serif;
              margin: 18px;
              color: #111827;
              background: #fff;
            }

            .report-head {
              display: flex;
              justify-content: space-between;
              align-items: flex-start;
              border-bottom: 2px solid #2f6678;
              padding-bottom: 10px;
              margin-bottom: 12px;
            }

            .report-head h2 {
              margin: 0;
              color: #2f6678;
              font-size: 21px;
              font-weight: 800;
            }

            .report-head p {
              margin: 4px 0 0;
              color: #6b7280;
              font-size: 12px;
            }

            .report-meta {
              text-align: right;
              font-size: 12px;
              color: #374151;
            }

            .summary {
              display: grid;
              grid-template-columns: repeat(4, 1fr);
              gap: 8px;
              margin: 12px 0 14px;
            }

            .summary-box {
              border: 1px solid #e5e7eb;
              border-radius: 8px;
              padding: 8px 10px;
              background: #f9fafb;
            }

            .summary-box span {
              display: block;
              font-size: 10px;
              color: #6b7280;
              text-transform: uppercase;
              letter-spacing: .04em;
              margin-bottom: 4px;
            }

            .summary-box b {
              display: block;
              font-size: 18px;
              color: #111827;
            }

            table {
              width: 100%;
              border-collapse: collapse;
              table-layout: fixed;
              font-size: 10px;
            }

            thead {
              display: table-header-group;
            }

            th {
              background: #2f6678;
              color: #fff;
              padding: 7px 6px;
              text-align: left;
              font-weight: 700;
              border: 1px solid #2f6678;
            }

            td {
              border: 1px solid #e5e7eb;
              padding: 6px;
              vertical-align: top;
              word-break: break-word;
            }

            tbody tr:nth-child(even) {
              background: #f9fafb;
            }

            .num {
              text-align: right;
            }

            .footer-note {
              margin-top: 12px;
              font-size: 10px;
              color: #6b7280;
              text-align: right;
            }

            @media print {
              @page {
                size: A4 landscape;
                margin: 10mm;
              }

              body {
                margin: 0;
              }
            }
          </style>
        </head>

        <body>

          <div class="report-head">
            <div>
              <h2>Stock History</h2>
              <p>Inventory stock balance and last movement details</p>
            </div>

            <div class="report-meta">
              <div><b>Date:</b> ${today}</div>
              <div><b>Total Records:</b> ${this.totalItems}</div>
            </div>
          </div>

          <div class="summary">
            <div class="summary-box">
              <span>Total Items</span>
              <b>${this.totalItems}</b>
            </div>

            <div class="summary-box">
              <span>In Stock</span>
              <b>${this.inStockCount}</b>
            </div>

            <div class="summary-box">
              <span>Low Stock</span>
              <b>${this.lowStockCount}</b>
            </div>

            <div class="summary-box">
              <span>Zero Stock</span>
              <b>${this.zeroStockCount}</b>
            </div>
          </div>

          <table>
            <thead>
              <tr>
                <th style="width: 45px;">S.No</th>
                <th style="width: 90px;">SKU</th>
                <th style="width: 220px;">Item</th>
                <th style="width: 120px;">Category</th>
                <th style="width: 85px;">On Hand</th>
                <th style="width: 75px;">Reserved</th>
                <th style="width: 75px;">Available</th>
                <th style="width: 85px;">Status</th>
                <th style="width: 90px;">Movement</th>
                <th style="width: 90px;">Txn</th>
              </tr>
            </thead>

            <tbody>
              ${tableRows}
            </tbody>
          </table>

          <div class="footer-note">
            Generated from ERP Stock History
          </div>

          <script>
            window.onload = function () {
              setTimeout(function () {
                window.print();
              }, 300);
            };
          </script>

        </body>
      </html>
    `;

    const printWindow = window.open('', '_blank', 'width=1200,height=800');

    if (!printWindow) {
      alert('Popup blocked. Please allow popup for PDF export.');
      return;
    }

    printWindow.document.open();
    printWindow.document.write(html);
    printWindow.document.close();

    this.closeExportModal();
  }

  private escapeHtml(value: any): string {
    return String(value ?? '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }
}