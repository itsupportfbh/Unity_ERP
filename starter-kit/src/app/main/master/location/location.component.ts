import { Component, OnInit, ViewEncapsulation } from '@angular/core';
import { ColumnMode, SelectionType } from '@swimlane/ngx-datatable';
import { LocationService } from './location.service';
import { CoreSidebarService } from '@core/components/core-sidebar/core-sidebar.service';
import Swal from 'sweetalert2';
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
  createdBy: string;
  createdDate: string | Date;
  updatedBy: string;
  updatedDate: string | Date;
}
@Component({
  selector: 'app-location',
  templateUrl: './location.component.html',
  styleUrls: ['./location.component.scss'],
    encapsulation:ViewEncapsulation.None
})
export class LocationComponent implements OnInit {

 rows: LocationRow[] = [];
  tempData: LocationRow[] = []; // backup for filtering

  searchValue = '';
  pageSize = 10;

  ColumnMode = ColumnMode;
  SelectionType = SelectionType;

  selected: LocationRow[] = [];
  selectedLocationId: number;

constructor(private _locationService : LocationService, private _coreSidebarService: CoreSidebarService,){

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
  // For ngx-datatable template bindings



  ngOnInit(): void {
    this.getAllLocations();
  }

 toggleSidebar(name): void {
    this._coreSidebarService.getSidebarRegistry(name).toggleOpen();
  }
  getAllLocations(): void {
    this._locationService.getLocationDetails().subscribe((response: any) => {
      const data: LocationRow[] = response?.data ?? [];
      data.forEach(d => {
        d.createdDate = d.createdDate ? new Date(d.createdDate) : d.createdDate;
        d.updatedDate = d.updatedDate ? new Date(d.updatedDate) : d.updatedDate;
      });

      this.rows = data;
      this.tempData = [...data];
    });
  }

edit(id: number) {
  debugger
  this.selectedLocationId = id;      // Save selected ID
  this.toggleSidebar('app-create-location');  // Open sidebar
}
  onActivate(event: any) {
    // optional: row hover/click events
  }

  onSelect({ selected }: { selected: LocationRow[] }) {
    this.selected = [...selected];
  }


  deleteLocation(id: number) {
  Swal.fire({
    title: 'Are you sure?',
    text: "You won't be able to revert this!",
    icon: 'warning',
    showCancelButton: true,
    confirmButtonColor: '#7367F0',
    cancelButtonColor: '#E42728',
    confirmButtonText: 'Yes, Delete it!',
    customClass: {
      confirmButton: 'btn btn-primary',
      cancelButton: 'btn btn-danger ml-1'
    },
    allowOutsideClick: false,
  }).then((result) => {
    if (result.isConfirmed) {  // note: SweetAlert2 uses isConfirmed instead of value in recent versions
      this._locationService.deleteLocation(id).subscribe((response: any) => {
        Swal.fire({
          icon: response.isSuccess ? 'success' : 'error',
          title: response.isSuccess ? 'Deleted!' : 'Error!',
          text: response.message,
          allowOutsideClick: false,
        });
        this.getAllLocations();  // Refresh the list after deletion
      }, error => {
        Swal.fire({
          icon: 'error',
          title: 'Error!',
          text: 'Something went wrong while deleting.',
        });
      });
    }
  });
}

}