import { Component, OnInit, ViewEncapsulation } from '@angular/core';
import { ColumnMode, SelectionType } from '@swimlane/ngx-datatable';
import Swal from 'sweetalert2';

import { LocationService } from './location.service';
import { CoreSidebarService } from '@core/components/core-sidebar/core-sidebar.service';
import { FunctionPermission, PermissionService } from 'app/shared/permission.service';

interface LocationRow {
  id: number;
  name: string;
  address: string;
  cityId: number;
  cityName: string;
  stateId: number;
  stateName: string;
  countryId: number;
  countryName: string;
  latitude: string;
  longitude: string;
  isActive: boolean;
  createdBy: number;
  createdDate: string | Date;
  updatedBy: any;
  updatedDate: string | Date;
}

@Component({
  selector: 'app-location',
  templateUrl: './location.component.html',
  styleUrls: ['./location.component.scss'],
  encapsulation: ViewEncapsulation.None
})
export class LocationComponent implements OnInit {
  rows: LocationRow[] = [];
  tempData: LocationRow[] = [];

  searchValue = '';
  pageSize = 10;

  ColumnMode = ColumnMode;
  SelectionType = SelectionType;

  selected: LocationRow[] = [];
  selectedLocationId: number | null = null;

  userId: number = 0;

  // IMPORTANT: DB/Menu permission code exact ah match aaganum
  functionId = 'location';

  permission: FunctionPermission;
  isPermissionLoaded = false;
  isPageLoading = false;

  constructor(
    private _locationService: LocationService,
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
          this.getAllLocations();
        } else {
          this.rows = [];
          this.tempData = [];
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

  filterUpdate(): void {
    const val = (this.searchValue || '').toLowerCase().trim();

    if (!val) {
      this.rows = [...this.tempData];
      return;
    }

    this.rows = this.tempData.filter((d) => {
      return (
        (d.name ?? '').toLowerCase().includes(val) ||
        (d.address ?? '').toLowerCase().includes(val) ||
        (d.cityName ?? '').toLowerCase().includes(val) ||
        (d.stateName ?? '').toLowerCase().includes(val) ||
        (d.countryName ?? '').toLowerCase().includes(val) ||
        (d.latitude ?? '').toLowerCase().includes(val) ||
        (d.longitude ?? '').toLowerCase().includes(val)
      );
    });
  }

  addNew(): void {
    if (!this.canCreate()) {
      Swal.fire({
        icon: 'warning',
        title: 'Access Denied',
        text: 'You do not have create permission.',
        confirmButtonColor: '#0e3a4c'
      });
      return;
    }

    this.selectedLocationId = null;
    this.toggleSidebar('app-create-location');
  }

  toggleSidebar(name: string): void {
    this._coreSidebarService.getSidebarRegistry(name).toggleOpen();
  }

  getAllLocations(): void {
    this._locationService.getLocationDetails().subscribe({
      next: (response: any) => {
        const data: LocationRow[] = response?.data ?? [];

        data.forEach(d => {
          d.createdDate = d.createdDate ? new Date(d.createdDate) : d.createdDate;
          d.updatedDate = d.updatedDate ? new Date(d.updatedDate) : d.updatedDate;
        });

        this.rows = data;
        this.tempData = [...data];
      },
      error: (err) => {
        console.error('Load locations error:', err);
        this.rows = [];
        this.tempData = [];
      }
    });
  }

  edit(id: number): void {
    if (!this.canEdit()) {
      Swal.fire({
        icon: 'warning',
        title: 'Access Denied',
        text: 'You do not have edit permission.',
        confirmButtonColor: '#0e3a4c'
      });
      return;
    }

    this.selectedLocationId = id;
    this.toggleSidebar('app-create-location');
  }

  onActivate(event: any): void {}

  onSelect({ selected }: { selected: LocationRow[] }): void {
    this.selected = [...selected];
  }

  deleteLocation(id: number): void {
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
      text: 'You will not be able to revert this!',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#d33',
      cancelButtonColor: '#3085d6',
      confirmButtonText: 'Yes, Delete it!',
      cancelButtonText: 'Cancel',
      allowOutsideClick: false
    }).then((result) => {
      if (result.isConfirmed) {
        this._locationService.deleteLocation(id).subscribe({
          next: (response: any) => {
            Swal.fire({
              icon: response?.isSuccess ? 'success' : 'error',
              title: response?.isSuccess ? 'Deleted!' : 'Error!',
              text: response?.message || (
                response?.isSuccess
                  ? 'Location deleted successfully'
                  : 'Failed to delete location'
              ),
              allowOutsideClick: false
            });

            this.getAllLocations();
          },
          error: (err) => {
            Swal.fire({
              icon: 'error',
              title: 'Error!',
              text: err?.error?.message || err?.message || 'Something went wrong while deleting.',
              confirmButtonColor: '#d33'
            });
          }
        });
      }
    });
  }
}