import { Component, OnInit, ViewEncapsulation, AfterViewInit, AfterViewChecked } from '@angular/core';
import { Router } from '@angular/router';
import Swal from 'sweetalert2';
import * as feather from 'feather-icons';

// Services
import { DeliveryOrderService } from '../deliveryorder.service';
import { DriverService } from 'app/main/master/driver/driver.service';
import { VehicleService } from 'app/main/master/vehicle/vehicle.service';
import { ItemsService } from 'app/main/master/items/items.service';
import { UomService } from 'app/main/master/uom/uom.service';
import { Observable, of } from 'rxjs';

import { catchError, map } from 'rxjs/operators';
import { PeriodCloseService } from 'app/main/financial/period-close-fx/period-close-fx.service';

// -------- Types for rows/lines (UI) ----------
type DoRow = {
  id: number;
  doNumber: string;
  status: number;
  soId: number | null;
  salesOrderNo: string;
  packId: number | null;
  driverId: number | null;
  driverMobileNo?: string | null;
  receivedPersonName?: string | null;
  receivedPersonMobileNo?: string | null;
  vehicleId: number | null;
  routeName: string | null;
  deliveryDate: string | Date | null;
  isPosted: boolean | number;
};

type DoLineRow = {
  id: number;
  doId: number;
  soLineId: number | null;
  packLineId: number | null;
  itemId: number | null;
  itemName: string;
  uomId?: number | null;
  uom?: string | null;
  qty: number;
  notes?: string | null;
};

export interface PeriodStatusDto {
  isLocked: boolean;
  periodName?: string;
  periodCode?: string;
  startDate?: string;
  endDate?: string;
}

@Component({
  selector: 'app-deliveryorderlist',
  templateUrl: './deliveryorderlist.component.html',
  styleUrls: ['./deliveryorderlist.component.scss'],
  encapsulation: ViewEncapsulation.None
})
export class DeliveryorderlistComponent implements OnInit, AfterViewInit, AfterViewChecked {

  // table
  rows: DoRow[] = [];
  allRows: DoRow[] = [];
  selectedOption = 10;
  searchValue = '';

  // lookups
  driverMap  = new Map<number, string>();
  vehicleMap = new Map<number, string>();
  itemNameMap = new Map<number, string>();
  uomMap      = new Map<number, string>();

  // lines modal
  showLinesModal = false;
  activeDo: DoRow | null = null;
  modalLines: DoLineRow[] = [];
  modalTotalQty = 0;

  // period lock
  isPeriodLocked = false;
  currentPeriodName = '';

  constructor(
    private router: Router,
    private doSvc: DeliveryOrderService,
    private driverSvc: DriverService,
    private vehicleSvc: VehicleService,
    private itemsSvc: ItemsService,
    private uomSvc: UomService,
    private periodService: PeriodCloseService
  ) {}

  ngOnInit(): void {
    const today = new Date().toISOString().substring(0, 10);
    this.checkPeriodLockForDate(today);

    this.loadLookups();
    this.loadList();
  }

  ngAfterViewInit(): void { feather.replace(); }
  ngAfterViewChecked(): void { feather.replace(); }

  private checkPeriodLockForDate(dateStr: string): void {
    if (!dateStr) { return; }

    this.periodService.getStatusForDateWithName(dateStr).subscribe({
      next: (res: PeriodStatusDto | null) => {
        this.isPeriodLocked = !!res?.isLocked;
        this.currentPeriodName = res?.periodName || '';
      },
      error: () => {
        this.isPeriodLocked = false;
        this.currentPeriodName = '';
      }
    });
  }

  private showPeriodLockedSwal(action: string): void {
    Swal.fire(
      'Period Locked',
      this.currentPeriodName
        ? `Period "${this.currentPeriodName}" is locked. You cannot ${action} in this period.`
        : `Selected accounting period is locked. You cannot ${action}.`,
      'warning'
    );
  }

  // ---------------- Lookups ----------------
  private loadLookups(): void {
    this.driverSvc.getAllDriver().subscribe((res: any) => {
      const arr = res?.data ?? res ?? [];
      for (const r of arr) {
        const id = Number(r.id ?? r.Id);
        const name = String(r.name ?? r.Name ?? r.driverName ?? '').trim();
        if (id) this.driverMap.set(id, name);
      }
    });

    this.vehicleSvc.getVehicles().subscribe((res: any) => {
      const arr = res?.data ?? res ?? [];
      for (const r of arr) {
        const id = Number(r.id ?? r.Id);
        const no = String(r.vehicleNo ?? r.VehicleNo ?? r.vehicleNumber ?? '').trim();
        if (id) this.vehicleMap.set(id, no);
      }
    });

    this.itemsSvc.getAllItem().subscribe((res: any) => {
      const arr = res?.data ?? res ?? [];
      for (const r of arr) {
        const id = Number(r.id ?? r.itemId ?? 0);
        const name = String(r.itemName ?? r.name ?? '').trim();
        if (id) this.itemNameMap.set(id, name);
      }
    });

    this.uomSvc.getAllUom().subscribe((res: any) => {
      const arr = res?.data ?? res ?? [];
      for (const r of arr) {
        const id = Number(r.id ?? r.Id);
        const name = String(r.name ?? r.Name ?? '').trim();
        if (id) this.uomMap.set(id, name);
      }
    });
  }

  // ---------------- List ----------------
  private loadList(): void {
    this.doSvc.getAll().subscribe((res: any) => {
      const data = res?.data ?? res ?? [];

      this.allRows = data.map((d: any) => ({
        id: Number(d.id ?? d.Id),
        doNumber: String(d.doNumber ?? d.DoNumber ?? ''),
        status: Number(d.status ?? d.Status ?? 0),
        soId: d.soId ?? d.SoId ?? null,
        salesOrderNo: d.salesOrderNo ?? d.SalesOrderNo ?? '',
        packId: d.packId ?? d.PackId ?? null,
        driverId: (d.driverId ?? d.DriverId ?? null) !== null ? Number(d.driverId ?? d.DriverId) : null,
        driverMobileNo: d.driverMobileNo ?? d.DriverMobileNo ?? null,
        receivedPersonName: d.receivedPersonName ?? d.ReceivedPersonName ?? null,
        receivedPersonMobileNo: d.receivedPersonMobileNo ?? d.ReceivedPersonMobileNo ?? null,
        vehicleId: (d.vehicleId ?? d.VehicleId ?? null) !== null ? Number(d.vehicleId ?? d.VehicleId) : null,
        routeName: String(d.routeName ?? d.RouteName ?? '') || null,
        deliveryDate: d.deliveryDate ?? d.DeliveryDate ?? null,
        isPosted: (d.isPosted ?? d.IsPosted ?? 0)
      })) as DoRow[];

      this.rows = [...this.allRows];
    });
  }

  // ---------------- UI helpers ----------------
  statusLabel(v: number) {
    return v === 0 ? 'Pending'
      : v === 1 ? 'Delivered'
      : v === 2 ? 'Approved'
      : v === 3 ? 'Rejected'
      : v === 4 ? 'Posted'
      : 'Unknown';
  }

  getDriverName(id?: number | null)  { return id ? (this.driverMap.get(id) || '') : ''; }
  getVehicleNo(id?: number | null)   { return id ? (this.vehicleMap.get(id) || '') : ''; }
  getItemName(id?: number | null)    { return id ? (this.itemNameMap.get(id) || '') : ''; }
  getUomName(id?: number | null)     { return id != null ? (this.uomMap.get(id) || '') : ''; }

  // ---------------- Paging + Search ----------------
  onLimitChange(ev: Event) {
    const val = Number((ev.target as HTMLSelectElement).value);
    this.selectedOption = val || 10;
  }

  filterUpdate(_: any) {
    const q = (this.searchValue || '').trim().toLowerCase();
    if (!q) {
      this.rows = [...this.allRows];
      return;
    }

    this.rows = this.allRows.filter(r => {
      const doNum  = (r.doNumber || '').toLowerCase();
      const route  = (r.routeName || '').toLowerCase();
      const driver = this.getDriverName(r.driverId)?.toLowerCase() || '';
      const status = this.statusLabel(r.status).toLowerCase();
      const soNo   = String(r.salesOrderNo ?? '').toLowerCase();

      return doNum.includes(q) || route.includes(q) || driver.includes(q) || status.includes(q) || soNo.includes(q);
    });
  }

  // ---------------- Lines Modal (load lines) ----------------
  openLinesModal(row: DoRow) {
    this.activeDo = row;
    this.showLinesModal = true;

    let loadLines$: Observable<any>;

    // If your service has getLines(id), use it; else fallback to get(id)
    if ('getLines' in this.doSvc && typeof (this.doSvc as any).getLines === 'function') {
      loadLines$ = (this.doSvc as any).getLines(row.id).pipe(
        map((res: any) => res?.data ?? res),
        catchError(err => of({ __error: err }))
      );
    } else {
      loadLines$ = this.doSvc.get(row.id).pipe(
        map((res: any) => res?.data ?? res),
        catchError(err => of({ __error: err }))
      );
    }

    loadLines$.subscribe({
      next: (res: any) => {
        if (res?.__error) {
          this.modalLines = [];
          this.modalTotalQty = 0;
          return;
        }

        const linesRaw =
          Array.isArray(res) ? res :
          res?.lines ?? res?.Lines ?? [];

        this.modalLines = (linesRaw || []).map((l: any) => ({
          id: Number(l.id ?? l.Id ?? 0),
          doId: Number(l.doId ?? l.DoId ?? row.id),
          soLineId: (l.soLineId ?? l.SoLineId ?? null) !== null ? Number(l.soLineId ?? l.SoLineId) : null,
          packLineId: (l.packLineId ?? l.PackLineId ?? null) !== null ? Number(l.packLineId ?? l.PackLineId) : null,
          itemId: (l.itemId ?? l.ItemId ?? null) !== null ? Number(l.itemId ?? l.ItemId) : null,
          itemName: String(l.itemName ?? l.ItemName ?? ''),
          uom: (l.uom ?? l.Uom ?? null),
          uomId: (l.uomId ?? l.UomId ?? null) !== null ? Number(l.uomId ?? l.UomId) : null,
          qty: Number(l.qty ?? l.Qty ?? 0),
          notes: l.notes ?? l.Notes ?? null
        })) as DoLineRow[];

        this.modalTotalQty = this.modalLines.reduce((s, x) => s + (+x.qty || 0), 0);
      },
      error: () => {
        this.modalLines = [];
        this.modalTotalQty = 0;
      }
    });
  }

  closeLinesModal() {
    this.showLinesModal = false;
    this.activeDo = null;
    this.modalLines = [];
    this.modalTotalQty = 0;
  }

private buildDoPrintHtml(): string {
  // ---- Company Info ----
  const companyName = 'Continental Catering Solutions Pvt Ltd';
  const brand = '#2E5F73';

  const companySub  = 'Delivery & Logistics';
  const companyAddr = 'Chennai, Tamil Nadu';
  const companyPhone = '+91 XXXXX XXXXX';

  const doNo = this.activeDo?.doNumber || '-';
  const soNo = this.activeDo?.salesOrderNo || '-';
  const driver = this.getDriverName(this.activeDo?.driverId) || '-';
  const vehicle = this.getVehicleNo(this.activeDo?.vehicleId) || '-';
  const location = this.activeDo?.routeName || '-';

  const receivedPerson = (this.activeDo as any)?.receivedPersonName || '-';
  const receivedPhone  = (this.activeDo as any)?.receivedPersonMobileNo || '-';

  const dd = this.activeDo?.deliveryDate ? new Date(this.activeDo.deliveryDate as any) : null;
  const deliveryDate = dd
    ? `${String(dd.getDate()).padStart(2,'0')}-${String(dd.getMonth()+1).padStart(2,'0')}-${dd.getFullYear()}`
    : '-';

  const fmtQty = (n: any) => {
    const x = +n || 0;
    return x.toFixed(3).replace(/\.?0+$/, '');
  };

  const rowsHtml = (this.modalLines || []).map((l, i) => `
    <tr>
      <td class="c">${i + 1}</td>
      <td>${(l.itemName || this.getItemName(l.itemId) || l.itemId || '-')}</td>
      <td class="c">${(l.uom || this.getUomName(l.uomId) || '-')}</td>
      <td class="r">${fmtQty(l.qty)}</td>
      <td>${(l.notes || '-')}</td>
    </tr>
  `).join('');

  const totalQty = (this.modalLines || []).reduce((s, x) => s + (+x.qty || 0), 0);

  const bodyTable = (this.modalLines && this.modalLines.length)
    ? `
      <table class="tbl">
        <thead>
          <tr>
            <th style="width:55px;">S.No</th>
            <th>Item</th>
            <th style="width:110px;" class="c">UOM</th>
            <th style="width:110px;" class="r">Qty</th>
            <th>Notes</th>
          </tr>
        </thead>
        <tbody>${rowsHtml}</tbody>
        <tfoot>
          <tr>
            <td colspan="3" class="r b">Total Qty</td>
            <td class="r b">${fmtQty(totalQty)}</td>
            <td></td>
          </tr>
        </tfoot>
      </table>
    `
    : `<div class="empty">No lines</div>`;

  return `
  <html>
    <head>
      <title>DO Print - ${doNo}</title>
      <style>
        @page {
  margin: 1mm 12mm 14mm 12mm;   /* ✅ top right bottom left */
}

        /* ✅ MUST: print background colors in Chrome */
        * {
          box-sizing: border-box;
          -webkit-print-color-adjust: exact !important;
          print-color-adjust: exact !important;
        }

        body {
          font-family: Arial, Helvetica, sans-serif;
          color:#111827;
          margin:0;
          line-height: 1.35; /* ✅ more breathing space */
        }

  .content{
  min-height: 220mm;
  /* ✅ extra gap inside content (pushes everything down) */
  padding: 18mm 8px 0 8px;
}

        /* Header */
        .hdr{
          display:flex;
          justify-content:space-between;
          align-items:flex-start;
          gap:18px;                 /* ✅ more gap */
          padding-bottom:14px;      /* ✅ more space */
          margin-bottom:14px;       /* ✅ more space */
          border-bottom:2px solid ${brand};
        }

        .left{ display:flex; gap:14px; align-items:flex-start; } /* ✅ more space */

        .logo{
          width:50px; height:50px; border-radius:50%;
          background:${brand};
          color:#fff; display:flex; align-items:center; justify-content:center;
          font-weight:900; letter-spacing:.6px;
          font-size:17px;
          box-shadow: 0 2px 8px rgba(0,0,0,.14);
          flex:0 0 50px;
          margin-top: 2px;
        }

        .cname{ font-size:20px; font-weight:900; line-height:1.15; color:${brand}; }
        .csub{ font-size:13px; color:#374151; margin-top:4px; }
        .cmeta{ font-size:12px; color:#6b7280; margin-top:4px; }

        /* ✅ removed right-side "Delivery Order" + Printed time inside page */
        .doc{ display:none; }

        /* Meta block */
        .meta{
          display:grid;
          grid-template-columns: 1fr 1fr;
          gap:10px 26px;            /* ✅ more gap */
          font-size:13px;
          margin: 14px 0 16px;      /* ✅ more space */
          padding:14px 14px;        /* ✅ more padding */
          border:1px solid #d1d5db;
          border-radius:12px;
          background:#fff;
        }

        .meta .row{ display:flex; gap:12px; }
        .k{ color:#374151; width:150px; font-weight:800; }
        .v{ font-weight:800; color:#111827; }

        /* Table */
        .tbl{
          width:100%;
          border-collapse:collapse;
          font-size:13px;           /* ✅ bigger */
          margin-top: 8px;
        }
        .tbl th, .tbl td{
          border:1px solid #d1d5db;
          padding:10px 10px;        /* ✅ more padding */
          vertical-align:top;
        }

        .tbl tbody td{
          padding-top: 12px;        /* ✅ row height */
          padding-bottom: 12px;
        }

        .tbl thead th{
          background-color: ${brand} !important;
          color: #ffffff !important;
          font-weight: 900 !important;
          text-transform: uppercase;
          letter-spacing: .35px;
          font-size: 12.5px;
          border-color: ${brand} !important;
          padding-top: 12px;        /* ✅ thicker header */
          padding-bottom: 12px;
        }

        .tbl tfoot td{
          padding-top: 12px;
          padding-bottom: 12px;
        }

        .c{ text-align:center; }
        .r{ text-align:right; }
        .b{ font-weight:900; }

        .empty{
          border:1px dashed #9ca3af; color:#6b7280; padding:18px;
          text-align:center; border-radius:12px; font-size:14px;
          margin-top: 10px;
        }

        /* Footer */
        .footer{
          position: fixed;
          left: 12mm; right: 12mm; bottom: 8mm;
          font-size: 11px;
          color:#6b7280;
          display:flex;
          justify-content:space-between;
        }
      </style>
    </head>

    <body>
      <div class="content">
        <div class="hdr">
          <div class="left">
            <div class="logo">CC</div>
            <div>
              <div class="cname">${companyName}</div>
              <div class="csub">${companySub}</div>
              <div class="cmeta">${companyAddr} · ${companyPhone}</div>
            </div>
          </div>
        </div>

        <div class="meta">
          <div class="row"><div class="k">DO No</div><div class="v">${doNo}</div></div>
          <div class="row"><div class="k">SO No</div><div class="v">${soNo}</div></div>

          <div class="row"><div class="k">Driver</div><div class="v">${driver}</div></div>
          <div class="row"><div class="k">Vehicle No</div><div class="v">${vehicle}</div></div>

          <div class="row"><div class="k">Delivery Date</div><div class="v">${deliveryDate}</div></div>
          <div class="row"><div class="k">Location</div><div class="v">${location}</div></div>

          <div class="row"><div class="k">Received Person</div><div class="v">${receivedPerson}</div></div>
          <div class="row"><div class="k">Received Phone</div><div class="v">${receivedPhone}</div></div>
        </div>

        ${bodyTable}
      </div>

      <div class="footer">
        <div>Generated by ERP</div>
        <div>Page 1</div>
      </div>

      <script>
        window.onload = function(){ window.print(); }
      </script>
    </body>
  </html>`;
}


printLines() {
  const html = this.buildDoPrintHtml();
  const w = window.open('', 'DO_PRINT_' + Date.now(), 'width=980,height=720');
  if (!w) return;

  w.document.open();
  w.document.write(html);
  w.document.close();
}



printFromRow(row: DoRow) {
  if (this.activeDo?.id === row.id && this.modalLines?.length) {
    this.printLines();
    return;
  }

  this.activeDo = row;

  this.loadLinesForPrint(row.id).subscribe({
    next: (lines) => {
      this.modalLines = lines || [];
      this.modalTotalQty = this.modalLines.reduce((s, x) => s + (+x.qty || 0), 0);
      this.printLines();
    },
    error: () => {
      Swal.fire({ icon: 'error', title: 'Print failed', text: 'Unable to load DO lines.' });
    }
  });
}


  private loadLinesForPrint(doId: number): Observable<DoLineRow[]> {
    let load$: Observable<any>;

    if ('getLines' in this.doSvc && typeof (this.doSvc as any).getLines === 'function') {
      load$ = (this.doSvc as any).getLines(doId);
    } else {
      load$ = this.doSvc.get(doId);
    }

    return load$.pipe(
      map((res: any) => res?.data ?? res),
      map((res: any) => {
        const linesRaw =
          Array.isArray(res) ? res :
          res?.lines ?? res?.Lines ?? [];

        return (linesRaw || []).map((l: any) => ({
          id: Number(l.id ?? l.Id ?? 0),
          doId: Number(l.doId ?? l.DoId ?? doId),
          soLineId: (l.soLineId ?? l.SoLineId ?? null) !== null ? Number(l.soLineId ?? l.SoLineId) : null,
          packLineId: (l.packLineId ?? l.PackLineId ?? null) !== null ? Number(l.packLineId ?? l.PackLineId) : null,
          itemId: (l.itemId ?? l.ItemId ?? null) !== null ? Number(l.itemId ?? l.ItemId) : null,
          itemName: String(l.itemName ?? l.ItemName ?? ''),
          uom: (l.uom ?? l.Uom ?? null),
          uomId: (l.uomId ?? l.UomId ?? null) !== null ? Number(l.uomId ?? l.UomId) : null,
          qty: Number(l.qty ?? l.Qty ?? 0),
          notes: l.notes ?? l.Notes ?? null
        })) as DoLineRow[];
      }),
      catchError(() => of([]))
    );
  }

  // ---------------- Actions ----------------
  goToCreate() {
    if (this.isPeriodLocked) {
      this.showPeriodLockedSwal('create Delivery Orders');
      return;
    }
    this.router.navigate(['/Sales/Delivery-order-create']);
  }

  editDo(id: number) {
    if (this.isPeriodLocked) {
      this.showPeriodLockedSwal('edit Delivery Orders');
      return;
    }
    this.router.navigate(['/Sales/Delivery-order-edit', id]);
  }

  deleteDo(id: number) {
    if (this.isPeriodLocked) {
      this.showPeriodLockedSwal('delete Delivery Orders');
      return;
    }

    Swal.fire({
      icon: 'warning',
      title: 'Delete Delivery Order?',
      text: 'This action cannot be undone.',
      showCancelButton: true,
      confirmButtonColor: '#d33',
      cancelButtonColor: '#9ca3af',
      confirmButtonText: 'Delete'
    }).then(result => {
      if (!result.isConfirmed) return;

      if (!('delete' in this.doSvc) || typeof (this.doSvc as any).delete !== 'function') {
        Swal.fire({ icon: 'info', title: 'Delete not wired yet' });
        return;
      }

      (this.doSvc as any).delete(id).subscribe({
        next: () => {
          this.allRows = this.allRows.filter(r => r.id !== id);
          this.filterUpdate(null);
          Swal.fire('Deleted!', 'Delivery Order has been deleted.', 'success');
        },
        error: () => Swal.fire({ icon: 'error', title: 'Failed to delete' })
      });
    });
  }
}
