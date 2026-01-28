import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import Swal from 'sweetalert2';

import { ItemMasterService } from '../../item-master/item-master.service';
import { WarehouseService } from 'app/main/master/warehouse/warehouse.service';
import { MaterialRequisitionService } from '../material-requisition.service';

// ✅ CHANGE THIS PATH to your actual bin service location
import { BinService } from 'app/main/master/bin/bin.service';

type ItemMaster = {
  id: number;
  name: string;   // itemName
  sku: string;    // itemCode
  uom: string;    // uomName
  uomId: number | null;
};

type MrqHeader = {
  OutletId: number | null;
  BinId: number | null;          // ✅ NEW
  requesterName: string;
  date: string; // yyyy-mm-dd
};

type MrqLine = {
  id: number; // ✅ 0 = new line, >0 = existing line
  itemId: number | null;
  sku: string;
  uom: string;
  uomId: number | null;
  qty: number | null;
};

// ✅ Bin DTO (adjust if API differs)
type BinDto = {
  id: number;
  binName: string;
};

@Component({
  selector: 'app-material-requisition-create',
  templateUrl: './material-requisition-create.component.html',
  styleUrls: ['./material-requisition-create.component.scss']
})
export class MaterialRequisitionCreateComponent implements OnInit {
  OutletList: any[] = [];
  items: ItemMaster[] = [];

  // ✅ NEW
  binList: BinDto[] = [];

  header: MrqHeader = {
    OutletId: null,
    BinId: null,
    requesterName: '',
    date: this.todayISO()
  };

  lines: MrqLine[] = [this.emptyRow()];

  isSaving = false;

  // ✅ EDIT MODE
  isEdit = false;
  editId: number | null = null;

  constructor(
    private itemMasterService: ItemMasterService,
    private outletService: WarehouseService,
    private mrqService: MaterialRequisitionService,

    private route: ActivatedRoute,
    private router: Router
  ) {}

  ngOnInit(): void {
    // requesterName from localStorage
    this.header.requesterName = String(localStorage.getItem('username') ?? '');

    // detect edit id
    const idParam = this.route.snapshot.paramMap.get('id');
    this.editId = idParam ? Number(idParam) : null;
    this.isEdit = !!this.editId;

    // load masters first (items needed for sku/uom mapping)
    this.loadItem(() => {
      if (this.isEdit && this.editId) {
        this.loadById(this.editId);
      }
    });

    this.loadOutlets();
  }

  // ----------------------------
  // Masters
  // ----------------------------
  loadItem(done?: () => void): void {
    this.itemMasterService.getAllItemMaster().subscribe({
      next: (res: any) => {
        const data = res?.data ?? [];
        this.items = (data || []).map((x: any) => ({
          id: Number(x.id),
          name: String(x.itemName ?? ''),
          sku: String(x.itemCode ?? ''),
          uom: String(x.uomName ?? ''),
          uomId: x.uomId != null ? Number(x.uomId) : null
        }));

        this.items.sort((a, b) => a.name.localeCompare(b.name));
        done?.();
      },
      error: (err) => {
        console.error('Item load error:', err);
        this.items = [];
        done?.();
      }
    });
  }

  loadOutlets(): void {
    this.outletService.getWarehouse().subscribe({
      next: (res: any) => (this.OutletList = res?.data ?? []),
      error: (err) => {
        console.error('Outlet load error:', err);
        this.OutletList = [];
      }
    });
  }

  // ✅ NEW: when outlet selected, load bins
  onOutletChanged(): void {
    const outletId = this.header.OutletId != null ? Number(this.header.OutletId) : null;

    // reset bin selection & list
    this.header.BinId = null;
    this.binList = [];

    if (!outletId) return;

    this.loadBinsByOutlet(outletId);
  }

  // ✅ NEW: BinService.getbyBinNameinOuteltId(outletId)
loadBinsByOutlet(outletId: number, keepSelectedBinId: number | null = null): void {
  this.outletService.getBinNameByIdAsync(outletId).subscribe({
    next: (res: any) => {
      const data = res?.data ?? [];

      this.binList = (data || [])
        .map((b: any) => ({
          // ✅ IMPORTANT: API gives binID as string
          id: Number(b.binID ?? b.binId ?? b.id ?? 0),
          binName: String(b.binName ?? b.name ?? '')
        }))
        // ✅ don't remove all rows by mistake
        .filter((x: BinDto) => x.id > 0 && !!x.binName)
        .sort((a: BinDto, b: BinDto) => a.binName.localeCompare(b.binName));

      // ✅ keep selected (edit mode)
      if (keepSelectedBinId && this.binList.some(x => x.id === keepSelectedBinId)) {
        this.header.BinId = keepSelectedBinId;
      }

      console.log('BIN LIST:', this.binList); // ✅ debug
    },
    error: (err) => {
      console.error('Bin load error:', err);
      this.binList = [];
    }
  });
}


  // ----------------------------
  // EDIT: Load by Id
  // ----------------------------
  loadById(id: number): void {
    Swal.fire({
      title: 'Loading...',
      text: 'Please wait',
      allowOutsideClick: false,
      didOpen: () => Swal.showLoading()
    });

    this.mrqService.GetMaterialRequestById(id).subscribe({
      next: (res: any) => {
        Swal.close();

        const x = res?.data ?? res;
        if (!x) {
          Swal.fire('Not Found', 'Record not found', 'warning');
          this.router.navigate(['/Inventory/list-material-requisition']);
          return;
        }

        // header bind
        this.header.OutletId = x.outletId != null ? Number(x.outletId) : null;

        // ✅ NEW: bin bind
      const binId = x.binId ?? x.binID ?? null;
this.header.BinId = binId != null ? Number(binId) : null;

        this.header.requesterName = String(x.requesterName ?? this.header.requesterName ?? '');
        this.header.date = this.toISODate(x.reqDate) || this.todayISO();

        // ✅ load bins for outlet and keep selected bin
        if (this.header.OutletId) {
          this.loadBinsByOutlet(Number(this.header.OutletId), binId);
        }

        // lines bind
        const apiLines = (x.lines ?? x.lineItems ?? []) as any[];

        if (!apiLines.length) {
          this.lines = [this.emptyRow()];
          return;
        }

        this.lines = apiLines.map((l: any) => {
          const lineId = Number(l.id ?? 0);
          const itemId = l.itemId != null ? Number(l.itemId) : null;
          const item = this.items.find(it => it.id === itemId);

          return {
            id: lineId,
            itemId,
            sku: String(l.itemCode ?? item?.sku ?? ''),
            uom: String(l.uomName ?? item?.uom ?? ''),
            uomId: l.uomId != null ? Number(l.uomId) : (item?.uomId ?? null),
            qty: l.qty != null ? Number(l.qty) : null
          } as MrqLine;
        });

        if (this.lines.length === 0) this.lines = [this.emptyRow()];
      },
      error: (err) => {
        Swal.close();
        console.error('GetById error:', err);
        Swal.fire('Error', err?.error?.message ?? 'Failed to load MRQ', 'error');
        this.router.navigate(['/Inventory/list-material-requisition']);
      }
    });
  }

  // ----------------------------
  // Grid actions
  // ----------------------------
  addRow(): void {
    this.lines.push(this.emptyRow());
  }

  removeRow(index: number): void {
    if (this.lines.length === 1) return;
    this.lines.splice(index, 1);
  }

  onItemChanged(rowIndex: number): void {
    const row = this.lines[rowIndex];
    const selectedId = row.itemId != null ? Number(row.itemId) : null;
    const item = this.items.find(x => x.id === selectedId);

    if (!item) {
      row.sku = '';
      row.uom = '';
      row.uomId = null;
      return;
    }

    // ✅ keep row.id (do not touch)
    row.sku = item.sku;
    row.uom = item.uom;
    row.uomId = item.uomId;
  }

  // ----------------------------
  // ng-select custom search
  // ----------------------------
  searchFn = (term: string, item: ItemMaster) => {
    term = (term || '').toLowerCase().trim();
    if (!term) return true;

    return (
      (item.name || '').toLowerCase().includes(term) ||
      (item.sku || '').toLowerCase().includes(term) ||
      (item.uom || '').toLowerCase().includes(term)
    );
  };

  // ----------------------------
  // Save (Create / Update)
  // ----------------------------
  save(): void {
    if (this.isSaving) return;

    if (!this.header.OutletId) {
      Swal.fire('Validation', 'Please select Outlet', 'warning');
      return;
    }

    if (!this.header.BinId) {
      Swal.fire('Validation', 'Please select Bin', 'warning');
      return;
    }

    const requester = (this.header.requesterName ?? '').trim();
    if (!requester) {
      Swal.fire('Validation', 'Requester name missing', 'warning');
      return;
    }

    const validLines = this.lines
      .filter(l => l.itemId && (l.qty ?? 0) > 0)
      .map(l => {
        const item = this.items.find(x => x.id === Number(l.itemId));
        return {
          id: Number(l.id ?? 0), // ✅ send id (0=new line)
          itemId: Number(l.itemId),
          itemCode: item?.sku ?? l.sku ?? '',
          itemName: item?.name ?? '',
          uomId: item?.uomId ?? l.uomId ?? null,
          uomName: item?.uom ?? l.uom ?? '',
          qty: Number(l.qty)
        };
      });

    if (validLines.length === 0) {
      Swal.fire('Validation', 'Please add at least 1 item with Qty', 'warning');
      return;
    }

    const payload: any = {
      id: this.isEdit ? Number(this.editId) : 0,
      outletId: Number(this.header.OutletId),
      binId: Number(this.header.BinId),      // ✅ NEW
      requesterName: requester,
      reqDate: this.header.date,
      status: 1,
      remarks: null,
      updatedBy: requester,
      createdBy: requester,
      isActive: true,
      lines: validLines
    };

    this.isSaving = true;

    Swal.fire({
      title: this.isEdit ? 'Updating...' : 'Saving...',
      text: 'Please wait',
      allowOutsideClick: false,
      didOpen: () => Swal.showLoading()
    });

    const api$ = this.isEdit && this.editId
      ? this.mrqService.UpdateMaterialRequestById(this.editId, payload)
      : this.mrqService.CreateMaterialRequest(payload);

    api$.subscribe({
      next: (res: any) => {
        this.isSaving = false;

        if (res?.isSuccess === false) {
          Swal.fire('Material Requisition', res?.message ?? 'Save failed', 'error');
          return;
        }

        const reqNo = res?.data?.reqNo || res?.data?.ReqNo || res?.reqNo;

        Swal.fire(
          'Material Requisition',
          reqNo
            ? `${this.isEdit ? 'Updated' : 'Saved'} Successfully<br><b>${reqNo}</b>`
            : (res?.message ?? (this.isEdit ? 'Updated successfully' : 'Saved successfully')),
          'success'
        );

        this.router.navigate(['/Inventory/list-material-requisition']);
      },
      error: (err) => {
        this.isSaving = false;
        console.error('MRQ save/update error:', err);

        Swal.fire(
          'Server Error',
          err?.error?.message ?? 'Server error while saving',
          'error'
        );
      }
    });
  }

  close(): void {
    this.router.navigate(['/Inventory/list-material-requisition']);
  }

  // ----------------------------
  // Helpers
  // ----------------------------
  private emptyRow(): MrqLine {
    return { id: 0, itemId: null, sku: '', uom: '', uomId: null, qty: null };
  }

  private todayISO(): string {
    const d = new Date();
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
  }

  private toISODate(dt: any): string {
    if (!dt) return '';
    if (typeof dt === 'string' && /^\d{4}-\d{2}-\d{2}/.test(dt)) return dt.slice(0, 10);
    const d = new Date(dt);
    if (isNaN(d.getTime())) return '';
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
  }
}
