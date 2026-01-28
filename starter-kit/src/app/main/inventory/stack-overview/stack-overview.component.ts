import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import Swal from 'sweetalert2';

import { WarehouseService } from 'app/main/master/warehouse/warehouse.service';
import { StackOverviewService } from './stack-overview.service';
import { MaterialRequisitionService } from '../material-requisation/material-requisition.service';

/* ===================== STOCK API Interfaces ===================== */
interface ApiItemRow {
  id?: number | string;

  sku?: string;
  Sku?: string;
  itemCode?: string;
  ItemCode?: string;

  name?: string;
  itemName?: string;
  ItemName?: string;

  warehouseName?: string;
  WarehouseName?: string;

  binName?: string;
  BinName?: string;

  onHand?: number;
  OnHand?: number;

  reserved?: number;
  Reserved?: number;

  available?: number;
  Available?: number;

  warehouseId?: number;
  WarehouseId?: number;

  binId?: number;
  BinId?: number;

  supplierId?: number | null;
  SupplierId?: number | null;

  supplierName?: string | null;
  SupplierName?: string | null;

  itemId?: number | string;
  ItemId?: number | string;
}

/* ===================== UI Stock Row ===================== */
interface StockRow {
  idKey: string;
  warehouse: string;
  bin: string;
  onHand: number;
  available: number;
  sku: string | null;
  item: string;
  supplierId?: number | null;
  supplierName: string;
  warehouseId?: number;
  binId?: number;
  itemId?: number;
  apiRow?: ApiItemRow;
}

/* ===================== MR Interfaces ===================== */
interface MrLine {
  id?: number;
  materialReqId?: number;
  itemId?: number;
  itemCode?: string;     // SKU
  itemName?: string;
  uomId?: number;
  uomName?: string;
  qty?: number;          // OLD Requested
  receivedQty?: number;  // Received
}

type MrLineStatus = 'READY' | 'PARTIAL' | 'SHORT';

interface MrLineVM {
  itemId: number;
  sku: string;
  itemName: string;
  uomName: string;

  oldRequestedQty: number;
  requestedQty: number;  // NEW requested = old - received
  receivedQty: number;
  remainingQty: number;

  // ✅ NEW for shortage handling
  availQty: number;         // total available in selected From outlet (MR sku)
  maxTransferQty: number;   // min(remaining, availQty)
  transferQty: number;      // user editable
  shortageQty: number;      // remaining - avail (if positive)
  status: MrLineStatus;     // READY / PARTIAL / SHORT
}

interface MrListItem {
  id: number;
  mrqNo: string;
  outletId: number | null;
  display: string;
  isCompleted?: boolean;
  remainingQty?: number;
}

interface FromOutletOption {
  id: number;
  name: string;
  label: string;
  reqQty: number;
  onHand: number;
}

@Component({
  selector: 'app-stack-overview',
  templateUrl: './stack-overview.component.html',
  styleUrls: ['./stack-overview.component.scss']
})
export class StackOverviewComponent implements OnInit {

  warehouses: Array<{ id: number; name: string }> = [];
  mrList: MrListItem[] = [];
  fromOutletOptions: FromOutletOption[] = [];

  transferredMrIds = new Set<number>();

  selectedMrId: number | null = null;
  selectedMrNo: string | null = null;

  destinationOutletId: number | null = null;
  destinationOutletName: string | null = null;

  destinationBinId: number | null = null;
  destinationBinName: string | null = null;

  selectedFromOutletId: number | null = null;
  selectedFromOutletName: string | null = null;

  requesterName: string | null = null;
  reqDate: string | null = null;

  // ✅ MR lines (remaining-only)
  mrLines: MrLineVM[] = [];
  totalRemainingQty: number = 0;

  // Stock
  rows: StockRow[] = [];
  filteredRows: StockRow[] = [];

  // ✅ Summary counters
  shortageCount: number = 0;
  transferableLineCount: number = 0;

  loading = false;
  errorMsg: string | null = null;
  transferErrorText: string | null = null;

  constructor(
    private warehouseService: WarehouseService,
    private stockService: StackOverviewService,
    private mrService: MaterialRequisitionService,
    private router: Router
  ) {}

  compareById = (a: any, b: any) => String(a) === String(b);

  ngOnInit(): void {
    this.loadWarehouses();
    this.loadStockRows();
    this.loadTransferredMrIdsAndMrList();
  }

  /* ===================== LOADS ===================== */

  private loadTransferredMrIdsAndMrList(): void {
    this.stockService.getTransferredMrIds().subscribe({
      next: (res: any) => {
        const ids = Array.isArray(res?.data) ? res.data : [];
        this.transferredMrIds = new Set<number>(ids.map((x: any) => Number(x)));
        this.loadMrList();
      },
      error: (err) => {
        console.error('Failed to load transferred MR ids', err);
        this.loadMrList();
      }
    });
  }

  private loadWarehouses(): void {
    this.warehouseService.getWarehouse().subscribe({
      next: (res: any) => {
        const data = Array.isArray(res?.data) ? res.data : [];
        this.warehouses = data.map((w: any) => ({
          id: Number(w.id),
          name: w.name || w.warehouseName || `WH-${w.id}`
        }));
        this.rebuildFromOutletOptions();
      },
      error: (err) => console.error('Error loading warehouses', err)
    });
  }

  private loadMrList(): void {
    this.mrService.GetMaterialRequest().subscribe({
      next: (res: any) => {
        const data = Array.isArray(res?.data) ? res.data : (Array.isArray(res) ? res : []);

        const list: MrListItem[] = (data || []).map((x: any) => {
          const id = Number(x.id ?? x.mrqId ?? 0);
          const mrqNo = String(x.reqNo ?? x.mrqNo ?? x.mrNo ?? `MRQ-${id}`);
          const outletId = x.outletId ?? x.OutletId ?? null;

          const completed = this.isMrCompleted(x);
          const remaining = this.calcMrRemaining(x);

          return {
            id,
            mrqNo,
            outletId: outletId != null ? Number(outletId) : null,
            display: mrqNo,
            isCompleted: completed,
            remainingQty: remaining
          };
        });

        // ✅ Completed MR remove
        this.mrList = list.filter(m => !m.isCompleted);

        if (this.selectedMrId) {
          const found = this.mrList.find(m => Number(m.id) === Number(this.selectedMrId));
          if (!found) this.resetAll();
        }
      },
      error: (err) => console.error('Failed to load MRQ list', err)
    });
  }

  private loadStockRows(): void {
    this.loading = true;
    this.errorMsg = null;

    this.stockService.GetAllStockList().subscribe({
      next: (res: any) => {
        if (res?.isSuccess && Array.isArray(res.data)) {
          this.rows = res.data.map((item: ApiItemRow) => this.toStockRow(item));
          this.applyGrid();
          this.rebuildFromOutletOptions();
          this.recalcMrAvailability(); // ✅
        } else {
          this.errorMsg = 'No stock data found.';
        }
        this.loading = false;
      },
      error: (err) => {
        this.loading = false;
        this.errorMsg = 'Failed to load stock list.';
        console.error('Stock list load error', err);
      }
    });
  }

  /* ===================== NORMALIZE STOCK ROW ===================== */

  private toStockRow(api: ApiItemRow): StockRow {
    const warehouse = String((api as any).warehouseName ?? (api as any).WarehouseName ?? '');
    const bin = String((api as any).binName ?? (api as any).BinName ?? '');

    const sku =
      String(
        (api as any).sku ??
        (api as any).Sku ??
        (api as any).itemCode ??
        (api as any).ItemCode ??
        ''
      ).trim() || null;

    const item =
      String(
        (api as any).name ??
        (api as any).itemName ??
        (api as any).ItemName ??
        ''
      ).trim();

    const onHand = Number((api as any).onHand ?? (api as any).OnHand ?? 0);
    const reserved = Number((api as any).reserved ?? (api as any).Reserved ?? 0);

    const availableRaw = (api as any).available ?? (api as any).Available;
    const available = Number(availableRaw != null ? availableRaw : (onHand - reserved));

    const supplierName =
      String((api as any).supplierName ?? (api as any).SupplierName ?? '').trim() || '-';
    const supplierId = (api as any).supplierId ?? (api as any).SupplierId ?? null;

    const warehouseId = Number((api as any).warehouseId ?? (api as any).WarehouseId ?? 0) || undefined;
    const binId = Number((api as any).binId ?? (api as any).BinId ?? 0) || undefined;

    const itemId = Number((api as any).itemId ?? (api as any).ItemId ?? 0) || undefined;

    const idKey = [
      (api as any).id ?? '',
      warehouse,
      bin,
      sku ?? '',
      item,
      String(supplierId ?? '')
    ].join('|').toLowerCase();

    return {
      idKey,
      warehouse,
      bin,
      onHand,
      available,
      sku,
      item,
      supplierName,
      supplierId: supplierId == null ? null : Number(supplierId),
      warehouseId,
      binId,
      itemId,
      apiRow: api
    };
  }

  trackByRow = (_: number, r: StockRow) => r.idKey;
  trackByMrLine = (_: number, l: MrLineVM) => `${l.itemId}|${l.sku}`;

  /* ===================== MR HELPERS ===================== */

  private isMrCompleted(dto: any): boolean {
    const lines: MrLine[] = dto?.lines ?? dto?.lineItemsList ?? dto?.items ?? [];
    if (!Array.isArray(lines) || lines.length === 0) return false;

    return lines.every(l => {
      const req = Number(l?.qty ?? 0);
      const rec = Number(l?.receivedQty ?? 0);
      return req > 0 && rec >= req;
    });
  }

  private calcMrRemaining(dto: any): number {
    const lines: MrLine[] = dto?.lines ?? dto?.lineItemsList ?? dto?.items ?? [];
    if (!Array.isArray(lines) || lines.length === 0) return 0;

    return lines.reduce((sum, l) => {
      const req = Number(l?.qty ?? 0);
      const rec = Number(l?.receivedQty ?? 0);
      return sum + Math.max(0, req - rec);
    }, 0);
  }

  /**
   * ✅ requestedQty (newRequestedQty) = oldQty - receivedQty
   * remainingQty = requestedQty
   */
  private buildMrLines(dto: any): MrLineVM[] {
    const lines: MrLine[] = dto?.lines ?? dto?.lineItemsList ?? dto?.items ?? [];
    const out: MrLineVM[] = [];

    for (const l of (Array.isArray(lines) ? lines : [])) {
      const itemId = Number(l?.itemId ?? 0);
      const sku = String(l?.itemCode ?? '').trim();
      const itemName = String(l?.itemName ?? '').trim();
      const uomName = String(l?.uomName ?? '').trim();

      const oldReq = Number(l?.qty ?? 0);
      const rec = Number(l?.receivedQty ?? 0);

      const newReq = Math.max(0, oldReq - rec);
      if (!itemId || !sku || newReq <= 0) continue;

      out.push({
        itemId,
        sku,
        itemName: itemName || sku,
        uomName: uomName || '',
        oldRequestedQty: oldReq,
        requestedQty: newReq,
        receivedQty: rec,
        remainingQty: newReq,

        // ✅ init (will be recalculated when from outlet changes)
        availQty: 0,
        maxTransferQty: 0,
        transferQty: 0,
        shortageQty: newReq,
        status: 'SHORT'
      });
    }

    return out;
  }

  private getMrSkuSetLower(): Set<string> {
    const set = new Set<string>();
    for (const l of (this.mrLines || [])) {
      const s = (l.sku || '').toLowerCase().trim();
      if (s) set.add(s);
    }
    return set;
  }

  /* ===================== EVENTS ===================== */

  onMrChanged(mrId: number | null): void {
    this.transferErrorText = null;

    if (!mrId) {
      this.resetAll();
      return;
    }

    this.selectedMrId = Number(mrId);

    this.mrService.GetMaterialRequestById(Number(mrId)).subscribe({
      next: (res: any) => {
        const dto = res?.data ?? res ?? {};

        // Completed => block
        if (this.isMrCompleted(dto)) {
          Swal.fire({
            icon: 'warning',
            title: 'MRQ Completed',
            text: 'Received Qty already equals Requested Qty. This MRQ cannot be used again.'
          }).then(() => {
            this.resetAll();
            this.loadMrList();
          });
          return;
        }

        this.selectedMrNo = String(dto.reqNo ?? dto.mrqNo ?? dto.mrNo ?? `MRQ-${mrId}`);

        const outletId = dto.outletId ?? dto.OutletId ?? null;
        this.destinationOutletId = outletId != null ? Number(outletId) : null;
        this.destinationOutletName = this.getWarehouseNameById(this.destinationOutletId);

        const bId = dto.binId ?? dto.BinId ?? null;
        this.destinationBinId = bId != null ? Number(bId) : null;
        this.destinationBinName = String(dto.binName ?? dto.BinName ?? '') || null;

        this.requesterName = String(dto.requesterName ?? dto.RequesterName ?? '');
        this.reqDate = String(dto.reqDate ?? dto.date ?? '');

        // build MR lines (remaining-only)
        this.mrLines = this.buildMrLines(dto);
        this.totalRemainingQty = this.mrLines.reduce((s, x) => s + Number(x.remainingQty ?? 0), 0);

        if (!this.mrLines.length || this.totalRemainingQty <= 0) {
          Swal.fire({
            icon: 'warning',
            title: 'No Remaining Qty',
            text: 'This MRQ has no remaining quantity to transfer.'
          }).then(() => {
            this.resetAll();
            this.loadMrList();
          });
          return;
        }

        // Prevent FromOutlet == destination
        if (this.selectedFromOutletId != null && this.destinationOutletId != null) {
          if (Number(this.selectedFromOutletId) === Number(this.destinationOutletId)) {
            this.selectedFromOutletId = null;
            this.selectedFromOutletName = null;
          }
        }

        this.rebuildFromOutletOptions();
        this.applyGrid();
        this.recalcMrAvailability(); // ✅
      },
      error: (err) => {
        console.error('Failed to load MRQ detail', err);
        Swal.fire({
          icon: 'error',
          title: 'MRQ Load Failed',
          text: 'Could not load Material Requisition details.'
        });
      }
    });
  }

  onFromOutletChanged(fromId: any): void {
    const idNum = fromId == null || fromId === '' ? null : Number(fromId);
    if (!idNum || Number.isNaN(idNum)) {
      this.selectedFromOutletId = null;
      this.selectedFromOutletName = null;
    } else {
      this.selectedFromOutletId = idNum;
      this.selectedFromOutletName = this.getWarehouseNameById(idNum);
    }

    this.applyGrid();
    this.rebuildFromOutletOptions();
    this.recalcMrAvailability(); // ✅
  }

  onTransferQtyChanged(line: MrLineVM): void {
    const v = Number(line.transferQty ?? 0);
    const safe = Number.isFinite(v) ? v : 0;

    const capped = Math.max(0, Math.min(safe, Number(line.maxTransferQty ?? 0)));
    line.transferQty = capped;
  }

  /* ===================== FROM OUTLET OPTIONS ===================== */

  private rebuildFromOutletOptions(): void {
    const reqTotal = Number(this.totalRemainingQty ?? 0);
    const skuSet = this.getMrSkuSetLower();

    const onHandByWhId = new Map<number, number>();

    if (skuSet.size) {
      for (const r of this.rows) {
        const sku = (r.sku ?? '').toLowerCase().trim();
        if (!skuSet.has(sku)) continue;

        const wid = Number(r.warehouseId ?? 0);
        if (!wid) continue;

        onHandByWhId.set(wid, (onHandByWhId.get(wid) ?? 0) + Number(r.onHand ?? 0));
      }
    }

    const destId = Number(this.destinationOutletId ?? -999);
    const base = this.warehouses.filter(w => Number(w.id) !== destId);

    this.fromOutletOptions = base.map(w => {
      const whId = Number(w.id);
      const onHand = Number(onHandByWhId.get(whId) ?? 0);
      const name = w.name;

      return {
        id: whId,
        name,
        reqQty: reqTotal,
        onHand,
        label: `${name} | Req: ${reqTotal} | OnHand: ${onHand}`
      };
    });
  }

  /* ===================== GRID FILTER ===================== */

  private applyGrid(): void {
    let filtered = [...this.rows];

    // MR SKUs filter
    const skuSet = this.getMrSkuSetLower();
    if (skuSet.size) {
      filtered = filtered.filter(r => skuSet.has((r.sku ?? '').toLowerCase().trim()));
    }

    // exclude destination by ID
    if (this.destinationOutletId != null) {
      const destId = Number(this.destinationOutletId);
      filtered = filtered.filter(r => Number(r.warehouseId ?? -999) !== destId);
    }

    // only selected From outlet
    if (this.selectedFromOutletId != null) {
      const fromId = Number(this.selectedFromOutletId);
      filtered = filtered.filter(r => Number(r.warehouseId ?? -999) === fromId);
    }

    this.filteredRows = filtered;
  }

  /* ===================== NEW: AVAILABILITY CALC ===================== */

  private recalcMrAvailability(): void {
    // if no MR lines, clear
    if (!this.mrLines?.length) {
      this.shortageCount = 0;
      this.transferableLineCount = 0;
      return;
    }

    // build map sku -> total available in selected from outlet
    const availBySku = new Map<string, number>();

    for (const r of (this.filteredRows || [])) {
      const sku = (r.sku ?? '').toLowerCase().trim();
      if (!sku) continue;
      availBySku.set(sku, (availBySku.get(sku) ?? 0) + Number(r.available ?? 0));
    }

    let shortage = 0;
    let transferable = 0;

    for (const l of this.mrLines) {
      const skuLower = (l.sku ?? '').toLowerCase().trim();
      const avail = Number(availBySku.get(skuLower) ?? 0);

      l.availQty = avail;

      const remaining = Number(l.remainingQty ?? 0);
      l.maxTransferQty = Math.max(0, Math.min(remaining, avail));

      l.shortageQty = Math.max(0, remaining - avail);

      if (avail <= 0) {
        l.status = 'SHORT';
        l.transferQty = 0;
        shortage++;
      } else if (avail >= remaining) {
        l.status = 'READY';
        // default transfer qty = full remaining (only if empty or too big)
        if (!l.transferQty || l.transferQty > l.maxTransferQty) l.transferQty = l.maxTransferQty;
        transferable++;
      } else {
        l.status = 'PARTIAL';
        if (!l.transferQty || l.transferQty > l.maxTransferQty) l.transferQty = l.maxTransferQty;
        transferable++;
      }
    }

    this.shortageCount = shortage;
    this.transferableLineCount = transferable;
  }

  /* ===================== TRANSFER ===================== */

  canTransfer(): boolean {
    this.transferErrorText = null;

    if (!this.selectedMrId) return (this.transferErrorText = 'Select a Material Requisition.'), false;
    if (!this.destinationOutletId) return (this.transferErrorText = 'Destination outlet not found.'), false;
    if (!this.selectedFromOutletId) return (this.transferErrorText = 'Select From Outlet.'), false;
    if (!this.destinationBinId) return (this.transferErrorText = 'Destination Bin not found.'), false;

    if (!this.mrLines?.length) return (this.transferErrorText = 'No MR lines found.'), false;
    if (Number(this.totalRemainingQty ?? 0) <= 0) return (this.transferErrorText = 'No remaining qty to transfer.'), false;

    // ✅ key rule: allow if at least one line has transferQty > 0
    const anyTransfer = (this.mrLines || []).some(l => Number(l.transferQty ?? 0) > 0);
    if (!anyTransfer) return (this.transferErrorText = 'Enter Transfer Qty for at least one line.'), false;

    return true;
  }

  submitTransfer(): void {
    if (!this.canTransfer()) return;

    const mrId = Number(this.selectedMrId ?? 0);
    const fromWarehouseID = Number(this.selectedFromOutletId ?? 0);
    const toWarehouseID = Number(this.destinationOutletId ?? 0);
    const toBinId = Number(this.destinationBinId ?? 0);

    const now = new Date();
    const userId = 1001;

    const payload: any[] = [];
    const shortageSkus: Array<{ sku: string; itemName: string; need: number; avail: number }> = [];

    for (const line of (this.mrLines || [])) {

      const want = Number(line.transferQty ?? 0);
      if (!want || want <= 0) continue; // ✅ skip shortage / zero lines

      const skuLower = (line.sku || '').toLowerCase().trim();
      let remainingToAllocate = want;

      const candidates = (this.filteredRows || [])
        .filter(r => ((r.sku ?? '').toLowerCase().trim() === skuLower))
        .filter(r => Number(r.available ?? 0) > 0)
        .sort((a, b) => Number(b.available ?? 0) - Number(a.available ?? 0));

      const totalAvail = candidates.reduce((s, r) => s + Number(r.available ?? 0), 0);

      if (!candidates.length || totalAvail <= 0) {
        shortageSkus.push({ sku: line.sku, itemName: line.itemName, need: want, avail: 0 });
        continue; // ✅ do NOT stop transfer
      }

      if (totalAvail < remainingToAllocate) {
        // user asked more than available (shouldn't happen due to maxTransferQty, but safe)
        shortageSkus.push({ sku: line.sku, itemName: line.itemName, need: want, avail: totalAvail });
        remainingToAllocate = totalAvail;
      }

      for (const match of candidates) {
        if (remainingToAllocate <= 0) break;

        const avail = Number(match.available ?? 0);
        const takeQty = Math.min(remainingToAllocate, avail);
        remainingToAllocate -= takeQty;

        payload.push({
          ItemId: Number(line.itemId ?? 0),

          MrId: mrId,
          FromWarehouseID: fromWarehouseID,
          ToWarehouseID: toWarehouseID,
          ToBinId: toBinId,

          BinId: match.binId ?? null,
          BinName: match.bin ?? '',

          Available: Number(match.available ?? 0),
          OnHand: Number(match.onHand ?? 0),

          RequestedQty: Number(line.requestedQty ?? 0),
          OldRequestedQty: Number(line.oldRequestedQty ?? 0),
          ReceivedQty: Number(line.receivedQty ?? 0),
          TransferQty: Number(takeQty),
          TransferNo:'',
          isApproved: true,
          CreatedBy: userId,
          CreatedDate: now,
          UpdatedBy: userId,
          UpdatedDate: now,

          FromWarehouseName: this.selectedFromOutletName ?? '',
          ItemName: line.itemName ?? match.item ?? '',
          Sku: line.sku ?? match.sku ?? '',
          Remarks: '',

          SupplierId: (match.supplierId == null ? null : Number(match.supplierId)),
          IsSupplierBased: false
        });
      }
    }

    if (!payload.length) {
      Swal.fire({
        icon: 'warning',
        title: 'Nothing to Transfer',
        text: 'No transferable lines found (all lines shortage or Transfer Qty is 0).'
      });
      return;
    }

    this.loading = true;

    this.stockService.insertStock(payload).subscribe({
      next: (_res: any) => {
        this.loading = false;

        const shortageMsg = shortageSkus.length
          ? `\n\nShortage items kept pending: ${shortageSkus.map(x => x.sku).join(', ')}`
          : '';

        Swal.fire({
          icon: 'success',
          title: 'Transfer Created',
          text: `Transfer created for ${payload.length} row(s).${shortageMsg}`,
          confirmButtonColor: '#2E5F73'
        }).then(() => {
          this.resetAll();

          this.router.navigate(['/Inventory/create-stocktransfer'], {
            state: { mrId, toWarehouseID, fromWarehouseID, toBinId }
          });
        });
      },
      error: (err) => {
        this.loading = false;
        console.error('Transfer failed', err);
        Swal.fire({
          icon: 'error',
          title: 'Transfer Failed',
          text: err?.error?.message || 'Something went wrong during transfer.'
        });
      }
    });
  }

  /* ===================== UTIL ===================== */

  private getWarehouseNameById(id: number | null | undefined): string | null {
    if (!id) return null;
    const w = this.warehouses.find(x => Number(x.id) === Number(id));
    return w ? w.name : null;
  }

  private resetAll(): void {
    this.selectedMrId = null;
    this.selectedMrNo = null;

    this.destinationOutletId = null;
    this.destinationOutletName = null;

    this.destinationBinId = null;
    this.destinationBinName = null;

    this.selectedFromOutletId = null;
    this.selectedFromOutletName = null;

    this.requesterName = null;
    this.reqDate = null;

    this.mrLines = [];
    this.totalRemainingQty = 0;

    this.shortageCount = 0;
    this.transferableLineCount = 0;

    this.rebuildFromOutletOptions();
    this.applyGrid();
  }

  goToStockOverviewList() {
    this.router.navigate(['/Inventory/list-stackoverview']);
  }
}
