import { Component, OnInit, ViewEncapsulation } from '@angular/core';
import { ColumnMode, SelectionType } from '@swimlane/ngx-datatable';

import { CoreSidebarService } from '@core/components/core-sidebar/core-sidebar.service';
import Swal from 'sweetalert2';
import { SupplierService } from './supplier.service';
import { Router } from '@angular/router';
interface SupplierRow {
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
  selector: 'app-supplier',
  templateUrl: './supplier.component.html',
  styleUrls: ['./supplier.component.scss'],
  encapsulation:ViewEncapsulation.None,
})
export class SupplierComponent implements OnInit {

 rows: SupplierRow[] = [];
  tempData: SupplierRow[] = []; // backup for filtering

  searchValue = '';
  pageSize = 10;

  ColumnMode = ColumnMode;
  SelectionType = SelectionType;

  selected: SupplierRow[] = [];
  selectedSupplierId: number;

constructor(private _SupplierService : SupplierService,
   private _coreSidebarService: CoreSidebarService,
  private router: Router){

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
    this.getAllSupplier();
  }

 toggleSidebar(name): void {
    this._coreSidebarService.getSidebarRegistry(name).toggleOpen();
  }
   getAllSupplier() {
    this._SupplierService.GetAllSupplier().subscribe((response: any) => {
      this.rows = response.data;
      this.tempData = this.rows;
    })
  }

edit(id: number) {
  this.router.navigate(['/Businesspartners/supplier/edit', id]);
}
  onActivate(event: any) {
    // optional: row hover/click events
  }

  onSelect({ selected }: { selected: SupplierRow[] }) {
    this.selected = [...selected];
  }


  deleteSupplier(id: number) {
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
      this._SupplierService.deleteSupplier(id).subscribe((response: any) => {
        Swal.fire({
          icon: response.isSuccess ? 'success' : 'error',
          title: response.isSuccess ? 'Deleted!' : 'Error!',
          text: response.message,
          allowOutsideClick: false,
        });
        this.getAllSupplier();  // Refresh the list after deletion
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


  addSupplier() {
  this.router.navigate(['/Businesspartners/supplier/create']);
}


  editSupplier(id: number) {
    this.router.navigate(['/suppliers/edit', id]); // ✅ navigate to Edit Supplier page
  }
}
