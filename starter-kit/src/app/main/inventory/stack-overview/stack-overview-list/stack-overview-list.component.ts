import { Component, OnInit, ViewEncapsulation } from '@angular/core';
import { Router } from '@angular/router';
import { NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { StackOverviewService } from '../stack-overview.service';

/** Raw row from API (per bin / per warehouse row) */
interface ApiStockRow {
  id: number;                // itemId
  sku: string;
  name: string;
  category?: string;
  uom?: string;

  warehouseId?: number;
  warehouseName?: string;
  binId?: number | null;
  binName?: string | null;

  qty?: number;
  onHand?: number;
  reserved?: number;
  available?: number;
  supplierId?: number;
  supplierName?: string;
  expiryDate?: string;       // ISO string
}

/** Location line (bin row for any warehouse) */
interface ItemLocation {
  warehouseId?: number;
  warehouseName?: string;
  binId?: number | null;
  binName?: string | null;
  supplierId?: number | null;
  supplierName?: string | null;
  onHand?: number;
  reserved?: number;
  available?: number;
  expiryDate?: string | null;
}

/** Grid row: one row per itemId (aggregated across all warehouses) */
export interface ItemWarehouseRow {
  gridKey: string;           // `${itemId}`
  id: number;                // itemId
  sku: string;
  name: string;
  category?: string;
  uom?: string;

  // totals across ALL warehouses
  totalOnHand?: number;
  totalReserved?: number;
  totalAvailable?: number;

  // all bin lines (for modal)
  locations: ItemLocation[];
}

@Component({
  selector: 'app-stack-overview-list',
  templateUrl: './stack-overview-list.component.html',
  styleUrls: ['./stack-overview-list.component.scss'],
  encapsulation: ViewEncapsulation.None,
})
export class StackOverviewListComponent implements OnInit {
  rows: ItemWarehouseRow[] = [];
  filteredRows: ItemWarehouseRow[] = [];

  selectedItem: ItemWarehouseRow | null = null;

  // paging + search
  pageSizes = [10, 25, 50, 100];
  pageSize = 10;
  searchValue = '';

  // ui state
  loading = false;
  errorMsg: string | null = null;

  constructor(
    private router: Router,
    private stockService: StackOverviewService,
    private modal: NgbModal
  ) {}

  ngOnInit(): void {
    this.loadMasterItem();
  }

  /** Stable identity for ngx-datatable */
  rowIdentity = (row: ItemWarehouseRow) => row.gridKey;

loadMasterItem(): void {
  this.loading = true;
  this.errorMsg = null;

  this.stockService.GetAllStockList().subscribe({
    next: (res: any) => {
      const raw: ApiStockRow[] = Array.isArray(res?.data) ? res.data : [];

      // Group by itemId (aggregate across warehouses)
      const map = new Map<number, ItemWarehouseRow>();

      for (const r of raw) {
        const itemId = r.id;

        if (!map.has(itemId)) {
          map.set(itemId, {
            gridKey: String(itemId),
            id: itemId,
            sku: r.sku,
            name: r.name,
            category: r.category,
            uom: r.uom,

            totalOnHand: 0,
            totalReserved: 0,
            totalAvailable: 0,

            locations: []
          });
        }

        const row = map.get(itemId)!;

        // ✅ Always use qty for onHand, and available = qty - reserved
        const totalQty = Number(r.qty) || 0;
        const reserved = Number(r.reserved) || 0;
        const onHand = totalQty;
        const available = totalQty - reserved;

        // Add to totals (all rows count here)
        row.totalOnHand += onHand;
        row.totalReserved += reserved;
        row.totalAvailable += available;

        row.locations.push({
          warehouseId: r.warehouseId,
          warehouseName: r.warehouseName,
          binId: r.binId ?? null,
          binName: r.binName ?? null,
          supplierId: r.supplierId ?? null,
          supplierName: r.supplierName ?? null,
          onHand,
          reserved,
          available,
          expiryDate: r.expiryDate ?? null
        });
      }

      // ✅ Handle reserved display per warehouse (show once)
      const finalList: ItemWarehouseRow[] = [];

      for (const item of map.values()) {
        const processed = item.locations.map(l => ({ ...l }));

        const shownWarehouse = new Set<number>();

        for (const loc of processed) {
          if (loc.warehouseId == null) continue;

          if (shownWarehouse.has(loc.warehouseId)) {
            // Hide reserved visually (don't affect totals)
            loc.reserved = null;
          } else {
            shownWarehouse.add(loc.warehouseId);
            // keep the actual reserved value for this warehouse
          }

          // ✅ Recalculate available (for display) correctly
          const baseQty = Number(loc.onHand) || 0;
          const resv = Number(loc.reserved ?? 0);
          loc.available = baseQty - resv;
        }

        finalList.push({ ...item, locations: processed });
      }

      this.rows = finalList;
      this.filteredRows = [...finalList];
      this.loading = false;
    },
    error: (err) => {
      this.loading = false;
      this.errorMsg = 'Failed to load stock list.';
      console.error('Stock list load error', err);
    }
  });
}



  /** Search across item fields + any warehouse/bin/supplier name via locations */
  applyFilter(): void {
    const q = (this.searchValue || '').toLowerCase().trim();
    if (!q) {
      this.filteredRows = [...this.rows];
      return;
    }

    this.filteredRows = this.rows.filter(r => {
      const baseHit =
        String(r.id ?? '').toLowerCase().includes(q) ||
        (r.sku ?? '').toLowerCase().includes(q) ||
        (r.name ?? '').toLowerCase().includes(q) ||
        (r.category ?? '').toLowerCase().includes(q) ||
        (r.uom ?? '').toLowerCase().includes(q);

      if (baseHit) return true;

      return r.locations?.some(loc =>
        (loc.warehouseName ?? '').toLowerCase().includes(q) ||
        (loc.binName ?? '').toLowerCase().includes(q) ||
        (loc.supplierName ?? '').toLowerCase().includes(q)
      );
    });
  }

  /** Open modal with ALL warehouses/bins for the item */
openViewModal(row: ItemWarehouseRow, tpl: any): void {
  if (!row?.locations) return;

  // Make a copy so original data stays clean
  const processed = [...row.locations.map(l => ({ ...l }))];

  // Track warehouses we already displayed reserved for
  const shownWarehouse = new Set<number>();

  for (const loc of processed) {
    if (loc.warehouseId == null) continue;

    // If this warehouse already shown once, hide reserved in subsequent rows
    if (shownWarehouse.has(loc.warehouseId)) {
      loc.reserved = null; // hide reserved
    } else {
      shownWarehouse.add(loc.warehouseId); // mark as shown
      // Keep the original reserved value (don't sum)
    }
  }

  // Assign and open modal
  this.selectedItem = { ...row, locations: processed };
  this.modal.open(tpl, { centered: true, size: 'xl', backdrop: 'static' });
}



  /** Navigate to create page */
  goToCreateItem(): void {
    this.router.navigate(['/Inventory/create-stackoverview']);
  }
}
