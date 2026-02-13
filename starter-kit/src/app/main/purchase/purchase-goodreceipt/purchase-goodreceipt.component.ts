import {
  Component,
  OnInit,
  ChangeDetectorRef,
  AfterViewInit,
  AfterViewChecked
} from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import Swal from 'sweetalert2';
import { forkJoin, of, Observable } from 'rxjs';
import { map, catchError, tap } from 'rxjs/operators';
import feather from 'feather-icons';

import { PurchaseGoodreceiptService } from './purchase-goodreceipt.service';
import { FlagissueService } from 'app/main/master/flagissue/flagissue.service';
import { SupplierService } from 'app/main/businessPartners/supplier/supplier.service';
import { POService } from '../purchase-order/purchase-order.service';
import { WarehouseService } from 'app/main/master/warehouse/warehouse.service';
import { StockAdjustmentService } from 'app/main/inventory/stock-adjustment/stock-adjustment.service';
import { StrategyService } from 'app/main/master/strategies/strategy.service';
import {
  InventoryService,
  ApplyGrnRequest,
  ApplyGrnLine,
  UpdateWarehouseAndSupplierPriceDto
} from 'app/main/inventory/inventory.service';

export interface LineRow {
  itemText: string;
  itemCode: string;
  supplierId: number | null;
  supplierName: string;

  warehouseId: number | null;
  binId: number | null;
  warehouseName?: string | null;
  binName?: string | null;

  strategyId: number | null;
  strategyName?: string | null;

  qtyReceived: number | null;
  qualityCheck: 'pass' | 'fail' | 'notverify' | '';
  batchSerial: string;

  unitPrice?: number | null;
  barcode?: string | null;

  storageType: string;
  surfaceTemp: string;
  expiry: string;
  pestSign: string;
  drySpillage: string;
  odor: string;
  plateNumber: string;
  defectLabels: string;
  damagedPackage: string;
  time: string;
  initial: string;
  remarks: string;

  createdAt: Date;
  photos: string[];

  isFlagIssue?: boolean;
  isPostInventory?: boolean;
  flagIssueId?: number | null;
}

interface GeneratedGRN {
  id: number;
  grnNo: string;
  poid: number;
  poNo?: string;
  grnJson: any[];
}

@Component({
  selector: 'app-purchase-goodreceipt',
  templateUrl: './purchase-goodreceipt.component.html',
  styleUrls: ['./purchase-goodreceipt.component.scss']
})
export class PurchaseGoodreceiptComponent implements OnInit, AfterViewInit, AfterViewChecked {

  hover = false;
  minDate = '';
  showSummary = false;

  currentUsername: string = '';

  imageViewer = { open: false, src: null as string | null };
  openImage(src: string) { this.imageViewer = { open: true, src }; document.body.style.overflow = 'hidden'; }
  closeImage() { this.imageViewer = { open: false, src: null }; document.body.style.overflow = ''; }

  flagModal = { open: false };
  selectedFlagIssueId: number | null = null;
  selectedRowForFlagIndex: number | null = null;

  isPoDateDisabled = false;

  selectedPO: number | null = null;
  receiptDate = '';
  overReceiptTolerance = 0;

  currentSupplierId: number | null = null;
  currentSupplierName = '';

  warehouses: Array<{ id: number; name: string }> = [];
  binsByWarehouse: Record<number, Array<{ id: number; binName: string }>> = {};
  strategies: Array<{ id: number; name: string }> = [];

  grnRows: LineRow[] = [
    {
      itemText: '', itemCode: '',
      supplierId: null, supplierName: '',
      warehouseId: null, binId: null, warehouseName: null, binName: null,
      strategyId: null, strategyName: null,
      qtyReceived: null,
      qualityCheck: '',
      batchSerial: '',
      unitPrice: null,
      barcode: null,
      storageType: '', surfaceTemp: '', expiry: '',
      pestSign: '', drySpillage: '', odor: '',
      plateNumber: '', defectLabels: '', damagedPackage: '',
      time: '',
      initial: '',
      remarks: '',
      createdAt: new Date(), photos: [],
      isFlagIssue: false, isPostInventory: false, flagIssueId: null
    }
  ];

  purchaseOrder: Array<{
    id: number;
    purchaseOrderNo: string;
    supplierId?: number;
    supplierName?: string;
    poLines?: string;
    poDate?: string;
    deliveryDate?: string;
  }> = [];

  flagIssuesList: any[] = [];
  isPostInventoryDisabled = false;

  generatedGRN: GeneratedGRN | null = null;
  editingGrnId: number | null = null;

  private supplierNameMap = new Map<number, string>();

  constructor(
    private purchaseGoodReceiptService: PurchaseGoodreceiptService,
    private flagIssuesService: FlagissueService,
    private purchaseorderService: POService,
    private _SupplierService: SupplierService,
    private cdRef: ChangeDetectorRef,
    private router: Router,
    private route: ActivatedRoute,
    private warehouseService: WarehouseService,
    private stockadjustmentService: StockAdjustmentService,
    private strategyService: StrategyService,
    private inventoryService: InventoryService
  ) { }

  ngAfterViewInit() { feather.replace(); }
  ngAfterViewChecked() { feather.replace(); }

  ngOnInit() {
    this.currentUsername = localStorage.getItem('username') || '';
    this.setMinDate();

    // loads for create list
    this.loadPOs();
    this.loadFlagIssues();

    // IMPORTANT: if edit, load masters first -> then load GRN
    this.route.paramMap.subscribe(pm => {
      const idParam = pm.get('id');
      const id = idParam ? Number(idParam) : NaN;
      if (!Number.isFinite(id) || id <= 0) return;

      this.editingGrnId = id;

      forkJoin([
        this.loadWarehouses$(),
        this.loadStrategy$()
      ]).subscribe({
        next: () => this.loadForEdit(id),
        error: (err) => console.error('Master load failed', err)
      });
    });

    // If NOT edit mode, you still want masters for create mode dropdowns
    // (so create form binds too)
    forkJoin([this.loadWarehouses$(), this.loadStrategy$()]).subscribe();
  }

  setMinDate() {
    const d = new Date();
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    this.minDate = `${yyyy}-${mm}-${dd}`;
  }

  get isEditMode(): boolean { return !!this.editingGrnId; }

  goToDebitNoteList() { this.router.navigate(['/purchase/list-Purchasegoodreceipt']); }
  goToList(): void { this.router.navigate(['/purchase/list-Purchasegoodreceipt']); }

  allowOnlyNumbers(event: KeyboardEvent): void {
    const allowedControl = ['Backspace', 'ArrowLeft', 'ArrowRight', 'Tab', 'Delete', 'Home', 'End'];
    if (allowedControl.includes(event.key)) return;
    if (!/^\d$/.test(event.key)) event.preventDefault();
  }

  /* ===================== SAVE (create mode) ===================== */
  saveGRN() {
    if (!this.selectedPO) {
      Swal.fire({ icon: 'warning', title: 'Required', text: 'Please select a PO.', confirmButtonColor: '#0e3a4c' });
      return;
    }

    const rowsForApi = this.grnRows.map(r => ({
      itemCode: r.itemCode,
      supplierId: r.supplierId,

      warehouseId: r.warehouseId ?? null,
      binId: r.binId ?? null,
      warehouseName: r.warehouseName ?? this.lookupWarehouseName(r.warehouseId),
      binName: r.binName ?? this.lookupBinName(r.binId),
      strategyId: r.strategyId ?? null,
      strategyName: r.strategyName ?? this.lookupStrategyName(r.strategyId),

      qtyReceived: r.qtyReceived ?? null,
      qualityCheck: r.qualityCheck ?? '',
      batchSerial: r.batchSerial ?? '',

      unitPrice: this.getNumberOrNull((r as any).unitPrice),
      barcode: (r as any).barcode ?? null,

      storageType: r.storageType,
      surfaceTemp: r.surfaceTemp,
      expiry: r.expiry,
      pestSign: r.pestSign,
      drySpillage: r.drySpillage,
      odor: r.odor,
      plateNumber: r.plateNumber,
      defectLabels: r.defectLabels,
      damagedPackage: r.damagedPackage,
      time: r.time,
      initial: this.currentUsername,
      remarks: r.remarks,
      isFlagIssue: !!r.isFlagIssue,
      isPostInventory: !!r.isPostInventory,
      flagIssueId: r.flagIssueId ?? null
    }));

    const payload = {
      id: this.editingGrnId ?? 0,
      poid: this.selectedPO,
      supplierId: this.currentSupplierId,
      receptionDate: this.receiptDate ? new Date(this.receiptDate) : new Date(),
      overReceiptTolerance: this.overReceiptTolerance,
      grnJson: JSON.stringify(rowsForApi),
      grnNo: this.generatedGRN?.grnNo ?? '',
      isActive: true
    };

    this.purchaseGoodReceiptService.createGRN(payload).subscribe({
      next: (res: any) => {
        const grnId = res?.data || res?.id || res;
        Swal.fire({ icon: 'success', title: 'Created', text: res?.message || 'GRN created.', confirmButtonColor: '#0e3a4c' });
        if (grnId) { this.showSummary = true; this.loadSummaryForCreate(grnId); }
      },
      error: (err: any) => {
        console.error('Save failed', err);
        Swal.fire({ icon: 'error', title: 'Error', text: 'Failed to save GRN.', confirmButtonColor: '#0e3a4c' });
      }
    });
  }

  /** Build ApplyGrnRequest (batch) */
  private buildInventoryRequestFromGrn(rows: LineRow[]): ApplyGrnRequest {
    const lines: ApplyGrnLine[] = rows.map(r => ({
      itemCode: String(r.itemCode || '').trim(),
      supplierId: r.supplierId ?? null,
      warehouseId: Number(r.warehouseId),
      binId: r.binId ?? null,
      strategyId: r.strategyId ?? null,
      qtyDelta: Number(r.qtyReceived || 0),
      batchFlag: !!r.batchSerial,
      serialFlag: false,
      barcode: r.barcode ?? null,
      price: this.getNumberOrNull(r.unitPrice),
      remarks: r.remarks ?? null
    }));
    return {
      grnNo: this.generatedGRN?.grnNo || '',
      receptionDate: this.receiptDate || new Date(),
      updatedBy: '',
      lines
    };
  }

  /** Build batch for ItemWarehouseStock + ItemPrice upsert */
  private buildUpsertsFromGrn(rows: LineRow[]) {
    const updatedBy = localStorage.getItem('id') || undefined;
    return rows.map(r => ({
      itemCode: String(r.itemCode || '').trim(),
      warehouseId: Number(r.warehouseId!),
      binId: r.binId ?? null,
      strategyId: r.strategyId ?? null,
      qtyDelta: Number(r.qtyReceived || 0),
      batchFlag: !!r.batchSerial,
      serialFlag: false,
      supplierId: r.supplierId ?? this.currentSupplierId ?? null,
      price: this.getNumberOrNull(r.unitPrice),
      barcode: r.barcode ?? null,
      remarks: r.remarks ?? null,
      updatedBy
    } as UpdateWarehouseAndSupplierPriceDto));
  }

  private postOneRowToInventory(row: any, originalIndex: number) {
    if (!row?.itemCode) {
      Swal.fire('Missing item', 'Item code not found.', 'warning');
      return;
    }
    if (!row?.warehouseId) {
      Swal.fire('Missing warehouse', 'Select a warehouse before posting.', 'warning');
      return;
    }
    const qty = Number(row?.qtyReceived || 0);
    if (!Number.isFinite(qty) || qty <= 0) {
      Swal.fire('Quantity required', 'Enter a received quantity > 0.', 'warning');
      return;
    }

    const applyReq: ApplyGrnRequest = {
      grnNo: this.generatedGRN?.grnNo || '',
      receptionDate: this.receiptDate || new Date(),
      updatedBy: (localStorage.getItem('id') || ''),
      lines: [{
        itemCode: String(row.itemCode || '').trim(),
        supplierId: row.supplierId ?? this.currentSupplierId ?? null,
        warehouseId: Number(row.warehouseId),
        binId: row.binId ?? null,
        strategyId: row.strategyId ?? null,
        qtyDelta: qty,
        batchFlag: !!row.batchSerial,
        serialFlag: false,
        barcode: row.batchSerial ?? row.barcode ?? null,
        price: this.getNumberOrNull(row.unitPrice),
        remarks: row.remarks ?? null
      } as ApplyGrnLine]
    };

    const upsert: UpdateWarehouseAndSupplierPriceDto = {
      itemCode: String(row.itemCode || '').trim(),
      warehouseId: Number(row.warehouseId),
      binId: row.binId ?? null,
      strategyId: row.strategyId ?? null,
      qtyDelta: qty,
      batchFlag: !!row.batchSerial,
      serialFlag: false,
      supplierId: row.supplierId ?? this.currentSupplierId ?? null,
      price: this.getNumberOrNull(row.unitPrice),
      barcode: row.batchSerial ?? row.barcode ?? null,
      remarks: row.remarks ?? null,
      updatedBy: (localStorage.getItem('id') || undefined)
    };

    this.inventoryService.applyGrnToInventory(applyReq).subscribe({
      next: () => {
        this.inventoryService.batchUpdateWarehouseAndSupplierPrice([upsert]).subscribe({
          next: () => {
            const alertReq = {
              ItemCode: String(row.itemCode || '').trim(),
              warehouseId: row.warehouseId,
              binId: row.binId,
              supplierId: row.supplierId,
              receivedQty: row.qtyReceived,
              updatedBy: localStorage.getItem('id')
            };

            this.purchaseGoodReceiptService.applyGrnAndUpdateSalesOrder(alertReq).subscribe({
              next: () => {
                this.updateRowAndPersist(
                  originalIndex,
                  { isPostInventory: true, isFlagIssue: false, flagIssueId: 0 },
                  () => {
                    Swal.fire('Posted', 'Row posted to inventory & PurchaseAlert updated.', 'success');
                    this.router.navigate(['/purchase/list-Purchasegoodreceipt']);
                  }
                );
              },
              error: (err) => {
                console.error('SalesOrder/PurchaseAlert update failed', err);
                Swal.fire('Partial', 'Inventory updated but PurchaseAlert update failed.', 'warning');
              }
            });
          },
          error: (err) => {
            console.error('Price/warehouse upsert failed', err);
            Swal.fire('Partial', 'Stock updated but price/warehouse upsert failed. Retry from this screen.', 'warning');
          }
        });
      },
      error: (err) => {
        console.error('Apply GRN to inventory failed', err);
        Swal.fire('Failed', 'Could not post this row to inventory.', 'error');
      }
    });
  }

  /* ====== Flag Issues ====== */
  loadFlagIssues() {
    this.flagIssuesService.getAllFlagIssue().subscribe({
      next: (res: any) => { this.flagIssuesList = res?.data || []; },
      error: (err) => console.error('Flag issues load failed', err)
    });
  }

  openFlagIssuesModal() {
    this.loadFlagIssues();
    this.selectedFlagIssueId = null;
    this.flagModal.open = true;
    document.body.style.overflow = 'hidden';
    setTimeout(() => feather.replace(), 0);
  }

  closeFlagIssuesModal() {
    this.flagModal.open = false;
    document.body.style.overflow = '';
  }

  private updateRowAndPersist(
    originalIndex: number,
    changes: { isFlagIssue?: boolean; isPostInventory?: boolean; flagIssueId?: number | null },
    onSuccess?: () => void
  ) {
    if (!this.generatedGRN?.id) return;

    const prevRows = JSON.parse(JSON.stringify(this.generatedGRN.grnJson || []));
    const rows = (this.generatedGRN.grnJson || []).map((r: any, i: number) =>
      i === originalIndex
        ? {
            ...r,
            isFlagIssue: Object.prototype.hasOwnProperty.call(changes, 'isFlagIssue')
              ? !!changes.isFlagIssue
              : !!r.isFlagIssue,
            isPostInventory: Object.prototype.hasOwnProperty.call(changes, 'isPostInventory')
              ? !!changes.isPostInventory
              : !!r.isPostInventory,
            flagIssueId: Object.prototype.hasOwnProperty.call(changes, 'flagIssueId')
              ? (changes.flagIssueId ?? null)
              : (r.flagIssueId ?? null)
          }
        : r
    );

    this.generatedGRN = { ...this.generatedGRN, grnJson: rows };

    const receptionDateValue = this.receiptDate ? new Date(this.receiptDate) : new Date();

    const body: any = {
      id: this.generatedGRN.id,
      GrnNo: this.generatedGRN.grnNo || '',
      GRNJSON: JSON.stringify(rows),
      ReceptionDate: receptionDateValue
    };

    const anySvc: any = this.purchaseGoodReceiptService as any;

    const call$ =
      typeof anySvc.UpdateFlagIssues === 'function'
        ? anySvc.UpdateFlagIssues(body)
        : typeof anySvc.updateGRN === 'function'
          ? anySvc.updateGRN({
              ...body,
              grnNo: body.GrnNo,
              grnJson: body.GRNJSON,
              receptionDate: body.ReceptionDate
            })
          : null;

    if (!call$) return;

    call$.subscribe({
      next: () => { if (onSuccess) onSuccess(); },
      error: (err) => {
        this.generatedGRN = { ...this.generatedGRN!, grnJson: prevRows };
        console.error('Update failed', err);
        alert('Update failed: ' + (err?.error?.message || err?.message || 'Bad Request'));
      }
    });
  }

  /* ====== Click handlers (use ORIGINAL index always) ====== */
  onPostInventoryRow(row: any, originalIndex: number) {
    this.postOneRowToInventory(row, originalIndex);
  }

  onFlagIssuesRow(row: any, originalIndex: number) {
    this.selectedRowForFlagIndex = originalIndex;
    this.openFlagIssuesModal();
  }

  submitFlagIssue() {
    if (this.selectedRowForFlagIndex == null || !this.selectedFlagIssueId) return;
    const originalIndex = this.selectedRowForFlagIndex;

    this.updateRowAndPersist(originalIndex, { isFlagIssue: true, isPostInventory: false, flagIssueId: this.selectedFlagIssueId }, () => {
      Swal.fire('Flagged', 'Row flagged successfully.', 'warning');
      this.closeFlagIssuesModal();
      this.selectedRowForFlagIndex = null;
      if (this.isEditMode) this.goToDebitNoteList();
    });
  }

  /* ========= EDIT TABLE SOURCE (KEEP ORIGINAL INDEX) ========= */
  get editRowsWithIndex(): Array<{ row: any; idx: number }> {
    const list = (this.generatedGRN?.grnJson ?? []);
    return list
      .map((r: any, idx: number) => ({ row: r, idx }))
      .filter(x => !x.row?.isPostInventory);
  }

  get hiddenPostedCount(): number {
    return (this.generatedGRN?.grnJson ?? []).reduce((n, r: any) => n + (r?.isPostInventory ? 1 : 0), 0);
  }

  /* ================= Purchase Orders ================= */
  loadPOs() {
    const anySvc: any = this.purchaseorderService as any;
    const obs$ =
      typeof this.purchaseorderService.getPODetailswithGRN === 'function'
        ? this.purchaseorderService.getPODetailswithGRN()
        : typeof anySvc.getAllPurchaseOrder === 'function'
          ? anySvc.getAllPurchaseOrder()
          : null;

    if (!obs$) {
      console.error('PurchaseOrderService missing getPODetailswithGRN()/getAllPurchaseOrder()');
      return;
    }

    obs$.subscribe({
      next: (res: any) => {
        const list = Array.isArray(res?.data) ? res.data : res;
        this.purchaseOrder = (list || []).map((p: any) => ({
          id: p.id ?? p.Id,
          purchaseOrderNo: p.purchaseOrderNo ?? p.PurchaseOrderNo,
          supplierId: p.supplierId ?? p.SupplierId,
          supplierName: p.supplierName ?? p.SupplierName,
          poLines: p.poLines ?? p.PoLines,
          poDate: p.poDate ?? p.PoDate,
          deliveryDate: p.deliveryDate ?? p.DeliveryDate
        }));
      },
      error: (err) => console.error('Error loading POs', err)
    });
  }

  onPOChange(selectedId: number | null) {
    if (!selectedId) {
      this.resetForm();
      this.isPoDateDisabled = false;
      return;
    }

    const po = this.purchaseOrder.find(p => p.id === selectedId);
    if (!po) {
      this.resetForm();
      this.isPoDateDisabled = false;
      return;
    }

    if (po.poDate) {
      const dt = new Date(po.poDate);
      if (!isNaN(+dt)) {
        this.receiptDate = this.toDateInput(dt);
        this.isPoDateDisabled = true;
      } else {
        this.isPoDateDisabled = false;
      }
    } else {
      this.isPoDateDisabled = false;
    }

    this.currentSupplierId = this.toNum(po.supplierId);

    this.loadSupplierById(this.currentSupplierId ?? 0).subscribe((name: string) => {
      this.currentSupplierName = name || po.supplierName || '';
      this.buildRowsFromPo(po, this.currentSupplierId, this.currentSupplierName);
    });
  }

  /* ================= Supplier Helper ================= */
  private loadSupplierById(id: number) {
    if (!id) return of('' as string);
    return this._SupplierService.getSupplierById(id).pipe(
      map((api: any) => api?.data?.name ?? api?.data?.supplierName ?? api?.name ?? api?.supplierName ?? ''),
      catchError(() => of(''))
    );
  }

  /* ================= Build rows from PO ================= */
  private buildRowsFromPo(
    po: { poLines?: string },
    supplierId: number | null,
    supplierName: string
  ) {
    let lines: any[] = [];
    try { lines = po.poLines ? JSON.parse(po.poLines) : []; } catch { lines = []; }
    if (!lines.length) { lines = [{}]; }

    this.grnRows = lines.map(line => {
      const itemText = String(line?.item || '').trim();
      const itemCode = this.extractItemCode(itemText);

      const unitPrice =
        this.getNumberOrNull(line?.unitPrice) ??
        this.getNumberOrNull(line?.UnitPrice) ??
        this.getNumberOrNull(line?.price) ??
        null;

      const barcode = line?.barcode ?? line?.Barcode ?? null;

      return {
        itemText,
        itemCode,
        supplierId,
        supplierName,
        warehouseId: null,
        binId: null,
        warehouseName: null,
        binName: null,
        strategyId: null,
        strategyName: null,
        qtyReceived: null,
        qualityCheck: 'notverify',
        batchSerial: '',
        unitPrice,
        barcode,
        storageType: 'Chilled',
        surfaceTemp: '',
        expiry: '',
        pestSign: 'No',
        drySpillage: 'No',
        odor: 'No',
        plateNumber: '',
        defectLabels: 'No',
        damagedPackage: 'No',
        time: '',
        initial: this.currentUsername,
        remarks: '',
        createdAt: new Date(),
        photos: [],
        isFlagIssue: false,
        isPostInventory: false,
        flagIssueId: null
      } as LineRow;
    });
  }

  private extractItemCode(itemText: string): string {
    const m = String(itemText).match(/^\s*([A-Za-z0-9_-]+)/);
    return m ? m[1] : '';
  }

  /* =================== Warehouse/Bin helpers =================== */
  onWarehouseChange(row: LineRow) {
    if (row.warehouseId) this.loadBins$(row.warehouseId).subscribe();

    const valid = this.getBins(row.warehouseId).some(b => b.id === row.binId);
    if (!valid) row.binId = null;

    row.warehouseName = this.lookupWarehouseName(row.warehouseId);
    row.binName = this.lookupBinName(row.binId);
  }

  getBins(warehouseId: number | null | undefined) {
    if (!warehouseId) return [];
    return this.binsByWarehouse[warehouseId] ?? [];
  }

  lookupWarehouseName(id?: number | null) {
    if (!id) return '';
    return this.warehouses.find(w => w.id === id)?.name ?? '';
  }

  lookupBinName(id?: number | null) {
    if (!id) return '';
    for (const list of Object.values(this.binsByWarehouse)) {
      const found = list.find(b => b.id === id);
      if (found) return found.binName;
    }
    return '';
  }

  lookupStrategyName(id?: number | null): string {
    if (!id) return '';
    return this.strategies.find(s => s.id === id)?.name ?? '';
  }

  /* ================= Loaders (OBSERVABLE versions) ================= */
  private loadWarehouses$(): Observable<void> {
    return this.warehouseService.getWarehouse().pipe(
      tap((res: any) => {
        const arr = res?.data ?? res ?? [];
        this.warehouses = arr.map((w: any) => ({
          id: Number(w.id ?? w.Id),
          name: String(w.name ?? w.warehouseName ?? w.WarehouseName ?? '')
        })).filter((w: any) => !!w.id && !!w.name);
      }),
      map(() => void 0),
      catchError(err => {
        console.error('Warehouses load failed', err);
        return of(void 0);
      })
    );
  }

  private loadStrategy$(): Observable<void> {
    return this.strategyService.getStrategy().pipe(
      tap((res: any) => {
        const data = res?.data ?? res ?? [];
        this.strategies = data.map((s: any) => ({
          id: Number(s.id ?? s.strategyId ?? s.Id),
          name: String(s.name ?? s.strategyName ?? s.StrategyName ?? '')
        })).filter((x: any) => !!x.id && !!x.name);
      }),
      map(() => void 0),
      catchError(err => {
        console.error('Strategy load failed', err);
        return of(void 0);
      })
    );
  }

  private loadBins$(warehouseId: number): Observable<void> {
    if (!warehouseId) return of(void 0);
    if (this.binsByWarehouse[warehouseId]) return of(void 0);

    return this.stockadjustmentService.GetBinDetailsbywarehouseID(warehouseId).pipe(
      tap((res: any) => {
        const list = (res?.data ?? []).map((b: any) => ({
          id: Number(b.id ?? b.binId ?? b.BinId),
          binName: String(b.binName ?? b.name ?? b.bin ?? '')
        }));
        this.binsByWarehouse[warehouseId] = list;
      }),
      map(() => void 0),
      catchError(err => {
        console.error('Error loading bins for warehouse', warehouseId, err);
        return of(void 0);
      })
    );
  }

  /* ================= Utils ================= */
  resetForm() {
    this.selectedPO = null;
    this.receiptDate = '';
    this.isPoDateDisabled = false;
    this.overReceiptTolerance = 0;
    this.currentSupplierId = null;
    this.currentSupplierName = '';
    this.showSummary = false;
    this.generatedGRN = null;

    this.grnRows = [
      {
        itemText: '', itemCode: '',
        supplierId: null, supplierName: '',
        warehouseId: null, binId: null, warehouseName: null, binName: null,
        strategyId: null, strategyName: null,
        qtyReceived: null,
        qualityCheck: '',
        batchSerial: '',
        unitPrice: null,
        barcode: null,
        storageType: '', surfaceTemp: '', expiry: '',
        pestSign: '', drySpillage: '', odor: '',
        plateNumber: '', defectLabels: '', damagedPackage: '',
        time: '',
        initial: this.currentUsername,
        remarks: '',
        createdAt: new Date(), photos: [],
        isFlagIssue: false, isPostInventory: false, flagIssueId: null
      }
    ];
  }

  trackByIndex = (i: number) => i;

  private toDateInput(d: any): string {
    const dt = new Date(d);
    if (isNaN(+dt)) return '';
    const yyyy = dt.getFullYear();
    const mm = String(dt.getMonth() + 1).padStart(2, '0');
    const dd = String(dt.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
  }

  private toNum(v: any): number | null {
    const n = Number(v);
    return Number.isFinite(n) && n > 0 ? n : null;
  }

  private coerceNumberOrNull(v: any): number | null {
    const n = Number(v);
    return Number.isFinite(n) ? n : null;
  }

  private coerceQuality(v: any): 'pass' | 'fail' | 'notverify' | '' {
    const t = String(v ?? '').toLowerCase().trim();
    if (t === 'pass' || t === 'fail' || t === 'notverify') return t;
    if (t === 'not verify' || t === 'not_verified' || t === 'not-verify') return 'notverify';
    return '';
  }

  private getNumberOrNull(v: any): number | null {
    const n = Number(v);
    return Number.isFinite(n) ? n : null;
  }

  /* ===== Summary after create (no ng-select needed but keep correct names) ===== */
  private loadSummaryForCreate(id: number) {
    this.purchaseGoodReceiptService.getByIdGRN(id).subscribe({
      next: (res: any) => {
        const data = res?.data ?? res;

        const poid = this.toNum(data?.poid ?? data?.POId);
        this.selectedPO = poid;

        const rec = data?.receptionDate ?? data?.ReceptionDate ?? data?.Reception_Date;
        this.receiptDate = rec ? this.toDateInput(rec) : this.toDateInput(new Date());
        this.overReceiptTolerance = Number(data?.overReceiptTolerance ?? data?.OverReceiptTolerance ?? 0);

        this.currentSupplierId = this.toNum(data?.supplierId ?? data?.SupplierId);

        let rows: any[] = [];
        try {
          const raw = data?.grnJson ?? data?.GRNJSON ?? '[]';
          rows = Array.isArray(raw) ? raw : JSON.parse(raw);
        } catch { rows = []; }

        const rowsCoerced = rows.map((r: any) => {
          const warehouseId = this.toNum(r?.warehouseId);
          const binId = this.toNum(r?.binId);
          const strategyId = this.toNum(r?.strategyId);
          return {
            ...r,
            warehouseId,
            binId,
            strategyId,
            warehouseName: r?.warehouseName ?? this.lookupWarehouseName(warehouseId),
            binName: r?.binName ?? this.lookupBinName(binId),
            strategyName: r?.strategyName ?? this.lookupStrategyName(strategyId),
            qtyReceived: this.coerceNumberOrNull(r?.qtyReceived),
            qualityCheck: this.coerceQuality(r?.qualityCheck),
            batchSerial: r?.batchSerial ?? '',
            expiry: r?.expiry ? this.toDateInput(r.expiry) : '',
            unitPrice: this.getNumberOrNull(r?.unitPrice),
            barcode: r?.barcode ?? null,
            isFlagIssue: !!r?.isFlagIssue,
            isPostInventory: !!r?.isPostInventory,
            flagIssueId: r?.flagIssueId ?? null,
            initial: r?.initial || this.currentUsername
          };
        });

        this.generatedGRN = {
          id: data?.id,
          grnNo: data?.grnNo,
          poid: data?.poid ?? data?.POId,
          poNo: '',
          grnJson: rowsCoerced
        };

        this.cdRef.detectChanges();
      },
      error: (err) => console.error('Create Summary load failed', err)
    });
  }

  /* ===================== EDIT MODE (FULL FIX) ===================== */
  private loadForEdit(id: number) {
    this.purchaseGoodReceiptService.getByIdGRN(id).subscribe({
      next: (res: any) => {
        const data = res?.data ?? res;

        const poid = this.toNum(data?.poid ?? data?.POId);
        this.selectedPO = poid;

        const rec = data?.receptionDate ?? data?.ReceptionDate ?? data?.Reception_Date;
        this.receiptDate = rec ? this.toDateInput(rec) : this.toDateInput(new Date());
        this.overReceiptTolerance = Number(data?.overReceiptTolerance ?? data?.OverReceiptTolerance ?? 0);

        this.currentSupplierId = this.toNum(data?.supplierId ?? data?.SupplierId);

        let rows: any[] = [];
        try {
          const raw = data?.grnJson ?? data?.GRNJSON ?? '[]';
          rows = Array.isArray(raw) ? raw : JSON.parse(raw);
        } catch { rows = []; }
        if (!rows.length) rows = [{}];

        // Supplier name mapping
        const ids = new Set<number>();
        rows.forEach(r => { const rid = this.toNum(r?.supplierId); if (rid) ids.add(rid); });
        if (this.currentSupplierId) ids.add(this.currentSupplierId);

        const lookups: Observable<[number, string]>[] = Array.from(ids).map(idNum =>
          this._SupplierService.getSupplierById(idNum).pipe(
            map((api: any) => api?.data?.name ?? api?.data?.supplierName ?? api?.name ?? api?.supplierName ?? ''),
            catchError(() => of(''))
          ).pipe(map(name => [idNum, name] as [number, string]))
        );

        forkJoin(lookups.length ? lookups : [of([0, ''] as [number, string])]).subscribe({
          next: (pairs) => {
            this.supplierNameMap = new Map<number, string>(pairs.filter(p => !!p[0]));

            if (!this.currentSupplierId && this.selectedPO) {
              const po = this.purchaseOrder.find(p => p.id === this.selectedPO);
              if (po?.supplierId) this.currentSupplierId = po.supplierId;
            }
            this.currentSupplierName = this.currentSupplierId ? (this.supplierNameMap.get(this.currentSupplierId) || '') : '';

            // Coerce rows
            const rowsWithNames = rows.map((r: any) => {
              const rid = this.toNum(r?.supplierId) ?? this.currentSupplierId ?? null;

              const supplierName =
                r?.supplierName ||
                (rid ? (this.supplierNameMap.get(rid) || '') : '') ||
                this.currentSupplierName || '';

              const warehouseId = this.toNum(r?.warehouseId);
              const binId = this.toNum(r?.binId);
              const strategyId = this.toNum(r?.strategyId);

              return {
                ...r,
                supplierId: rid,
                supplierName,
                warehouseId,
                binId,
                strategyId,

                // names fallback
                warehouseName: r?.warehouseName ?? this.lookupWarehouseName(warehouseId),
                binName: r?.binName ?? this.lookupBinName(binId),
                strategyName: r?.strategyName ?? this.lookupStrategyName(strategyId),

                qtyReceived: this.coerceNumberOrNull(r?.qtyReceived),
                qualityCheck: this.coerceQuality(r?.qualityCheck),
                batchSerial: r?.batchSerial ?? '',
                expiry: r?.expiry ? this.toDateInput(r.expiry) : '',
                unitPrice: this.getNumberOrNull(r?.unitPrice),
                barcode: r?.barcode ?? null,

                isFlagIssue: !!r?.isFlagIssue,
                isPostInventory: !!r?.isPostInventory,
                flagIssueId: r?.flagIssueId ?? null,
                initial: r?.initial || this.currentUsername
              };
            });

            // ✅ CRITICAL: Load bins for all warehouses BEFORE assigning generatedGRN
            const whIds = Array.from(new Set(
              rowsWithNames.map(r => Number(r.warehouseId)).filter(Boolean)
            ));

            forkJoin(whIds.map(wid => this.loadBins$(wid))).subscribe({
              next: () => {
                // Now all items exist -> ng-select will show selected values
                this.generatedGRN = {
                  id: data?.id,
                  grnNo: data?.grnNo,
                  poid: data?.poid ?? data?.POId,
                  poNo: '',
                  grnJson: rowsWithNames
                };

                // optional PO no
                const poId = Number(this.generatedGRN.poid);
                if (poId) {
                  this.purchaseorderService.getPOById(poId).subscribe({
                    next: (poRes: any) => {
                      const po = poRes?.data ?? poRes;
                      const poNo =
                        po?.purchaseOrderNo ?? po?.PurchaseOrderNo ??
                        po?.[0]?.purchaseOrderNo ?? po?.[0]?.PurchaseOrderNo ?? '';
                      this.generatedGRN = { ...this.generatedGRN!, poNo };
                      this.cdRef.detectChanges();
                    },
                    error: (err) => console.error('Failed to load PO by id', err)
                  });
                }

                this.cdRef.detectChanges();
              },
              error: err => {
                console.error('Bins load failed', err);
                // even if bins fail, still set data
                this.generatedGRN = { id: data?.id, grnNo: data?.grnNo, poid: data?.poid ?? data?.POId, poNo: '', grnJson: rowsWithNames };
                this.cdRef.detectChanges();
              }
            });
          },
          error: (err) => console.error('Supplier lookup failed', err)
        });
      },
      error: (err) => console.error('Edit load failed', err)
    });
  }

  // keep simple compare if you ever need it
  byId(a: any, b: any) { return Number(a) === Number(b); }
}
