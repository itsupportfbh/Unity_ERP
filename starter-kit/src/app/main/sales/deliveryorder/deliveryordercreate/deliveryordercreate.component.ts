import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import Swal from 'sweetalert2';

import { DeliveryOrderService } from '../deliveryorder.service';
import { VehicleService } from 'app/main/master/vehicle/vehicle.service';
import { DriverService } from 'app/main/master/driver/driver.service';
import { SalesOrderService } from '../../sales-order/sales-order.service';
import { UomService } from 'app/main/master/uom/uom.service';

/* ---------- local types ---------- */

type SoBrief = { id: number; salesOrderNo: string; customerName?: string };
type Driver  = { id: number; name: string; mobileNumber: string };
type Vehicle = { id: number; vehicleNo: string; vehicleType?: string };
type UomRow  = { id: number; name: string };

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
  deliveryDate: string | null; // ISO
  isPosted: boolean | number;  // 0/1 or bool
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
  deliveryDate: string | null;
};

@Component({
  selector: 'app-deliveryordercreate',
  templateUrl: './deliveryordercreate.component.html',
  styleUrls: ['./deliveryordercreate.component.scss']
})
export class DeliveryordercreateComponent implements OnInit {

  // mode
  isEdit = false;
  doId: number | null = null;
  isPosted = false;

  // lookups
  soList: SoBrief[] = [];
  driverList: Driver[] = [];
  vehicleList: Vehicle[] = [];

  // UOM map
  uoms: UomRow[] = [];
  uomMap = new Map<number, string>();

  // header selections
  selectedSoId: number | null = null;
  driverId: number | null = null;
  vehicleId: number | null = null;
  deliveryDate: string | null = null; // yyyy-MM-dd
  routeText: string | null = null;

  // create-mode lines
  soLines: UiSoLine[] = [];
  totalDeliverQty = 0;

  // edit-mode lines
  editLines: DoLineDto[] = [];
  totalEditQty = 0;

  // re-delivery
  redeliveryRows: SoRedeliveryRow[] = [];
  totalPending = 0;
  totalDeliverMore = 0;

  today = this.toDateInput(new Date());

  driverMobileNo: string = '';
  receivedPersonName: string = '';
  receivedPersonMobileNo: string = '';

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private vehicleSrv: VehicleService,
    private driverSrv: DriverService,
    private soSrv: SalesOrderService,
    private doSrv: DeliveryOrderService,
    private uomService: UomService
  ) {}

  /* ---------------- Lifecycle ---------------- */
  ngOnInit(): void {
    this.detectMode();
    this.loadUoms();
    this.loadDropdowns();
    if (this.isEdit && this.doId) this.loadForEdit(this.doId);
  }

  private detectMode() {
    const idStr = this.route.snapshot.paramMap.get('id');
    this.isEdit = !!idStr;
    this.doId = idStr ? +idStr : null;
  }

  /* ---------------- UOMs ---------------- */
  private loadUoms() {
    this.uomService.getAllUom().subscribe((res: any) => {
      const arr = res?.data ?? res ?? [];
      this.uoms = arr.map((u: any) => ({
        id: Number(u.id ?? u.Id),
        name: String(u.name ?? u.Name ?? '').trim()
      }));
      this.uomMap.clear();
      for (const u of this.uoms) this.uomMap.set(u.id, u.name);
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

    // SO list (status=2 only)
    this.soSrv.getSOByStatus(2).subscribe((res: any) => {
      const arr = res?.data ?? res ?? [];
      this.soList = (arr || []).map((r: any) => ({
        id: Number(r.id ?? r.Id),
        salesOrderNo: String(r.salesOrderNo ?? r.SalesOrderNo ?? r.soNumber ?? ''),
        customerName: String(r.customerName ?? r.CustomerName ?? '')
      }));

      // ✅ FIX: if edit mode selected SO not in list, fetch it and add
      if (this.isEdit && this.selectedSoId) {
        this.ensureSelectedSoInList(this.selectedSoId);
      }
    });

    // Drivers
    this.driverSrv.getAllDriver().subscribe((res: any) => {
      const arr = res?.data ?? res ?? [];
      this.driverList = arr.map((r: any) => ({
        id: Number(r.id ?? r.Id),
        name: String(r.name ?? r.Name ?? r.driverName ?? ''),
        mobileNumber: String(r.mobileNumber ?? r.mobileNumber ?? '')
      }));
    });

    // Vehicles
    this.vehicleSrv.getVehicles().subscribe((res: any) => {
      const arr = res?.data ?? res ?? [];
      this.vehicleList = arr.map((r: any) => ({
        id: Number(r.id ?? r.Id),
        vehicleNo: String(r.vehicleNo ?? r.VehicleNo ?? r.vehicleNumber ?? ''),
        vehicleType: r.vehicleType ?? r.VehicleType ?? null
      }));
    });
  }

  /* ---------------- IMPORTANT FIX ----------------
     Edit mode-la selected SO list-la illa na,
     getSOById call pannitu soList-la add pannum,
     appuram ng-select label show aagum.
  -------------------------------------------------- */
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
        customerName: String(dto.customerName ?? dto.CustomerName ?? '')
      };

      this.soList = [so, ...(this.soList || [])];

      // re-assign to trigger ng-select refresh
      this.selectedSoId = so.id;
    });
  }

  /* ---------------- Load for edit ---------------- */
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
      this.driverId     = hdr.driverId != null ? Number(hdr.driverId) : null;
      this.vehicleId    = hdr.vehicleId != null ? Number(hdr.vehicleId) : null;
      this.routeText    = hdr.routeName ?? null;
      this.deliveryDate = this.toDateInput(hdr.deliveryDate);
      this.isPosted     = !!(hdr.isPosted as any);
this.driverMobileNo = this.sanitizePhone((hdr as any).driverMobileNo ?? (hdr as any).DriverMobileNo ?? '');
this.receivedPersonName = String((hdr as any).receivedPersonName ?? (hdr as any).ReceivedPersonName ?? '');
this.receivedPersonMobileNo = this.sanitizePhone((hdr as any).receivedPersonMobileNo ?? (hdr as any).ReceivedPersonMobileNo ?? '');

      // ✅ Ensure SO label show in edit mode
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
    });
  }

  /* ---------------- Redelivery helpers ---------------- */
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
      return Swal.fire({ icon: 'info', title: 'Nothing to add', text: 'Enter Deliver More qty first.' });
    }

    let idx = 0, ok = 0, fail = 0;

    const next = () => {
      if (idx >= picks.length) {
        if (fail === 0) Swal.fire({ icon: 'success', title: 'Lines added', text: `${ok} line(s) added` });
        else Swal.fire({ icon: 'warning', title: 'Partial', text: `${ok} added, ${fail} failed` });
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

  /* ---------------- Create mode: SO change -> SO lines ---------------- */
onSoChanged(soId: number | null) {
  if (this.isEdit) return;

  this.soLines = [];
  this.totalDeliverQty = 0;

  // ✅ clear location when cleared
  if (!soId) {
    this.routeText = '';
    return;
  }

  this.soSrv.getSOById(soId).subscribe((res: any) => {
    const dto = res?.data ?? res ?? {};

    // ✅ LOCATION AUTO FILL (deliveryTo -> routeText)
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
  trackByLineId   = (_: number, row: { id: number }) => row.id;

  /* ---------------- Save (Create or Edit) ---------------- */
  saveDo() {
    if (!this.selectedSoId) {
      return Swal.fire({ icon: 'warning', title: 'Sales Order required' });
    }
    if (!this.deliveryDate || !this.driverId || !this.vehicleId) {
      return Swal.fire({ icon: 'warning', title: 'Fill Driver, Vehicle and Delivery Date' });
    }
    if (this.isPosted) return;

    if (!this.isEdit) {
      const anyQty = this.soLines.some(l => (Number(l.deliverQty) || 0) > 0);
      if (!anyQty) return Swal.fire({ icon: 'warning', title: 'Enter at least one deliver quantity' });

      const payload = {
        req: 'currentUserId',
        soId: this.selectedSoId,
        packId: null,
        driverId: this.driverId!,
        vehicleId: this.vehicleId!,
        routeName: (this.routeText || '').trim() || null,
        deliveryDate: this.deliveryDate,

        driverMobileNo: this.driverMobileNo || null,
        receivedPersonName: (this.receivedPersonName || '').trim() || null,
        receivedPersonMobileNo: this.receivedPersonMobileNo || null,

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
        driverId: this.driverId,
        vehicleId: this.vehicleId,
        routeName: (this.routeText || '').trim() || null,
        deliveryDate: this.deliveryDate
      };

      this.doSrv.updateHeader(this.doId!, payload).subscribe({
        next: () => Swal.fire({ icon: 'success', title: 'Header updated' }),
        error: () => Swal.fire({ icon: 'error', title: 'Failed to update header' })
      });
    }
  }

  /* ---------------- Remove line (edit mode) ---------------- */
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
