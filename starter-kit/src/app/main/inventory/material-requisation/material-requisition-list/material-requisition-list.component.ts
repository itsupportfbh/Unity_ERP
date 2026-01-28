import { Component, OnInit, ViewEncapsulation } from '@angular/core';
import { NgbModal, NgbModalRef } from '@ng-bootstrap/ng-bootstrap';
import { Router } from '@angular/router';
import { MaterialRequisitionService } from '../material-requisition.service';

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

  constructor(
    private modalService: NgbModal,
    private router: Router,
    private materialRequisition: MaterialRequisitionService
  ) {}

  ngOnInit(): void {
    this.loadMaterialRequisition();
  }

  rowIdentity = (row: MaterialReqRow) => row.gridKey;

  // ✅ Status mapping you asked
 getStatusLabel(status?: number | null): string {
    // ✅ API status only
    if (status === 1) return 'Pending';
    if (status === 2) return 'Partial Transfer Out';
    if (status === 3) return 'Full Transfer Out';
    if (status === 4) return 'Delivered';
    return '-';
  }


  // badge color
  getStatusClass(status?: number | null): string {
    if (status === 1) return 'badge-warning';  // pending
    if (status === 2) return 'badge-info';
     if (status === 3) return 'badge-info';     // out
    if (status === 4) return 'badge-success';  // completed
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
}
