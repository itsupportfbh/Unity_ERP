import {
  Component,
  HostListener,
  OnInit,
  ViewChild,
  AfterViewInit,
  ViewEncapsulation
} from '@angular/core';
import { Router } from '@angular/router';
import { ColumnMode, DatatableComponent } from '@swimlane/ngx-datatable';
import * as feather from 'feather-icons';
import Swal from 'sweetalert2';

import { PurchaseGoodreceiptService } from '../purchase-goodreceipt.service';
import { WarehouseService } from 'app/main/master/warehouse/warehouse.service';
import { StockAdjustmentService } from 'app/main/inventory/stock-adjustment/stock-adjustment.service';
import { StrategyService } from 'app/main/master/strategies/strategy.service';
import { PeriodCloseService } from 'app/main/financial/period-close-fx/period-close-fx.service';

interface GrnRow {
  id: number;
  receptionDate: string | Date | null;
  poid: number | null;
  grnNo: string;
  pono: string;
  itemCode: string;
  itemName: string;
  supplierId: number | null;
  name: string;
  storageType: string;
  surfaceTemp: string;
  expiry: string | Date | null;
  pestSign: string;
  drySpillage: string;
  odor: string;
  plateNumber: string;
  defectLabels: string;
  damagedPackage: string;
  time: string | Date | null;
  initial: string;
  isFlagIssue: boolean;
  isPostInventory: boolean;

  qtyReceived?: number | null;
  qualityCheck?: string | null;
  batchSerial?: string | null;

  warehouseId?: number | null;
  binId?: number | null;
  strategyId?: number | null;
  warehouseName?: string | null;
  binName?: string | null;
  strategyName?: string | null;
}

type ViewerState = { open: boolean; src: string | null };

@Component({
  selector: 'app-grn-list',
  templateUrl: './purchase-goodreceiptlist.component.html',
  styleUrls: ['./purchase-goodreceiptlist.component.scss'],
  encapsulation: ViewEncapsulation.None
})
export class PurchaseGoodreceiptlistComponent implements OnInit, AfterViewInit {
  @ViewChild(DatatableComponent) table!: DatatableComponent;

  public ColumnMode = ColumnMode;
  public selectedOption = 10;
  public searchValue = '';

  rows: GrnRow[] = [];
  allRows: GrnRow[] = [];

  // image viewer
  imageViewer: ViewerState = { open: false, src: null };

  // lines modal
  showLinesModal = false;
  modalLines: any[] = [];
  modalHeader: {
    grnNo?: string;
    pono?: string;
    name?: string;
    receptionDate?: any;
  } = { grnNo: '' };

  // lookups
  private warehouseNameMap = new Map<number, string>();
  private strategyNameMap = new Map<number, string>();
  private binsByWarehouse = new Map<number, Map<number, string>>();
  private warehousesLoaded = false;
  private strategiesLoaded = false;

  // 🔒 period lock
  isPeriodLocked = false;
  periodName = '';

  constructor(
    private grnService: PurchaseGoodreceiptService,
    private router: Router,
    private warehouseService: WarehouseService,
    private stockService: StockAdjustmentService,
    private strategyService: StrategyService,
    private periodLock: PeriodCloseService
  ) {}

  // ---------- lifecycle ----------
  ngOnInit(): void {
    this.loadWarehouses();
    this.loadStrategies();
    this.loadGrns();
    this.checkPeriodLockForToday();
  }

  ngAfterViewInit(): void {
    this.refreshFeatherIcons();
  }

  private refreshFeatherIcons(): void {
    setTimeout(() => feather.replace(), 0);
  }

  // ---------- period lock ----------
  private checkPeriodLockForToday(): void {
    const today = new Date().toISOString().substring(0, 10); // yyyy-MM-dd

    this.periodLock.getStatusForDateWithName(today).subscribe({
      next: status => {
        this.isPeriodLocked = !!status?.isLocked;
        this.periodName = status?.periodName || '';
      },
      error: () => {
        this.isPeriodLocked = false;
        this.periodName = '';
      }
    });
  }

  // ---------- data load ----------
  private loadGrns(): void {
    this.grnService.getAllDetails().subscribe({
      next: (res: any) => {
        const list: any[] = Array.isArray(res)
          ? res
          : (Array.isArray(res?.data) ? res.data : []);

        const normalized = (list || []).map<GrnRow>((g: any) => ({
          id: g.id ?? g.ID ?? null,
          receptionDate: g.receptionDate ?? g.ReceptionDate ?? null,
          poid: g.poid ?? g.POID ?? g.poId ?? null,
          grnNo: g.grnNo ?? g.GrnNo ?? '',
          pono: g.pono ?? g.Pono ?? '',
          itemCode: g.itemCode ?? g.ItemCode ?? '',
          itemName: g.itemName ?? g.ItemName ?? '',
          supplierId: g.supplierId ?? g.SupplierId ?? null,
          name: g.name ?? g.Name ?? '',
          storageType: g.storageType ?? g.StorageType ?? '',
          surfaceTemp: (g.surfaceTemp ?? g.SurfaceTemp ?? '').toString(),
          expiry: g.expiry ?? g.Expiry ?? null,
          pestSign: g.pestSign ?? g.PestSign ?? '',
          drySpillage: g.drySpillage ?? g.DrySpillage ?? '',
          odor: g.odor ?? g.Odor ?? '',
          plateNumber: g.plateNumber ?? g.PlateNumber ?? '',
          defectLabels: g.defectLabels ?? g.DefectLabels ?? '',
          damagedPackage: g.damagedPackage ?? g.DamagedPackage ?? '',
          time: g.time ?? g.Time ?? null,
          initial: g.initial ?? g.Initial ?? '',
          isFlagIssue: this.truthy(g.isFlagIssue ?? g.IsFlagIssue ?? false),
          isPostInventory: this.truthy(g.isPostInventory ?? g.IsPostInventory ?? false),

          qtyReceived: g.qtyReceived ?? g.QtyReceived ?? null,
          qualityCheck: g.qualityCheck ?? g.QualityCheck ?? null,
          batchSerial: g.batchSerial ?? g.BatchSerial ?? null,

          warehouseId: g.warehouseId ?? g.WarehouseId ?? null,
          binId: g.binId ?? g.BinId ?? null,
          strategyId: g.strategyId ?? g.StrategyId ?? null,
          warehouseName: g.warehouseName ?? g.WarehouseName ?? null,
          binName: g.binName ?? g.BinName ?? null,
          strategyName: g.strategyName ?? g.StrategyName ?? null
        }));

        this.allRows = normalized;
        this.rows = this.collapseByGrn(normalized);
        if (this.table) this.table.offset = 0;
        this.refreshFeatherIcons();
      },
      error: () => {
        this.allRows = [];
        this.rows = [];
      }
    });
  }

  /** collapse multiple detail lines into one row per GRN+status */
  private collapseByGrn(rows: GrnRow[]): GrnRow[] {
    const map = new Map<string, { base: GrnRow; items: Set<string> }>();

    for (const r of rows) {
      const key = `${r.grnNo}__${this.truthy(r.isFlagIssue)}__${this.truthy(
        r.isPostInventory
      )}`;
      if (!map.has(key)) {
        map.set(key, {
          base: { ...r },
          items: new Set<string>([r.itemName?.trim() || ''])
        });
      } else {
        const bucket = map.get(key)!;
        if (!bucket.base.name && r.name) bucket.base.name = r.name;
        if (!bucket.base.pono && r.pono) bucket.base.pono = r.pono;
        bucket.items.add(r.itemName?.trim() || '');
      }
    }

    return Array.from(map.values()).map(({ base, items }) => {
      const list = [...items].filter(Boolean);
      const summary = list.join(', ');
      return {
        ...base,
        itemName:
          list.length > 1
            ? `${summary} (${list.length})`
            : (summary || base.itemName)
      };
    });
  }

  // ---------- search ----------
  filterUpdate(event: Event): void {
    const val = (event.target as HTMLInputElement).value
      ?.toLowerCase()
      .trim() ?? '';
    this.searchValue = val;

    if (!val) {
      this.rows = this.collapseByGrn(this.allRows);
      if (this.table) this.table.offset = 0;
      this.refreshFeatherIcons();
      return;
    }

    const filtered = this.allRows.filter(r =>
      (r.grnNo ?? '').toLowerCase().includes(val) ||
      (r.pono ?? '').toLowerCase().includes(val) ||
      (r.itemCode ?? '').toLowerCase().includes(val) ||
      (r.itemName ?? '').toLowerCase().includes(val) ||
      (r.name ?? '').toLowerCase().includes(val)
    );

    this.rows = this.collapseByGrn(filtered);
    if (this.table) this.table.offset = 0;
    this.refreshFeatherIcons();
  }

  // ---------- lines modal ----------
  openLinesModal(row: GrnRow): void {
    if (!row?.grnNo) return;

    this.modalHeader = {
      grnNo: row.grnNo || '',
      pono: row.pono || '',
      name: row.name || '',
      receptionDate: row.receptionDate || null
    };

    this.modalLines = [];
    this.showLinesModal = true;

    const sameGrnRows = this.allRows.filter(
      r => (r.grnNo || '') === (row.grnNo || '')
    );
    const sameStatusRows = sameGrnRows.filter(
      r =>
        this.truthy(r.isPostInventory) === this.truthy(row.isPostInventory) &&
        this.truthy(r.isFlagIssue) === this.truthy(row.isFlagIssue)
    );

    if (sameStatusRows.length) {
      this.modalLines = sameStatusRows.map(r => this.toModalLine(r, r.name));
      this.fillMissingNamesForModalLines();
      return;
    }

    // fallback: call API
    this.grnService.getByIdGRN(row.id).subscribe({
      next: (res: any) => {
        const data = res?.data ?? res ?? {};
        let lines: any[] = [];
        try {
          const raw = data?.grnJson ?? data?.GRNJSON ?? '[]';
          lines = Array.isArray(raw) ? raw : JSON.parse(raw);
        } catch {
          lines = [];
        }

        const picked = this.pickOneLine(lines, row);
        if (!picked.supplierName) picked.supplierName = row.name ?? '';

        this.modalLines = (lines.length ? lines : [picked]).map(l =>
          this.toModalLine(l, row.name)
        );
        this.fillMissingNamesForModalLines();
      },
      error: () => {
        this.modalLines = [this.toModalLine(row, row.name)];
        this.fillMissingNamesForModalLines();
      }
    });
  }

  closeLinesModal(): void {
    this.showLinesModal = false;
    this.modalLines = [];
  }

  private toModalLine(src: any, fallbackName?: string) {
    const timeDate = this.parseTime(src.time);

    return {
      itemName: src.itemName ?? src.itemText ?? src.item ?? '',
      item: src.item ?? '',
      itemCode: src.itemCode ?? '',
      supplierName: src.supplierName ?? fallbackName ?? '',
      storageType: src.storageType ?? '',
      surfaceTemp: src.surfaceTemp ?? '',
      expiry: src.expiry ? this.toDate(src.expiry) : null,
      pestSign: src.pestSign ?? '',
      drySpillage: src.drySpillage ?? '',
      odor: src.odor ?? '',
      plateNumber: src.plateNumber ?? '',
      defectLabels: src.defectLabels ?? '',
      damagedPackage: src.damagedPackage ?? '',
      time: timeDate,
      timeText: this.coerceTimeText(src.time),
      isFlagIssue: this.truthy(src.isFlagIssue),
      isPostInventory: this.truthy(src.isPostInventory),

      qtyReceived: this.toNumberOrNull(src.qtyReceived ?? src.QtyReceived),
      qualityCheck: src.qualityCheck ?? src.QualityCheck ?? null,
      batchSerial: src.batchSerial ?? src.BatchSerial ?? null,

      warehouseId: this.toNum(src.warehouseId ?? src.WarehouseId),
      binId: this.toNum(src.binId ?? src.BinId),
      strategyId: this.toNum(src.strategyId ?? src.StrategyId),
      warehouseName: src.warehouseName ?? src.WarehouseName ?? null,
      binName: src.binName ?? src.BinName ?? null,
      strategyName: src.strategyName ?? src.StrategyName ?? null
    };
  }

  // ---------- name resolution ----------
  private fillMissingNamesForModalLines(): void {
    this.applyWarehouseNames();
    this.applyStrategyNames();

    const whToBinsNeeded = new Map<number, Set<number>>();
    for (const l of this.modalLines) {
      if (l.warehouseId && l.binId && !l.binName) {
        if (!whToBinsNeeded.has(l.warehouseId)) {
          whToBinsNeeded.set(l.warehouseId, new Set<number>());
        }
        whToBinsNeeded.get(l.warehouseId)!.add(l.binId);
      }
    }

    if (!this.warehousesLoaded) {
      this.loadWarehouses(() => this.applyWarehouseNames());
    }
    if (!this.strategiesLoaded) {
      this.loadStrategies(() => this.applyStrategyNames());
    }

    whToBinsNeeded.forEach((needBinIds, whId) => {
      this.ensureBinsLoaded(whId, () => {
        const map = this.binsByWarehouse.get(whId);
        if (!map) return;
        for (const l of this.modalLines) {
          if (
            l.warehouseId === whId &&
            l.binId &&
            !l.binName &&
            map.has(l.binId)
          ) {
            l.binName = map.get(l.binId)!;
          }
        }
      });
    });
  }

  private applyWarehouseNames(): void {
    for (const l of this.modalLines) {
      if (
        !l.warehouseName &&
        l.warehouseId &&
        this.warehouseNameMap.has(l.warehouseId)
      ) {
        l.warehouseName = this.warehouseNameMap.get(l.warehouseId)!;
      }
    }
  }

  private applyStrategyNames(): void {
    for (const l of this.modalLines) {
      if (
        !l.strategyName &&
        l.strategyId &&
        this.strategyNameMap.has(l.strategyId)
      ) {
        l.strategyName = this.strategyNameMap.get(l.strategyId)!;
      }
    }
  }

  // ---------- preload maps ----------
  private loadWarehouses(after?: () => void) {
    if (this.warehousesLoaded && after) {
      after();
      return;
    }

    this.warehouseService.getWarehouse().subscribe({
      next: (res: any) => {
        const arr = res?.data ?? res ?? [];
        for (const w of arr) {
          const id = Number(w.id ?? w.Id);
          const name = String(
            w.name ?? w.warehouseName ?? w.WarehouseName ?? ''
          );
          if (id && name) this.warehouseNameMap.set(id, name);
        }
        this.warehousesLoaded = true;
        if (after) after();
      },
      error: () => {
        this.warehousesLoaded = true;
        if (after) after();
      }
    });
  }

  private loadStrategies(after?: () => void) {
    if (this.strategiesLoaded && after) {
      after();
      return;
    }

    this.strategyService.getStrategy().subscribe({
      next: (res: any) => {
        const arr = res?.data ?? res ?? [];
        for (const s of arr) {
          const id = Number(s.id ?? s.Id);
          const name = String(
            s.strategyName ?? s.name ?? s.StrategyName ?? ''
          );
          if (id && name) this.strategyNameMap.set(id, name);
        }
        this.strategiesLoaded = true;
        if (after) after();
      },
      error: () => {
        this.strategiesLoaded = true;
        if (after) after();
      }
    });
  }

  private ensureBinsLoaded(warehouseId: number, after?: () => void) {
    if (!warehouseId) {
      if (after) after();
      return;
    }
    if (this.binsByWarehouse.has(warehouseId)) {
      if (after) after();
      return;
    }

    this.stockService.GetBinDetailsbywarehouseID(warehouseId).subscribe({
      next: (res: any) => {
        const map = new Map<number, string>();
        const data = res?.data ?? res ?? [];
        for (const b of data) {
          const id = Number(b.id ?? b.binId ?? b.BinId);
          const name = String(b.binName ?? b.name ?? b.bin ?? '');
          if (id && name) map.set(id, name);
        }
        this.binsByWarehouse.set(warehouseId, map);
        if (after) after();
      },
      error: () => {
        if (after) after();
      }
    });
  }

  // ---------- misc helpers ----------
  private toNumberOrNull(v: any): number | null {
    if (v === null || v === undefined || v === '') return null;
    const n = Number(v);
    return isNaN(n) ? null : n;
  }

  private toNum(v: any): number | null {
    const n = Number(v);
    return Number.isFinite(n) ? n : null;
  }

  private parseTime(v: any): Date | null {
    if (!v) return null;
    const s = String(v).trim();
    const m = /^(\d{1,2}):(\d{2})(?::(\d{2}))?$/.exec(s);
    if (m) {
      const d = new Date();
      d.setHours(+m[1], +m[2], m[3] ? +m[3] : 0, 0);
      return d;
    }
    const d = new Date(v);
    return isNaN(+d) ? null : d;
  }

  private pickOneLine(lines: any[], row: GrnRow) {
    return (
      lines.find(
        l => (l.itemCode ?? l.item ?? '') === (row.itemCode ?? '')
      ) ||
      lines.find(
        l =>
          (l.itemCode ?? l.item ?? '') === (row.itemCode ?? '') &&
          (String(l.storageType ?? '') === String(row.storageType ?? '') ||
           String(l.surfaceTemp ?? '') === String(row.surfaceTemp ?? ''))
      ) ||
      lines[0] ||
      {}
    );
  }

  isDataUrl(v: string | null | undefined): boolean {
    const s = String(v ?? '');
    return /^data:image\/(png|jpe?g|webp|gif);base64,/i.test(s);
  }

  openImage(src: string): void {
    if (!this.isDataUrl(src)) return;
    this.imageViewer = { open: true, src };
    document.body.style.overflow = 'hidden';
  }

  closeImage(): void {
    this.imageViewer = { open: false, src: null };
    document.body.style.overflow = '';
  }

  @HostListener('document:keydown.escape')
  handleEsc(): void {
    if (this.imageViewer.open) this.closeImage();
    if (this.showLinesModal) this.closeLinesModal();
  }

  goToCreateGRN(): void {
    if (this.isPeriodLocked) {
      Swal.fire(
        'Period Locked',
        this.periodName
          ? `Period "${this.periodName}" is locked. You cannot create GRNs in this period.`
          : 'Selected period is locked. You cannot create GRNs.',
        'warning'
      );
      return;
    }
    this.router.navigate(['/purchase/createpurchasegoodreceipt']);
  }

  onEdit(row: GrnRow): void {
    if (row.isPostInventory) {
      Swal.fire(
        'Not Allowed',
        'This GRN is already posted to inventory.',
        'info'
      );
      return;
    }

    if (this.isPeriodLocked) {
      Swal.fire(
        'Period Locked',
        this.periodName
          ? `Period "${this.periodName}" is locked. You cannot edit GRNs in this period.`
          : 'Selected period is locked. You cannot edit GRNs.',
        'warning'
      );
      return;
    }

    this.editGRN(row.id);
  }

  editGRN(id: any): void {
    this.router.navigateByUrl(`/purchase/edit-purchasegoodreceipt/${id}`);
  }

  private toDate(d: any): Date | null {
    const dt = new Date(d);
    if (isNaN(+dt)) return null;
    if (dt.getFullYear() === 1900) return null;
    return dt;
  }

  private truthy(v: any): boolean {
    if (v === true || v === 1) return true;
    if (v === false || v === 0 || v === null || v === undefined) return false;
    const s = String(v).trim().toLowerCase();
    return s === '1' || s === 'true' || s === 'yes';
  }

  statusText(row: any): 'Posted' | 'Flagged' | 'Pending' {
    const isPost = this.truthy(row?.isPostInventory);
    const isFlag = this.truthy(row?.isFlagIssue);
    if (isPost) return 'Posted';
    if (isFlag) return 'Flagged';
    return 'Pending';
  }

  statusClass(row: any): string {
    const t = this.statusText(row);
    if (t === 'Posted') return 'badge-success';
    if (t === 'Flagged') return 'badge-warning';
    return 'badge-danger';
  }

  private coerceTimeText(v: any): string | null {
    if (!v) return null;
    const d = this.parseTime(v);
    if (!d) return null;
    const hours = d.getHours().toString().padStart(2, '0');
    const minutes = d.getMinutes().toString().padStart(2, '0');
    return `${hours}:${minutes}`;
  }
}
