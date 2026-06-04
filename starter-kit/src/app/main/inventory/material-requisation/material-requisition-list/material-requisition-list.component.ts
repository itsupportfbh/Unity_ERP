import { Component, OnInit, ViewEncapsulation } from '@angular/core';
import { NgbModal, NgbModalRef } from '@ng-bootstrap/ng-bootstrap';
import { Router } from '@angular/router';
import { MaterialRequisitionService } from '../material-requisition.service';
import { FunctionPermission, PermissionService } from 'app/shared/permission.service';
import Swal from 'sweetalert2';
import { PeriodCloseService } from 'app/main/financial/period-close-fx/period-close-fx.service';

type MaterialReqLine = {
  id: number;
  materialReqId: number;
  itemId: number;
  itemCode?: string;
  itemName?: string;
  uomId?: number;
  uomName?: string;
  qty?: number;
  createdDate?: string | Date | null;
};

type MaterialReqRow = {
  gridKey: string;
  id: number;
  reqNo: string;
  outletId?: number | null;
    outletName?: number | null;
  requesterName?: string | null;
  reqDate?: string | Date | null;
  status?: number | null;
  isActive?: boolean;
  lines?: MaterialReqLine[];
  lineCount?: number;
  totalQty?: number;
};

@Component({
  selector: 'app-material-requisition-list',
  templateUrl: './material-requisition-list.component.html',
  styleUrls: ['./material-requisition-list.component.scss'],
  encapsulation: ViewEncapsulation.None
})
export class MaterialRequisitionListComponent implements OnInit {

  loading = false;
  errorMsg = '';

  pageSizes = [10, 25, 50, 100];
  pageSize = 10;
  searchValue = '';

  rows: MaterialReqRow[] = [];
  filteredRows: MaterialReqRow[] = [];

  // view modal
  selectedReq: MaterialReqRow | null = null;
  private modalRef?: NgbModalRef;
companyId: number = 0;
   userId: number = 0;
    functionId = 'mr-list';
    
      permission: FunctionPermission;
      isPermissionLoaded = false;
      isPageLoading = false;
       isPeriodLocked = false;
  periodName = '';
  constructor(
    private modalService: NgbModal,
    private router: Router,
    private materialRequisition: MaterialRequisitionService,
    private permissionService: PermissionService,
    private periodLock: PeriodCloseService
  ) 
  {
    this.userId = Number(localStorage.getItem('id') || 0);
    this.permission = this.permissionService.getEmptyPermission(this.functionId);
    this.companyId = Number(localStorage.getItem('companyId') || 0);
  }

  ngOnInit(): void {
    this.loadPermission();
    this.checkPeriodLockForToday();
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
            this.loadMaterialRequisition();  
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

  rowIdentity = (row: MaterialReqRow) => row.gridKey;

  // ✅ Status mapping you asked
 getStatusLabel(status?: number | null): string {
    // ✅ API status only
    if (status === 1) return 'Pending';
    if (status === 2) return 'Pending Partial Out';
    if (status === 3) return 'Delivered Partial Out';
    if (status === 4) return 'Pending Full Transfer Out';
    if (status === 5) return 'Delivered';
    return '-';
  }


  // badge color
getStatusClass(status?: number | null): string {
  if (status === 1) return 'badge-warning'; // Pending
  if (status === 2) return 'badge-info';    // Pending Partial Out
  if (status === 3) return 'badge-primary'; // Delivered Partial Out
  if (status === 4) return 'badge-success'; // Pending Full Transfer Out
  if (status === 5) return 'badge-dark';    // Delivered
  return 'badge-light';
}

  applyFilter(): void {
    const q = (this.searchValue || '').trim().toLowerCase();
    if (!q) {
      this.filteredRows = [...this.rows];
      return;
    }

    this.filteredRows = this.rows.filter(r => {
      const headerHay = [
        r.reqNo ?? '',
        r.outletName ?? '',
        r.requesterName ?? '',
        this.getStatusLabel(r.status)
      ].join(' ').toLowerCase();

      const linesHay = (r.lines || [])
        .map(l => `${l.itemCode ?? ''} ${l.itemName ?? ''} ${l.uomName ?? ''} ${l.qty ?? ''}`)
        .join(' ')
        .toLowerCase();

      return headerHay.includes(q) || linesHay.includes(q);
    });
  }

  // ✅ View modal (eye icon)
  openViewModal(row: MaterialReqRow, viewModal: any): void {
    this.selectedReq = {
      ...row,
      reqDate: row.reqDate ? new Date(row.reqDate) : null,
      lines: (row.lines || []).map(l => ({
        ...l,
        createdDate: l.createdDate ? new Date(l.createdDate as any) : null
      }))
    };

    this.modalRef = this.modalService.open(viewModal, {
      size: 'lg',
      centered: true,
      backdrop: 'static',
       windowClass: 'mrq-modal-xl'
    });

    this.modalRef.result.finally(() => {
      this.selectedReq = null;
      this.modalRef = undefined;
    });
  }

  // ✅ New button
  goToCreateForm(): void {
    this.router.navigate(['/Inventory/create-material-requisition']);
  }

  // Load list from API
  loadMaterialRequisition(): void {
    this.loading = true;
    this.errorMsg = '';

    this.materialRequisition.GetMaterialRequest().subscribe({
      next: (res: any) => {
        const list = (res?.data ?? res ?? []) as any[];

        this.rows = (list || []).map((x: any, idx: number): MaterialReqRow => {
          const lines: MaterialReqLine[] = (x.lines || []).map((l: any) => ({
            id: Number(l.id ?? 0),
            materialReqId: Number(l.materialReqId ?? x.id ?? 0),
            itemId: Number(l.itemId ?? 0),
            itemCode: l.itemCode ?? '',
            itemName: l.itemName ?? '',
            uomId: l.uomId ?? null,
            uomName: l.uomName ?? '',
            qty: Number(l.qty ?? 0),
            createdDate: l.createdDate ?? null
          }));

          const totalQty = lines.reduce((sum, l) => sum + (Number(l.qty ?? 0) || 0), 0);

          return {
            gridKey: `MRQ-${x.id ?? idx}`,
            id: Number(x.id ?? 0),
            reqNo: String(x.reqNo ?? ''),
            outletId: x.outletId ?? null,
             outletName: x.outletName ?? null,
            requesterName: x.requesterName ?? null,
            reqDate: x.reqDate ?? null,
            status: x.status ?? null,
            isActive: x.isActive ?? true,
            lines,
            lineCount: lines.length,
            totalQty
          };
        });

        this.filteredRows = [...this.rows];
        this.applyFilter();
        this.loading = false;
      },
      error: (err) => {
        this.errorMsg = err?.message ?? 'Failed to load Material Requisition list';
        this.loading = false;
      }
    });
  }

  editReq(row: MaterialReqRow): void {
  // use your create form component route with id
  this.router.navigate(['/Inventory/edit-material-requisition', row.id]);
}

goStockOverview() {
  this.router.navigate(['/Inventory/list-stackoverview']);
}

goStockTransfer() {
  this.router.navigate(['/Inventory/list-stocktransfer']);
}
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

canShowStockButtons(): boolean {
  return this.companyId === 1;
}
}
