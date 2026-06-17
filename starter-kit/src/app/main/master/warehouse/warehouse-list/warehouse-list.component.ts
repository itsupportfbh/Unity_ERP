import { Component, OnInit, ViewChild, ViewEncapsulation } from '@angular/core';
import { Router } from '@angular/router';
import Swal from 'sweetalert2';
import { ColumnMode, DatatableComponent } from '@swimlane/ngx-datatable';
import { WarehouseService } from '../warehouse.service';
import { CoreSidebarService } from '@core/components/core-sidebar/core-sidebar.service';
import { FunctionPermission, PermissionService } from 'app/shared/permission.service';

@Component({
  selector: 'app-warehouse-list',
  templateUrl: './warehouse-list.component.html',
  styleUrls: ['./warehouse-list.component.scss'],
  encapsulation: ViewEncapsulation.None
})
export class WarehouseListComponent implements OnInit {
  @ViewChild(DatatableComponent) table: DatatableComponent;
  @ViewChild('tableRowDetails') tableRowDetails: any;
  @ViewChild('SweetAlertFadeIn') SweetAlertFadeIn: any;

  colors = ['bg-light-primary', 'bg-light-success', 'bg-light-danger', 'bg-light-warning', 'bg-light-info'];

  rows: any[] = [];
  tempData: any[] = [];

  public searchValue = '';
  public ColumnMode = ColumnMode;
  public selectedOption = 10;

  hover = false;
  passData: any;

  userId: number = 0;

  // IMPORTANT: DB/Menu permission code exact ah match aaganum
  functionId = 'warehouse';

  permission: FunctionPermission;
  isPermissionLoaded = false;
  isPageLoading = false;

  constructor(
    private warehouseService: WarehouseService,
    private router: Router,
    private _coreSidebarService: CoreSidebarService,
    private permissionService: PermissionService
  ) {
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
          this.loadRequests();
        } else {
          this.rows = [];
          this.tempData = [];
        }
      },
      error: () => {
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

  filterUpdate(event?: any): void {
    const val = (event?.target?.value ?? this.searchValue ?? '').toLowerCase().trim();

    if (!val) {
      this.rows = [...this.tempData];
      if (this.table) this.table.offset = 0;
      return;
    }

    this.rows = this.tempData.filter((d: any) => {
      return (
        (d.name || '').toLowerCase().includes(val) ||
        (d.countryName || '').toLowerCase().includes(val) ||
        (d.stateName || '').toLowerCase().includes(val) ||
        (d.cityName || '').toLowerCase().includes(val) ||
        (d.locationname || '').toLowerCase().includes(val) ||
        (d.phone || '').toLowerCase().includes(val)
      );
    });

    if (this.table) this.table.offset = 0;
  }

  getRandomColor(index: number): string {
    return this.colors[index % this.colors.length];
  }

  getInitial(orgName: string): string {
    return (orgName || '').slice(0, 2).toUpperCase();
  }

  loadRequests(): void {
    this.warehouseService.getWarehouse().subscribe({
      next: (res: any) => {
        this.rows = (res?.data || []).map((req: any) => ({ ...req }));
        this.tempData = [...this.rows];
      },
      error: (err: any) => {
        this.rows = [];
        this.tempData = [];

        Swal.fire({
          icon: 'error',
          title: 'Error',
          text: err?.error?.message || err?.message || 'Unable to load warehouse list.',
          confirmButtonColor: '#d33'
        });
      }
    });
  }

  editWarehouse(row: any): void {
    if (!this.canEdit()) {
      Swal.fire({
        icon: 'warning',
        title: 'Access Denied',
        text: 'You do not have edit permission.',
        confirmButtonColor: '#0e3a4c'
      });
      return;
    }

    this.passData = { ...row };
    this.toggleSidebar('app-warehouse-create');
  }

  deleteWarehouse(id: number): void {
    if (!this.canDelete()) {
      Swal.fire({
        icon: 'warning',
        title: 'Access Denied',
        text: 'You do not have delete permission.',
        confirmButtonColor: '#0e3a4c'
      });
      return;
    }

    Swal.fire({
      title: 'Are you sure?',
      text: 'This will permanently delete the Warehouse.',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#d33',
      cancelButtonColor: '#3085d6',
      confirmButtonText: 'Yes, delete it!',
      cancelButtonText: 'Cancel'
    }).then((result) => {
      if (result.isConfirmed) {
        this.warehouseService.deleteWarehouse(id).subscribe({
          next: (res: any) => {
            this.loadRequests();

            Swal.fire({
              icon: res?.isSuccess === false ? 'error' : 'success',
              title: res?.isSuccess === false ? 'Error!' : 'Deleted!',
              text: res?.message || 'Warehouse has been deleted.',
              confirmButtonColor: res?.isSuccess === false ? '#d33' : '#3085d6'
            });
          },
          error: (err) => {
            Swal.fire({
              icon: 'error',
              title: 'Error!',
              text: err?.error?.message || err?.message || 'Failed to delete warehouse.',
              confirmButtonColor: '#d33'
            });
          }
        });
      }
    });
  }

  toggleLines(req: any): void {
    req.showLines = !req.showLines;
  }

  onRowExpandClick(row: any): void {
    this.rowDetailsToggleExpand(row);

    if (this.SweetAlertFadeIn) {
      this.SweetAlertFadeIn.fire();
    }
  }

  rowDetailsToggleExpand(row: any): void {
    row.$$expanded = !row.$$expanded;
  }

  openCreate(): void {
    if (!this.canCreate()) {
      Swal.fire({
        icon: 'warning',
        title: 'Access Denied',
        text: 'You do not have create permission.',
        confirmButtonColor: '#0e3a4c'
      });
      return;
    }

    this.passData = {};
    this.toggleSidebar('app-warehouse-create');
  }

  toggleSidebar(name: string): void {
    this._coreSidebarService.getSidebarRegistry(name).toggleOpen();
  }
}
