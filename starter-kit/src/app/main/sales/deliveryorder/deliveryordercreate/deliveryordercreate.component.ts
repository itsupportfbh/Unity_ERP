import {
  Component,
  OnInit,
  ViewChild,
  ElementRef,
  AfterViewChecked
} from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import Swal from 'sweetalert2';

import { DeliveryOrderService } from '../deliveryorder.service';
import { VehicleService } from 'app/main/master/vehicle/vehicle.service';
import { DriverService } from 'app/main/master/driver/driver.service';
import { SalesOrderService } from '../../sales-order/sales-order.service';
import { UomService } from 'app/main/master/uom/uom.service';
import { environment } from 'environments/environment';

/* ---------- local types ---------- */

type SoBrief = {
  id: number;
  salesOrderNo: string;
  customerName?: string;
  customerId?: number | null;
  isCashSales?: boolean;
};

type Driver  = { id: number; name: string; mobileNumber: string };
type Vehicle = { id: number; vehicleNo: string; vehicleType?: string };
type UomRow  = { id: number; name: string };

type DeliveryModeOption = {
  id: number;
  name: string;
};

type UiSoLine = {
  soLineId: number;
  itemId: number;
  itemName: string;
  uom: string;
  orderedQty: number;
  pendingQty: number;
  deliverQty: number;
  notes?: string | null;
  warehouseId?: number | null;
  binId?: number | null;
  supplierId?: number | null;
  available?: number | null;
};

type DoHeaderDto = {
  id: number;
  doNumber: string;
  status: number;
  soId: number | null;
  packId: number | null;
  driverId: number | null;
  vehicleId: number | null;
  routeName: string | null;
  deliveryDate: string | null;
  deliveryTime?: string | null;
  isPosted: boolean | number;
  modeOfDeliveryId?: number | null;
  driverMobileNo?: string | null;
  receivedPersonName?: string | null;
  receivedPersonMobileNo?: string | null;
  receivedSignature?: string | null;
};

type DoLineDto = {
  id: number;
  doId: number;
  soLineId: number | null;
  itemId: number | null;
  itemName: string;
  uom: string | null;
  uomId?: number | null;
  qty: number;
  notes: string | null;
  warehouseId?: number | null;
  binId?: number | null;
  supplierId?: number | null;
};

type SoRedeliveryRow = {
  soLineId: number;
  itemId: number | null;
  itemName: string;
  uom: string | null;
  ordered: number;
  deliveredBefore: number;
  deliveredOnThisDo: number;
  pending: number;
  deliverMore?: number;

  warehouseId?: string | null;
  binId?: string | null;
  supplierId?: string | null;
};

type DoUpdateHeaderRequest = {
  driverId: number | null;
  vehicleId: number | null;
  routeName: string | null;
  deliveryDate: Date | null;
  deliveryTime: string | null;
  modeOfDeliveryId: number | null;
  driverMobileNo?: string | null;
  receivedPersonName?: string | null;
  receivedPersonMobileNo?: string | null;
  receivedSignature?: string | null;
};

@Component({
  selector: 'app-deliveryordercreate',
  templateUrl: './deliveryordercreate.component.html',
  styleUrls: ['./deliveryordercreate.component.scss']
})
export class DeliveryordercreateComponent implements OnInit, AfterViewChecked {

  @ViewChild('signatureCanvas') signatureCanvas!: ElementRef<HTMLCanvasElement>;

  apiBaseUrl = (environment as any)?.apiUrl || '';

  // mode
  isEdit = false;
  doId: number | null = null;
  isPosted = false;

  // lookups
  soList: SoBrief[] = [];
  driverList: Driver[] = [];
  vehicleList: Vehicle[] = [];

  // UOM
  uoms: UomRow[] = [];
  uomMap = new Map<number, string>();

  // Mode of delivery
  deliveryModeList: DeliveryModeOption[] = [
    { id: 1, name: 'Delivery' },
    { id: 2, name: 'Self Collected' }
  ];

  modeOfDeliveryId: number = 1;

  // header
  selectedSoId: number | null = null;
  driverId: number | null = null;
  vehicleId: number | null = null;
  deliveryDate: Date | null = null;
  deliveryTime: string | null = null;
  routeText: string | null = null;

  // create-mode lines
  soLines: UiSoLine[] = [];
  totalDeliverQty = 0;

  // edit-mode lines
  editLines: DoLineDto[] = [];
  totalEditQty = 0;

  // redelivery
  redeliveryRows: SoRedeliveryRow[] = [];
  totalPending = 0;
  totalDeliverMore = 0;

  today = this.toDateInput(new Date());

  driverMobileNo: string = '';
  receivedPersonName: string = '';
  receivedPersonMobileNo: string = '';

  // this field stores either base64 OR relative path from backend
  receivedSignature: string | null = null;

  // signature modal
  showSignatureModal = false;
  private ctx!: CanvasRenderingContext2D;
  private isDrawing = false;
  private hasCanvasInitialized = false;
  private lastX = 0;
  private lastY = 0;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private vehicleSrv: VehicleService,
    private driverSrv: DriverService,
    private soSrv: SalesOrderService,
    private doSrv: DeliveryOrderService,
    private uomService: UomService
  ) {}

  ngOnInit(): void {
    this.detectMode();
    this.loadUoms();
    this.loadDropdowns();

    if (this.isEdit && this.doId) {
      this.loadForEdit(this.doId);
    }
  }

  ngAfterViewChecked(): void {
    if (this.showSignatureModal && this.signatureCanvas && !this.hasCanvasInitialized) {
      this.initCanvas();
      this.hasCanvasInitialized = true;

      if (this.receivedSignature && this.receivedSignature.startsWith('data:image')) {
        this.loadSignatureToCanvas(this.receivedSignature);
      }
    }
  }

  get receivedSignatureUrl(): string | null {
    if (!this.receivedSignature) return null;

    if (this.receivedSignature.startsWith('data:image')) {
      return this.receivedSignature;
    }

    if (this.receivedSignature.startsWith('http://') || this.receivedSignature.startsWith('https://')) {
      return this.receivedSignature;
    }

    if (!this.apiBaseUrl) {
      return this.receivedSignature;
    }

    return `${this.apiBaseUrl}${this.receivedSignature}`;
  }

  private detectMode() {
    const idStr = this.route.snapshot.paramMap.get('id');
    this.isEdit = !!idStr;
    this.doId = idStr ? +idStr : null;
  }

  /* ---------------- Signature ---------------- */

  openSignatureModal(): void {
    this.showSignatureModal = true;
    this.hasCanvasInitialized = false;
  }

  closeSignatureModal(): void {
    this.showSignatureModal = false;
  }

  private initCanvas(): void {
    const canvas = this.signatureCanvas?.nativeElement;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width || 680;
    canvas.height = rect.height || 260;

    const context = canvas.getContext('2d');
    if (!context) return;

    this.ctx = context;
    this.ctx.lineWidth = 2;
    this.ctx.lineCap = 'round';
    this.ctx.lineJoin = 'round';
    this.ctx.strokeStyle = '#1f2937';
    this.ctx.fillStyle = '#ffffff';
    this.ctx.fillRect(0, 0, canvas.width, canvas.height);
  }

  startSign(event: MouseEvent): void {
    if (!this.ctx) return;
    const pos = this.getMousePos(event);
    this.isDrawing = true;
    this.lastX = pos.x;
    this.lastY = pos.y;
  }

  moveSign(event: MouseEvent): void {
    if (!this.isDrawing || !this.ctx) return;

    const pos = this.getMousePos(event);
    this.ctx.beginPath();
    this.ctx.moveTo(this.lastX, this.lastY);
    this.ctx.lineTo(pos.x, pos.y);
    this.ctx.stroke();

    this.lastX = pos.x;
    this.lastY = pos.y;
  }

  startSignTouch(event: TouchEvent): void {
    event.preventDefault();
    if (!this.ctx) return;

    const pos = this.getTouchPos(event);
    this.isDrawing = true;
    this.lastX = pos.x;
    this.lastY = pos.y;
  }

  moveSignTouch(event: TouchEvent): void {
    event.preventDefault();
    if (!this.isDrawing || !this.ctx) return;

    const pos = this.getTouchPos(event);
    this.ctx.beginPath();
    this.ctx.moveTo(this.lastX, this.lastY);
    this.ctx.lineTo(pos.x, pos.y);
    this.ctx.stroke();

    this.lastX = pos.x;
    this.lastY = pos.y;
  }

  endSign(): void {
    this.isDrawing = false;
  }

  clearSignature(): void {
    const canvas = this.signatureCanvas?.nativeElement;
    if (!canvas || !this.ctx) return;

    this.ctx.clearRect(0, 0, canvas.width, canvas.height);
    this.ctx.fillStyle = '#ffffff';
    this.ctx.fillRect(0, 0, canvas.width, canvas.height);
  }

  saveSignature(): void {
    const canvas = this.signatureCanvas?.nativeElement;
    if (!canvas) return;

    this.receivedSignature = canvas.toDataURL('image/png');
    this.showSignatureModal = false;
  }

  removeSignature(): void {
    this.receivedSignature = null;
    this.showSignatureModal = false;
  }

  private loadSignatureToCanvas(dataUrl: string): void {
    if (!this.ctx || !this.signatureCanvas) return;

    const img = new Image();
    img.onload = () => {
      const canvas = this.signatureCanvas.nativeElement;
      this.ctx.clearRect(0, 0, canvas.width, canvas.height);
      this.ctx.fillStyle = '#ffffff';
      this.ctx.fillRect(0, 0, canvas.width, canvas.height);
      this.ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
    };
    img.src = dataUrl;
  }

  private getMousePos(event: MouseEvent): { x: number; y: number } {
    const canvas = this.signatureCanvas.nativeElement;
    const rect = canvas.getBoundingClientRect();
    return {
      x: event.clientX - rect.left,
      y: event.clientY - rect.top
    };
  }

  private getTouchPos(event: TouchEvent): { x: number; y: number } {
    const canvas = this.signatureCanvas.nativeElement;
    const rect = canvas.getBoundingClientRect();
    const touch = event.touches[0] || event.changedTouches[0];

    return {
      x: touch.clientX - rect.left,
      y: touch.clientY - rect.top
    };
  }

  /* ---------------- Mode of delivery ---------------- */

  isSelfMode(): boolean {
    return Number(this.modeOfDeliveryId) === 2;
  }

  onModeOfDeliveryChanged(): void {
    if (this.isSelfMode()) {
      this.driverId = null;
      this.vehicleId = null;
      this.driverMobileNo = '';
    }
  }

  canSaveHeader(): boolean {
    if (!this.selectedSoId) return false;
    if (!this.modeOfDeliveryId) return false;

    if (this.isSelfMode()) return true;

    return !!this.driverId && !!this.vehicleId;
  }

  /* ---------------- UOM ---------------- */

  private loadUoms() {
    this.uomService.getAllUom().subscribe((res: any) => {
      const arr = res?.data ?? res ?? [];
      this.uoms = arr.map((u: any) => ({
        id: Number(u.id ?? u.Id),
        name: String(u.name ?? u.Name ?? '').trim()
      }));

      this.uomMap.clear();
      for (const u of this.uoms) {
        this.uomMap.set(u.id, u.name);
      }
    });
  }

  uomLabel(uom: any): string {
    if (uom == null || uom === '') return '-';

    const n = Number(uom);
    if (!isNaN(n) && `${n}`.trim() === `${uom}`.trim()) {
      return this.uomMap.get(n) || `#${n}`;
    }

    return String(uom);
  }

  /* ---------------- Lookups ---------------- */

  private loadDropdowns() {
    this.soSrv.getSOByStatus(2).subscribe((res: any) => {
      const arr = res?.data ?? res ?? [];
      this.soList = (arr || []).map((r: any) => ({
        id: Number(r.id ?? r.Id),
        salesOrderNo: String(r.salesOrderNo ?? r.SalesOrderNo ?? r.soNumber ?? ''),
        customerName: String(r.customerName ?? r.CustomerName ?? ''),
        customerId: r.customerId != null ? Number(r.customerId ?? r.CustomerId) : null,
        isCashSales: !!(r.isCashSales ?? r.IsCashSales)
      }));

      if (this.isEdit && this.selectedSoId) {
        this.ensureSelectedSoInList(this.selectedSoId);
      }
    });

    this.driverSrv.getAllDriver().subscribe((res: any) => {
      const arr = res?.data ?? res ?? [];
      this.driverList = (arr || []).map((r: any) => ({
        id: Number(r.id ?? r.Id),
        name: String(r.name ?? r.Name ?? r.driverName ?? ''),
        mobileNumber: String(r.mobileNumber ?? r.MobileNumber ?? '')
      }));
    });

    this.vehicleSrv.getVehicles().subscribe((res: any) => {
      const arr = res?.data ?? res ?? [];
      this.vehicleList = (arr || []).map((r: any) => ({
        id: Number(r.id ?? r.Id),
        vehicleNo: String(r.vehicleNo ?? r.VehicleNo ?? r.vehicleNumber ?? ''),
        vehicleType: r.vehicleType ?? r.VehicleType ?? null
      }));
    });
  }

  private ensureSelectedSoInList(soId: number | null) {
    if (!soId) return;

    const exists = (this.soList || []).some(x => Number(x.id) === Number(soId));
    if (exists) return;

    this.soSrv.getSOById(soId).subscribe((res: any) => {
      const dto = res?.data ?? res;
      if (!dto) return;

      const so: SoBrief = {
        id: Number(dto.id ?? dto.Id),
        salesOrderNo: String(dto.salesOrderNo ?? dto.SalesOrderNo ?? dto.soNumber ?? ''),
        customerName: String(dto.customerName ?? dto.CustomerName ?? ''),
        customerId: dto.customerId != null ? Number(dto.customerId ?? dto.CustomerId) : null,
        isCashSales: !!(dto.isCashSales ?? dto.IsCashSales)
      };

      this.soList = [so, ...(this.soList || [])];
      this.selectedSoId = so.id;
    });
  }

  /* ---------------- Edit load ---------------- */

  private loadForEdit(id: number) {
    this.doSrv.get(id).subscribe((res: any) => {
      const hdr: DoHeaderDto = res?.data?.header ?? res?.header ?? res;
      const lines: DoLineDto[] = res?.data?.lines ?? res?.lines ?? [];

      if (!hdr) {
        Swal.fire({ icon: 'error', title: 'Delivery Order not found' });
        this.router.navigate(['/Sales/Delivery-order-list']);
        return;
      }

      this.selectedSoId = hdr.soId != null ? Number(hdr.soId) : null;
      this.driverId = hdr.driverId != null ? Number(hdr.driverId) : null;
      this.vehicleId = hdr.vehicleId != null ? Number(hdr.vehicleId) : null;
      this.routeText = hdr.routeName ?? null;
      this.deliveryDate = hdr.deliveryDate ? new Date(hdr.deliveryDate) : new Date();
      this.deliveryTime = this.normalizeTimeValue(
        (hdr as any).deliveryTime ?? (hdr as any).DeliveryTime ?? null
      );
      this.isPosted = !!(hdr.isPosted as any);

      this.modeOfDeliveryId = Number((hdr as any).modeOfDeliveryId ?? (hdr as any).ModeOfDeliveryId ?? 1);

      this.driverMobileNo = this.sanitizePhone((hdr as any).driverMobileNo ?? (hdr as any).DriverMobileNo ?? '');
      this.receivedPersonName = String((hdr as any).receivedPersonName ?? (hdr as any).ReceivedPersonName ?? '');
      this.receivedPersonMobileNo = this.sanitizePhone((hdr as any).receivedPersonMobileNo ?? (hdr as any).ReceivedPersonMobileNo ?? '');
      this.receivedSignature = (hdr as any).receivedSignature ?? (hdr as any).ReceivedSignature ?? null;

      this.ensureSelectedSoInList(this.selectedSoId);

      this.editLines = (lines || []).map(l => ({
        ...l,
        qty: Number(l.qty || 0),
        uom: l.uom ?? (l.uomId != null ? (this.uomMap.get(Number(l.uomId)) || String(l.uomId)) : null)
      }));

      this.recalcEditTotals();

      if (hdr.soId) {
        this.doSrv.getSoSnapshot(id).subscribe((rows: any[]) => {
          this.redeliveryRows = (rows || []).map(r => {
            const ordered = Number(r.ordered ?? r.Ordered ?? 0);
            const deliveredBefore = Number(r.deliveredBefore ?? r.DeliveredBefore ?? 0);
            const deliveredOnThisDo = Number(r.deliveredOnThisDo ?? r.DeliveredOnThisDo ?? 0);
            const pending = Math.max(ordered - (deliveredBefore + deliveredOnThisDo), 0);

            return {
              soLineId: Number(r.soLineId ?? r.SoLineId ?? 0),
              itemId: (r.itemId ?? r.ItemId) != null ? Number(r.itemId ?? r.ItemId) : null,
              itemName: String(r.itemName ?? r.ItemName ?? ''),
              uom: r.uomName ?? r.UomName ?? r.uom ?? r.Uom ?? null,
              ordered,
              deliveredBefore,
              deliveredOnThisDo,
              pending,
              deliverMore: 0,
              warehouseId: r.warehouseId ?? r.WarehouseId ?? null,
              binId: r.binId ?? r.BinId ?? null,
              supplierId: r.supplierId ?? r.SupplierId ?? null
            } as SoRedeliveryRow;
          });

          this.computeRedeliveryTotals();
        });
      }

      if (!this.isSelfMode() && this.driverId) {
        this.onDriverChanged(this.driverId);
      }
    });
  }

  /* ---------------- Redelivery ---------------- */

  computeRedeliveryTotals() {
    this.totalPending = this.redeliveryRows.reduce((s, x) => s + (Number(x.pending) || 0), 0);
    this.totalDeliverMore = this.redeliveryRows.reduce((s, x) => s + (Number(x.deliverMore) || 0), 0);
  }

  clampDeliverMore(row: SoRedeliveryRow) {
    const v = Number(row.deliverMore || 0);

    if (isNaN(v) || v < 0) row.deliverMore = 0;
    if (v > (row.pending || 0)) row.deliverMore = row.pending || 0;

    this.computeRedeliveryTotals();
  }

  addSelectedRedeliveries() {
    if (!this.isEdit || !this.doId || this.isPosted) return;

    const picks = this.redeliveryRows.filter(r => (Number(r.deliverMore) || 0) > 0);
    if (!picks.length) {
      return Swal.fire({
        icon: 'info',
        title: 'Nothing to add',
        text: 'Enter Deliver More qty first.'
      });
    }

    let idx = 0, ok = 0, fail = 0;

    const next = () => {
      if (idx >= picks.length) {
        if (fail === 0) {
          Swal.fire({ icon: 'success', title: 'Lines added', text: `${ok} line(s) added` });
        } else {
          Swal.fire({ icon: 'warning', title: 'Partial', text: `${ok} added, ${fail} failed` });
        }
        this.loadForEdit(this.doId!);
        return;
      }

      const r = picks[idx++];

      this.doSrv.addLine({
        doId: this.doId!,
        soLineId: r.soLineId,
        packLineId: null,
        itemId: r.itemId,
        itemName: r.itemName,
        uom: r.uom,
        qty: Number(r.deliverMore) || 0,
        notes: null,
        warehouseId: r.warehouseId ?? null,
        binId: r.binId ?? null,
        supplierId: r.supplierId ?? null
      }).subscribe({
        next: () => { ok++; next(); },
        error: () => { fail++; next(); }
      });
    };

    next();
  }

  /* ---------------- SO change ---------------- */

  onSoChanged(soId: number | null) {
    if (this.isEdit) return;

    this.soLines = [];
    this.totalDeliverQty = 0;

    if (!soId) {
      this.routeText = '';
      return;
    }

    this.soSrv.getSOById(soId).subscribe((res: any) => {
      const dto = res?.data ?? res ?? {};

      this.routeText = (dto.deliveryTo ?? '').toString();

      const lines = dto.lineItemsList ?? dto.lineItems ?? dto.lines ?? dto.items ?? [];

      this.soLines = (lines || []).map((l: any) => {
        const ordered = Number(l.quantity ?? l.orderedQty ?? l.qty ?? 0);
        const delivered = Number(l.deliveredQty ?? l.shippedQty ?? 0);
        const pending = Math.max(ordered - delivered, 0);

        return {
          soLineId: Number(l.id ?? l.soLineId ?? 0),
          itemId: Number(l.itemId ?? 0),
          itemName: String(l.itemName ?? ''),
          uom: String(l.uomName ?? l.uom ?? ''),
          orderedQty: ordered,
          pendingQty: pending || ordered,
          deliverQty: pending || ordered,
          notes: '',
          warehouseId: l.warehouseId ?? null,
          binId: l.binId ?? null,
          supplierId: l.supplierId ?? null,
          available: l.available ?? null
        } as UiSoLine;
      });

      this.recalcTotals();
    });
  }

  /* ---------------- Totals ---------------- */

  recalcTotals() {
    for (const l of this.soLines) {
      const v = Number(l.deliverQty ?? 0);
      if (isNaN(v) || v < 0) l.deliverQty = 0;
      if (l.deliverQty > l.pendingQty) l.deliverQty = l.pendingQty;
    }

    this.totalDeliverQty = this.soLines.reduce((s, x) => s + (Number(x.deliverQty) || 0), 0);
  }

  recalcEditTotals() {
    this.totalEditQty = this.editLines.reduce((s, x) => s + (Number(x.qty) || 0), 0);
  }

  trackBySoLineId = (_: number, row: UiSoLine | SoRedeliveryRow) => (row as any).soLineId;
  trackByLineId = (_: number, row: { id: number }) => row.id;

  /* ---------------- Save ---------------- */

  saveDo() {
    if (!this.selectedSoId) {
      return Swal.fire({ icon: 'warning', title: 'Sales Order required' });
    }

    if (!this.modeOfDeliveryId) {
      return Swal.fire({ icon: 'warning', title: 'Mode of Delivery required' });
    }

    if (!this.isSelfMode() && (!this.driverId || !this.vehicleId)) {
      return Swal.fire({ icon: 'warning', title: 'Fill Driver and Vehicle' });
    }

    if (this.isPosted) return;

    if (!this.isEdit) {
      const anyQty = this.soLines.some(l => (Number(l.deliverQty) || 0) > 0);
      if (!anyQty) {
        return Swal.fire({ icon: 'warning', title: 'Enter at least one deliver quantity' });
      }

      const payload = {
        req: 'currentUserId',
        soId: this.selectedSoId,
        packId: null,
        driverId: this.isSelfMode() ? null : this.driverId,
        vehicleId: this.isSelfMode() ? null : this.vehicleId,
        routeName: (this.routeText || '').trim() || null,
        deliveryDate: new Date(),
        deliveryTime: this.deliveryTime || null,
        modeOfDeliveryId: this.modeOfDeliveryId,
        driverMobileNo: this.isSelfMode() ? null : (this.driverMobileNo || null),
        receivedPersonName: (this.receivedPersonName || '').trim() || null,
        receivedPersonMobileNo: this.receivedPersonMobileNo || null,
        receivedSignature: this.receivedSignature || null,
        lines: this.soLines
          .filter(l => (Number(l.deliverQty) || 0) > 0)
          .map(l => ({
            soLineId: l.soLineId ?? null,
            packLineId: null,
            itemId: l.itemId ?? null,
            itemName: l.itemName || '',
            uom: (l.uom || '').toString(),
            qty: Number(l.deliverQty) || 0,
            notes: l.notes || null,
            warehouseId: l.warehouseId ?? null,
            binId: l.binId ?? null,
            supplierId: l.supplierId ?? null
          }))
      };
      console.log('DO payload =>', payload);

      this.doSrv.create(payload).subscribe({
        next: (res: any) => {
          const id = res?.data ?? res;
          Swal.fire({ icon: 'success', title: 'Delivery Order created', text: `DO #${id}` });
          this.router.navigate(['/Sales/Delivery-order-list']);
        },
        error: () => Swal.fire({ icon: 'error', title: 'Failed to create DO' })
      });

    } else {
      const payload: DoUpdateHeaderRequest = {
        driverId: this.isSelfMode() ? null : this.driverId,
        vehicleId: this.isSelfMode() ? null : this.vehicleId,
        routeName: (this.routeText || '').trim() || null,
        deliveryDate: this.deliveryDate,
        deliveryTime: this.deliveryTime || null,
        modeOfDeliveryId: this.modeOfDeliveryId,
        driverMobileNo: this.isSelfMode() ? null : (this.driverMobileNo || null),
        receivedPersonName: (this.receivedPersonName || '').trim() || null,
        receivedPersonMobileNo: this.receivedPersonMobileNo || null,
        receivedSignature: this.receivedSignature || null
      };

      this.doSrv.updateHeader(this.doId!, payload).subscribe({
        next: () => Swal.fire({ icon: 'success', title: 'Header updated' }),
        error: () => Swal.fire({ icon: 'error', title: 'Failed to update header' })
      });
    }
  }

  /* ---------------- Remove line ---------------- */

  removeEditLine(lineId: number) {
    if (!this.isEdit || this.isPosted) return;

    Swal.fire({
      icon: 'warning',
      title: 'Remove this line?',
      showCancelButton: true,
      confirmButtonText: 'Remove',
      confirmButtonColor: '#d33'
    }).then(result => {
      if (!result.isConfirmed) return;

      this.doSrv.removeLine(lineId).subscribe({
        next: () => this.loadForEdit(this.doId!),
        error: () => Swal.fire({ icon: 'error', title: 'Failed to remove line' })
      });
    });
  }

  /* ---------------- Utils ---------------- */

  resetForm(keepDropdowns = false) {
    if (!keepDropdowns) this.selectedSoId = null;

    this.driverId = null;
    this.vehicleId = null;
    this.routeText = null;
    this.deliveryDate = null;
    this.deliveryTime = null;
    this.modeOfDeliveryId = 1;

    this.soLines = [];
    this.editLines = [];
    this.redeliveryRows = [];

    this.totalDeliverQty = 0;
    this.totalEditQty = 0;
    this.totalPending = 0;
    this.totalDeliverMore = 0;

    this.isPosted = false;

    this.driverMobileNo = '';
    this.receivedPersonName = '';
    this.receivedPersonMobileNo = '';
    this.receivedSignature = null;

    this.showSignatureModal = false;
    this.hasCanvasInitialized = false;
  }

  private toDateInput(d: Date | string | null): string | null {
    if (!d) return null;

    const date = typeof d === 'string' ? new Date(d) : d;
    if (isNaN(date.getTime())) return null;

    const yyyy = date.getFullYear();
    const mm = String(date.getMonth() + 1).padStart(2, '0');
    const dd = String(date.getDate()).padStart(2, '0');

    return `${yyyy}-${mm}-${dd}`;
  }

  private normalizeTimeValue(val: any): string | null {
    if (val == null || val === '') return null;

    const s = String(val).trim();

    if (!s) return null;

    if (s.includes(':')) {
      const parts = s.split(':');
      const hh = (parts[0] || '00').padStart(2, '0');
      const mm = (parts[1] || '00').padStart(2, '0');
      return `${hh}:${mm}`;
    }

    return s.length >= 5 ? s.substring(0, 5) : s;
  }

  goDoList() {
    this.router.navigate(['/Sales/Delivery-order-list']);
  }

  onDriverChanged(id: any) {
    const d = (this.driverList || []).find(x => x.id == id);
    if (!d) {
      this.driverMobileNo = '';
      return;
    }
    this.driverMobileNo = this.sanitizePhone(d.mobileNumber);
  }

  sanitizePhone(val: any): string {
    return (val ?? '').toString().replace(/\D/g, '').slice(0, 15);
  }
}