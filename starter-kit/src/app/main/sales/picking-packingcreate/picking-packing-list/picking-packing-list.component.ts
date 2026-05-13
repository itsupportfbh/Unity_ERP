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
import { DatePipe } from '@angular/common';
import * as feather from 'feather-icons';

import { PackingService } from '../picking-packing.service';
import { FunctionPermission, PermissionService } from 'app/shared/permission.service';

@Component({
  selector: 'app-picking-packing-list',
  templateUrl: './picking-packing-list.component.html',
  styleUrls: ['./picking-packing-list.component.scss'],
  encapsulation: ViewEncapsulation.None,
  providers: [DatePipe]
})
export class PickingPackingListComponent implements OnInit, AfterViewInit, AfterViewChecked {
  @ViewChild(DatatableComponent) table!: DatatableComponent;
  @ViewChild('tableRowDetails') tableRowDetails: any;
  @ViewChild('SweetAlertFadeIn') SweetAlertFadeIn: any;

  rows: any[] = [];
  tempData: any[] = [];
  searchValue = '';
  ColumnMode = ColumnMode;
  selectedOption = 10;

  showLinesModal = false;
  modalLines: any[] = [];
  modalTotal = 0;

  userId: number = 0;
  functionId = 'sales-pp-list';

  permission: FunctionPermission;
  isPermissionLoaded = false;
  isPageLoading = false;

  constructor(
    private packingService: PackingService,
    private router: Router,
    private datePipe: DatePipe,
    private permissionService: PermissionService
  ) {
    this.userId = Number(localStorage.getItem('id') || 0);
    this.permission = this.permissionService.getEmptyPermission(this.functionId);
  }

  ngOnInit(): void {
    this.loadPermission();
  }

  ngAfterViewInit(): void {
    feather.replace();
  }

  ngAfterViewChecked(): void {
    feather.replace();
  }

  loadPermission(): void {
    if (!this.userId || this.userId <= 0) {
      this.permission = this.permissionService.getEmptyPermission(this.functionId);
      this.isPermissionLoaded = true;
      Swal.fire('Access Denied', 'User not found. Please login again.', 'warning');
      return;
    }

    this.isPageLoading = true;

    this.permissionService.getFunctionPermission(this.userId, this.functionId).subscribe({
      next: (res: FunctionPermission) => {
        this.permission = res || this.permissionService.getEmptyPermission(this.functionId);
        this.isPermissionLoaded = true;
        this.isPageLoading = false;

        if (this.canView()) {
          this.loadRequests();
        }
      },
      error: () => {
        this.permission = this.permissionService.getEmptyPermission(this.functionId);
        this.isPermissionLoaded = true;
        this.isPageLoading = false;
        Swal.fire('Error', 'Unable to load permission.', 'error');
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

  filterUpdate(event: any): void {
    const val = (event?.target?.value ?? this.searchValue ?? '').toString().toLowerCase().trim();

    this.rows = this.tempData.filter((d: any) => {
      const soDate = this.datePipe.transform(d.soDate, 'dd-MM-yyyy')?.toLowerCase() || '';
      const deliveryDate = this.datePipe.transform(d.deliveryDate, 'dd-MM-yyyy')?.toLowerCase() || '';

      return (
        !val ||
        (d.salesOrderNo || '').toLowerCase().includes(val) ||
        (d.customerName || '').toLowerCase().includes(val) ||
        soDate.includes(val) ||
        deliveryDate.includes(val)
      );
    });

    if (this.table) this.table.offset = 0;
  }

  loadRequests(): void {
    this.packingService.getPacking().subscribe({
      next: (res: any) => {
        this.rows = (res?.data || []).map((req: any) => ({ ...req }));
        this.tempData = [...this.rows];
        this.filterUpdate({ target: { value: this.searchValue } });
      },
      error: (err: any) => console.error('Error loading list', err)
    });
  }

  openCreate(): void {
    if (!this.canCreate()) {
      Swal.fire('Access Denied', 'You do not have create permission.', 'warning');
      return;
    }

    this.router.navigate(['/Sales/Picking-packing-create']);
  }

  editPicking(row: any): void {
    if (!this.canEdit()) {
      Swal.fire('Access Denied', 'You do not have edit permission.', 'warning');
      return;
    }

    this.router.navigateByUrl(`/Sales/Picking-packing-edit/${row.id}`);
  }

  deletePicking(id: number): void {
    if (!this.canDelete()) {
      Swal.fire('Access Denied', 'You do not have delete permission.', 'warning');
      return;
    }

    Swal.fire({
      title: 'Are you sure?',
      text: 'This will permanently delete the Picking.',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#d33',
      cancelButtonColor: '#3085d6',
      confirmButtonText: 'Yes, delete it!'
    }).then((result) => {
      if (!result.isConfirmed) return;

      this.packingService.deletePacking(id).subscribe({
        next: () => {
          this.loadRequests();
          Swal.fire('Deleted!', 'Picking has been deleted.', 'success');
        },
        error: () => Swal.fire('Error', 'Delete failed.', 'error')
      });
    });
  }

  openLinesModal(row: any): void {
    let lines: any[] = [];

    try {
      lines = Array.isArray(row?.lineItems)
        ? row.lineItems
        : JSON.parse(row?.lineItems || '[]');
    } catch {
      lines = [];
    }

    this.modalLines = lines;
    this.modalTotal = lines.reduce((sum, l) => sum + Number(l?.quantity || 0), 0);
    this.showLinesModal = true;
  }

  closeLinesModal(): void {
    this.showLinesModal = false;
  }

  isRowLocked(row: any): boolean {
    const v = row?.approvalStatus ?? row?.ApprovalStatus ?? row?.status;
    if (v == null) return false;

    if (typeof v === 'string') {
      const s = v.trim().toLowerCase();
      return s === 'approved' || s === 'rejected';
    }

    return [2, 3].includes(Number(v));
  }
}