import {
  Component,
  OnInit,
  ViewChild,
  ViewEncapsulation,
  AfterViewInit,
  AfterViewChecked
} from '@angular/core';
import { Router } from '@angular/router';
import Swal from 'sweetalert2';
import { ColumnMode, DatatableComponent } from '@swimlane/ngx-datatable';
import * as feather from 'feather-icons';

import { StackOverviewService } from '../../stack-overview/stack-overview.service';
import { FunctionPermission, PermissionService } from 'app/shared/permission.service';

interface ApiRow {
  stockId?: number | string;
  itemId?: number | string;

  sku?: string;
  itemName?: string;

  fromWarehouseId?: number | string;
  toWarehouseId?: number | string;
  fromWarehouseName?: string;
  toWarehouseName?: string;

  // ✅ DB field
  transferQty?: number | string | null;  // if API returns
  TransferQty?: number | string | null;  // if pascal
  // requestQty is different, don't show in transfer qty column
  requestQty?: number | string;

  remarks?: string | null;

  status?: number | string;
}

interface UiRow extends ApiRow {
  stockIdNum?: number;
  itemIdNum?: number;
  fromWarehouseIdNum?: number;
  toWarehouseIdNum?: number;

  // ✅ normalized transfer qty (null stays null)
  transferQtyNum: number | null;

  statusNum: number;
  statusLabel: string;
}

@Component({
  selector: 'app-stock-transfer-list',
  templateUrl: './stock-transfer-list.component.html',
  styleUrls: ['./stock-transfer-list.component.scss'],
  encapsulation: ViewEncapsulation.None
})
export class StockTransferListComponent implements OnInit, AfterViewInit, AfterViewChecked {

  @ViewChild(DatatableComponent) table: DatatableComponent;

  rows: UiRow[] = [];
  tempData: UiRow[] = [];

  searchValue = '';
  ColumnMode = ColumnMode;
  selectedOption = 10;

  userId: number = 0;
    functionId = 'mr-list';
  
    permission: FunctionPermission;
    isPermissionLoaded = false;
    isPageLoading = false;
  
  constructor(
    private router: Router,
    private stockService: StackOverviewService,
      private permissionService: PermissionService
  ) 
  {
    this.userId = Number(localStorage.getItem('id') || 0);
    this.permission = this.permissionService.getEmptyPermission(this.functionId);
  }

  ngOnInit(): void {
    this.loadPermission();
  }

   loadPermission(): void {
      if (!this.userId || this.userId <= 0) {
        this.permission = this.permissionService.getEmptyPermission(this.functionId);
        this.isPermissionLoaded = true;
  
        Swal.fire({
          icon: 'warning',
          title: 'Access Denied',
          text: 'User not found. Please login again.',
          confirmButtonColor: '#0e3a4c'
        });
        return;
      }
  
      this.isPageLoading = true;
  
      this.permissionService.getFunctionPermission(this.userId, this.functionId).subscribe({
        next: (res: FunctionPermission) => {
          this.permission = res || this.permissionService.getEmptyPermission(this.functionId);
          this.isPermissionLoaded = true;
          this.isPageLoading = false;
  
          if (this.canView()) {
            this.loadList();  
          } else {
            this.rows = [];
            // this.isDisplay = false;
          }
        },
        error: (err) => {
          console.error('Permission load error:', err);
          this.permission = this.permissionService.getEmptyPermission(this.functionId);
          this.isPermissionLoaded = true;
          this.isPageLoading = false;
  
          Swal.fire({
            icon: 'error',
            title: 'Error',
            text: 'Unable to load permission.',
            confirmButtonColor: '#d33'
          });
        }
      });
    }
  
    canView(): boolean {
      return this.permissionService.hasView(this.permission);
    }
  
    canCreate(): boolean {
      return this.permissionService.hasCreate(this.permission);
    }
  
    canEdit(): boolean {
      return this.permissionService.hasEdit(this.permission);
    }
  
    canDelete(): boolean {
      return this.permissionService.hasDelete(this.permission);
    }
  

  ngAfterViewInit(): void { feather.replace(); }
  ngAfterViewChecked(): void { feather.replace(); }

  private toNum(v: any): number | undefined {
    const n = Number(v);
    return Number.isFinite(n) ? n : undefined;
  }

  private toNumOrNull(v: any): number | null {
    if (v === null || v === undefined || v === '') return null;
    const n = Number(v);
    return Number.isFinite(n) ? n : null;
  }

  private statusLabel(n: number): string {
    if (n === 1) return 'Pending';
    if (n === 2) return 'Out of delivery';
    if (n === 3) return 'Transferred complete';
    return '—';
  }

  private toUiRow(api: any): UiRow {
    const stockIdNum = this.toNum(api.stockId ?? api.StockId);
    const itemIdNum  = this.toNum(api.itemId  ?? api.ItemId);

    const fromWarehouseIdNum = this.toNum(api.fromWarehouseId ?? api.FromWarehouseId ?? api.warehouseId ?? api.WarehouseId);
    const toWarehouseIdNum   = this.toNum(api.toWarehouseId   ?? api.ToWarehouseId);

    const statusNum = Number(api.status ?? api.Status ?? 0);

    // ✅ IMPORTANT: take transferQty only
    const transferQtyNum = this.toNumOrNull(api.transferQty ?? api.TransferQty);

    return {
      ...api,
      stockIdNum,
      itemIdNum,
      fromWarehouseIdNum,
      toWarehouseIdNum,

      itemName: api.itemName ?? api.ItemName ?? api.name ?? api.Name ?? '',
      statusNum,
      statusLabel: this.statusLabel(statusNum),

      transferQtyNum
    };
  }

  loadList(): void {
    this.stockService.GetAllStockTransferedList().subscribe({
      next: (res: any) => {
        const list: any[] =
          (res?.isSuccess && Array.isArray(res.data)) ? res.data :
          (Array.isArray(res?.data) ? res.data :
          (Array.isArray(res) ? res : []));

        this.rows = list.map(r => this.toUiRow(r));
        this.tempData = [...this.rows];
      },
      error: (err: any) => {
        console.error('Load list failed', err);
        this.rows = [];
        this.tempData = [];
      }
    });
  }

  filterUpdate(event: any) {
    const val = (event?.target?.value ?? this.searchValue ?? '')
      .toString().toLowerCase().trim();

    if (!val) {
      this.rows = [...this.tempData];
      if (this.table) this.table.offset = 0;
      return;
    }

    const contains = (s?: any) => (s ?? '').toString().toLowerCase().includes(val);

    this.rows = this.tempData.filter(d =>
      contains(d.sku) ||
      contains(d.itemName) ||
      contains(d.fromWarehouseName) ||
      contains(d.toWarehouseName) ||
      contains(d.remarks) ||
      contains(d.statusLabel) ||
      contains(d.transferQtyNum)
    );

    if (this.table) this.table.offset = 0;
  }

  openCreate() {
    this.router.navigate(['/Inventory/create-stocktransfer']);
  }

  editTransfer(row: UiRow) {
    if (Number(row.statusNum) !== 1) {
      Swal.fire('Not Allowed', 'Edit only for Pending (Status = 1).', 'warning');
      return;
    }

    const stockId = row.stockIdNum ?? this.toNum(row.stockId);
    if (!stockId) {
      Swal.fire('Missing stockId', 'Cannot edit without stockId.', 'warning');
      return;
    }

    this.router.navigate(['/Inventory/create-stocktransfer'], {
      queryParams: { mode: 'edit', stockId },
      state: { editRow: row }
    });
  }
}
