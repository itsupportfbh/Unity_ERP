import { Component, OnInit, ViewEncapsulation } from '@angular/core';
import Swal from 'sweetalert2';
import { WarehouseService } from 'app/main/master/warehouse/warehouse.service';
import { StackOverviewService } from '../../stack-overview/stack-overview.service';

type TransferStatus = 'IN_TRANSIT' | 'PARTIAL_RECEIVED' | 'RECEIVED' | 'CANCELLED';

interface WarehouseOption { id: number; name: string; }

interface TransferDetailDto {
  stockId: number;
  itemId: number;
  itemName: string;
  sku: string;

  fromWarehouseId: number;
  toWarehouseId: number;

  fromWarehouseName: string;
  toWarehouseName: string;

  binId: number;
  toBinId: number;

  binName: string;
  toBinName: string;

  onHand: number;
  available: number;

  mrId: number;
  reqNo: string;

  supplierId: number;
  supplierName: string;

  requestQty: number;

  status?: number;
  transferQty?: number;     // may be negative
  remarks?: string;
  transferNo: string;

  // ✅ API might send any of these:
  receivedQty?: number;
  ReceivedQty?: number;
  receiveQty?: number;
  ReceiveQty?: number;
  qtyReceived?: number;
  QtyReceived?: number;
}

interface TransferRow {
  gridKey: string;

  stockId: number;
  itemId: number;
  transferNo: string;

  sku: string;
  name: string;

  fromWarehouseId: number;
  toWarehouseId: number;

  fromWarehouseName: string;
  toWarehouseName: string;

  binId: number;
  toBinId: number;

  binName: string;
  toBinName: string;

  requestQty: number;
  plannedQty: number;
  receivedQty: number;
  remainingQty: number;

  status: TransferStatus;
  statusLabel: string;

  mrId: number;
  reqNo: string;

  supplierId: number;
  supplierName: string;

  onHand: number;
  available: number;

  remarks?: string;
}

interface ReceiveFormModel {
  stockId: number;
  itemId: number;
  transferNo: string;

  sku: string;
  name: string;

  fromWarehouseId: number;
  toWarehouseId: number;

  fromWarehouseName: string;
  toWarehouseName: string;

  binId: number;
  toBinId: number;

  binName: string;
  toBinName: string;

  requestedQty: number;
  alreadyReceivedQty: number;
  remainingQty: number;

  plannedQty: number;
  receiveQty: number;
  variance: number;

  mrId: number;
  reqNo: string;

  supplierId: number;
  supplierName: string;

  status: TransferStatus;
  statusLabel: string;

  remarks: string;
}

@Component({
  selector: 'app-list-stock-transfer-receipt',
  templateUrl: './list-stock-transfer-receipt.component.html',
  styleUrls: ['./list-stock-transfer-receipt.component.scss'],
  encapsulation: ViewEncapsulation.None
})
export class ListStockTransferReceiptComponent implements OnInit {

  toOutletOptions: WarehouseOption[] = [];
  selectedToOutletId: number | null = 0; // 0 = all
  searchValue = '';

  rows: TransferRow[] = [];
  filteredRows: TransferRow[] = [];

  showReceiveModal = false;
  receiveForm: ReceiveFormModel | null = null;

  isLoading = false;

  constructor(
    private warehouseService: WarehouseService,
    private stockService: StackOverviewService
  ) {}

  ngOnInit(): void {
    this.loadWarehouse();
  }

  get selectedOutletName(): string {
    if (this.selectedToOutletId === 0) return 'All Outlets';
    if (!this.selectedToOutletId) return '—';
    return this.toOutletOptions.find(x => x.id === this.selectedToOutletId)?.name || '—';
  }

  // ✅ Pending = InTransit + Partial
  get pendingCount(): number {
    return this.filteredRows.filter(x => x.status === 'IN_TRANSIT' || x.status === 'PARTIAL_RECEIVED').length;
  }

  rowIdentity = (row: TransferRow) => row.gridKey;

  // ==========================================================
  // ✅ ReceivedQty Picker (handles different API key names)
  // ==========================================================
  private pickReceivedQty(d: any): number {
    const v =
      d?.receivedQty ?? d?.ReceivedQty ??
      d?.receiveQty  ?? d?.ReceiveQty ??
      d?.qtyReceived ?? d?.QtyReceived ??
      d?.received_qty ?? d?.receivedqty;

    const n = Number(v);
    return Number.isFinite(n) ? n : 0;
  }

  // ==========================================================
  // ✅ STATUS BY QTY LOGIC (Requested vs Received)
  // ==========================================================
  private deriveStatusByQty(requestedQty: number, receivedQty: number): TransferStatus {
    const req = Number(requestedQty || 0);
    const rec = Number(receivedQty || 0);

    if (req <= 0) return 'CANCELLED';
    if (rec <= 0) return 'IN_TRANSIT';
    if (rec < req) return 'PARTIAL_RECEIVED';
    return 'RECEIVED';
  }

  private statusLabel(s: TransferStatus): string {
    if (s === 'IN_TRANSIT') return 'In Transit';
    if (s === 'PARTIAL_RECEIVED') return 'Partially Received';
    if (s === 'RECEIVED') return 'Received';
    return 'Cancelled';
  }

  statusIcon(s: TransferStatus): string {
    if (s === 'IN_TRANSIT') return 'fa-truck';
    if (s === 'PARTIAL_RECEIVED') return 'fa-box-open';
    if (s === 'RECEIVED') return 'fa-check';
    return 'fa-ban';
  }

  // ==========================================================
  // LOAD OUTLETS
  // ==========================================================
  loadWarehouse(): void {
    this.warehouseService.getWarehouse().subscribe({
      next: (res: any) => {
        const raw = res?.data ?? [];
        const list: WarehouseOption[] = raw.map((x: any) => ({
          id: Number(x.id ?? x.warehouseId ?? x.WarehouseId),
          name: String(x.name ?? x.warehouseName ?? x.WarehouseName)
        }));

        this.toOutletOptions = [{ id: 0, name: 'All Outlets' }, ...list];
        if (this.selectedToOutletId === null || this.selectedToOutletId === undefined) {
          this.selectedToOutletId = 0;
        }
        this.onToOutletChange();
      },
      error: () => {
        this.toOutletOptions = [{ id: 0, name: 'All Outlets' }];
        this.selectedToOutletId = 0;
        this.onToOutletChange();
      }
    });
  }

  // ==========================================================
  // LOAD TRANSFERS
  // ==========================================================
  onToOutletChange(): void {
    if (this.selectedToOutletId === null || this.selectedToOutletId === undefined) {
      this.rows = [];
      this.applyFilter();
      return;
    }

    this.isLoading = true;

    this.stockService.gettransferdetailsbyid(this.selectedToOutletId).subscribe({
      next: (res: any) => {
        const list: TransferDetailDto[] = res?.data ?? [];

        this.rows = list.map((d, idx) => {
          const requested = Number(d.requestQty ?? 0);

          // ✅ planned qty prefer abs(transferQty), else fallback requested
          const planned = Math.abs(Number(d.transferQty ?? 0)) || requested;

          // ✅ pick received qty from API (supports multiple key names)
          let received = this.pickReceivedQty(d);

          // ✅ OPTIONAL FALLBACK:
          // If API doesn't send received qty but you store it in transferQty negative for received,
          // use abs(transferQty) ONLY when status says received and received is 0.
          // Remove this block if not applicable to your backend.
          const backendStatus = Number(d.status ?? 0);
          if (received === 0 && backendStatus === 3) {
            received = Math.abs(Number(d.transferQty ?? 0));
          }

          // ✅ derive status by requested vs received (your requested logic)
          const st = this.deriveStatusByQty(requested, received);

          const remaining = Math.max(0, requested - received);

          return {
            gridKey: `${d.transferNo || 'TR'}-${d.stockId}-${idx}`,

            stockId: Number(d.stockId),
            itemId: Number(d.itemId),
            transferNo: String(d.transferNo ?? ''),

            sku: String(d.sku ?? ''),
            name: String(d.itemName ?? ''),

            fromWarehouseId: Number(d.fromWarehouseId),
            toWarehouseId: Number(d.toWarehouseId),

            fromWarehouseName: String(d.fromWarehouseName ?? ''),
            toWarehouseName: String(d.toWarehouseName ?? ''),

            binId: Number(d.binId),
            toBinId: Number(d.toBinId),

            binName: String(d.binName ?? ''),
            toBinName: String(d.toBinName ?? ''),

            requestQty: requested,
            plannedQty: planned,
            receivedQty: received,
            remainingQty: remaining,

            status: st,
            statusLabel: this.statusLabel(st),

            mrId: Number(d.mrId ?? 0),
            reqNo: String(d.reqNo ?? ''),

            supplierId: Number(d.supplierId ?? 0),
            supplierName: String(d.supplierName ?? ''),

            onHand: Number(d.onHand ?? 0),
            available: Number(d.available ?? 0),

            remarks: d.remarks ?? ''
          };
        });

        this.applyFilter();
        this.isLoading = false;
      },
      error: () => {
        this.rows = [];
        this.applyFilter();
        this.isLoading = false;
      }
    });
  }

  // ==========================================================
  // FILTER
  // ==========================================================
  applyFilter(): void {
    const q = (this.searchValue || '').trim().toLowerCase();

    this.filteredRows = this.rows.filter(r => {
      if (r.status === 'CANCELLED') return false;

      if (!q) return true;

      const hay = [
        r.transferNo,
        r.sku,
        r.name,
        r.fromWarehouseName,
        r.toWarehouseName,
        r.reqNo,
        r.supplierName,
        r.binName,
        r.toBinName,
        r.remarks ?? '',
        r.statusLabel
      ].join(' ').toLowerCase();

      return hay.includes(q);
    });
  }

  // ==========================================================
  // MODAL
  // ==========================================================
  // ✅ open modal for IN_TRANSIT or PARTIAL (not for RECEIVED)
  openReceiveModal(row: TransferRow): void {
    if (row.status === 'RECEIVED' || row.status === 'CANCELLED') return;

    const remaining = Math.max(0, row.requestQty - row.receivedQty);

    this.receiveForm = {
      stockId: row.stockId,
      itemId: row.itemId,
      transferNo: row.transferNo,

      sku: row.sku,
      name: row.name,

      fromWarehouseId: row.fromWarehouseId,
      toWarehouseId: row.toWarehouseId,

      fromWarehouseName: row.fromWarehouseName,
      toWarehouseName: row.toWarehouseName,

      binId: row.binId,
      toBinId: row.toBinId,

      binName: row.binName,
      toBinName: row.toBinName,

      requestedQty: row.requestQty,
      alreadyReceivedQty: row.receivedQty,
      remainingQty: remaining,

      plannedQty: row.plannedQty,
      receiveQty: 0,
      variance: 0 - remaining,

      mrId: row.mrId,
      reqNo: row.reqNo,

      supplierId: row.supplierId,
      supplierName: row.supplierName,

      status: row.status,
      statusLabel: row.statusLabel,

      remarks: ''
    };

    this.showReceiveModal = true;
  }

  closeReceiveModal(): void {
    this.showReceiveModal = false;
    this.receiveForm = null;
  }

  recalcVariance(): void {
    if (!this.receiveForm) return;
    const rem = Number(this.receiveForm.remainingQty || 0);
    const recv = Number(this.receiveForm.receiveQty || 0);
    this.receiveForm.variance = recv - rem;
  }

  // ✅ confirm only if receiveQty <= remaining
  canConfirmReceive(): boolean {
    if (!this.receiveForm) return false;

    const recv = Number(this.receiveForm.receiveQty ?? 0);
    const rem = Number(this.receiveForm.remainingQty ?? 0);

    if (recv <= 0) return false;
    if (recv > rem) return false;
    return true;
  }

  async confirmReceive(): Promise<void> {
    if (!this.receiveForm) return;
    const f = this.receiveForm;

    const ok = await Swal.fire({
      title: 'Confirm Receive?',
      html: `
        <div style="text-align:left">
          <div><b>Transfer No:</b> ${f.transferNo}</div>
          <div><b>SKU:</b> ${f.sku}</div>
          <div><b>Requested:</b> ${f.requestedQty}</div>
          <div><b>Already Received:</b> ${f.alreadyReceivedQty}</div>
          <div><b>Remaining:</b> ${f.remainingQty}</div>
          <hr/>
          <div><b>Receive Now:</b> ${f.receiveQty}</div>
          <div><b>Variance:</b> ${f.variance}</div>
        </div>
      `,
      icon: 'question',
      showCancelButton: true,
      confirmButtonText: 'Yes, Receive',
      cancelButtonText: 'Cancel'
    });

    if (!ok.isConfirmed) return;

    const payload = {
      stockId: f.stockId,
      itemId: f.itemId,

      fromWarehouseId: f.fromWarehouseId,
      toWarehouseId: f.toWarehouseId,
      toBinId: f.toBinId,

      supplierId: f.supplierId,

      mrId: f.mrId,
      reqNo: f.reqNo,

      receivedQty: Number(f.receiveQty || 0),
      transferNo: f.transferNo,

      remarks: String(f.remarks || ''),
      userId: 1
    };

    this.isLoading = true;

    this.stockService.confirmReceive(payload).subscribe({
      next: () => {
        this.closeReceiveModal();
        this.onToOutletChange();
        Swal.fire({ icon: 'success', title: 'Received', text: 'Transfer received successfully.' });
      },
      error: (err) => {
        this.isLoading = false;
        Swal.fire({ icon: 'error', title: 'Failed', text: err?.error?.message || 'Receive confirm failed.' });
      }
    });
  }
}
