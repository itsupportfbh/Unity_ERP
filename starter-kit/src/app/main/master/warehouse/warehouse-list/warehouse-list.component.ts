import { Component, OnInit, ViewChild, ViewEncapsulation } from '@angular/core';
import { Router } from '@angular/router';
import Swal from 'sweetalert2';
import { ColumnMode, DatatableComponent } from '@swimlane/ngx-datatable';
import { WarehouseService } from '../warehouse.service';
import { WarehouseCreateComponent } from '../warehouse-create/warehouse-create.component';
import { CoreSidebarService } from '@core/components/core-sidebar/core-sidebar.service';

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
  constructor(private warehouseService: WarehouseService, private router: Router,
    private _coreSidebarService: CoreSidebarService,
  ) { }
  ngOnInit(): void {
    this.loadRequests();
  }
  filterUpdate(event) {

    const val = event.target.value.toLowerCase();
    const temp = this.tempData.filter(function (d) {

      if (d.name.toLowerCase().indexOf(val) !== -1 || !val) {
        return d.name.toLowerCase().indexOf(val) !== -1 || !val;
      }
      if (d.countryName.toLowerCase().indexOf(val) !== -1 || !val) {
        return d.countryName.toLowerCase().indexOf(val) !== -1 || !val;
      }
      if (d.stateName.toLowerCase().indexOf(val) !== -1 || !val) {
        return d.stateName.toLowerCase().indexOf(val) !== -1 || !val;
      }
      if (d.cityName.toLowerCase().indexOf(val) !== -1 || !val) {
        return d.cityName.toLowerCase().indexOf(val) !== -1 || !val;
      }
      if (d.phone.toLowerCase().indexOf(val) !== -1 || !val) {
        return d.phone.toLowerCase().indexOf(val) !== -1 || !val;
      }

    });
    this.rows = temp;
    this.table.offset = 0;
  }
  getRandomColor(index: number): string {
    return this.colors[index % this.colors.length];
  }


  getInitial(orgName: string): string {
    // Get the first two characters, or the entire string if it's shorter
    const initials = orgName.slice(0, 2).toUpperCase();
    return initials;
  }
  loadRequests() {
    this.warehouseService.getWarehouse().subscribe({
      next: (res: any) => {
        this.rows = res.data.map((req: any) => {
          return {
            ...req,
          };
        });
        this.tempData = this.rows
      },
      error: (err: any) => console.error('Error loading list', err)
    });
  }


  editWarehouse(row: any) {
    this.passData = { ...row };                  // edit mode
    this.toggleSidebar('app-warehouse-create');
  }

  deleteWarehouse(id: number) {
    Swal.fire({
      title: 'Are you sure?',
      text: 'This will permanently delete the Warehouse.',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#d33',
      cancelButtonColor: '#3085d6',
      confirmButtonText: 'Yes, delete it!'
    }).then((result) => {
      if (result.isConfirmed) {
        this.warehouseService.deleteWarehouse(id).subscribe({
          next: () => {
            this.loadRequests();
            Swal.fire('Deleted!', 'Warehouse has been deleted.', 'success');
          },
          error: (err) => console.error('Error deleting request', err)
        });
      }
    });
  }
  toggleLines(req: any) {
    // Toggle showLines only for the clicked PR
    req.showLines = !req.showLines;
  }
  onRowExpandClick(row: any) {
    // Expand/Collapse the row
    this.rowDetailsToggleExpand(row);

    // Show SweetAlert fade-in
    this.SweetAlertFadeIn.fire();
  }
  rowDetailsToggleExpand(row: any) {
    row.$$expanded = !row.$$expanded; // toggle expand
  }
  openCreate() {
    this.passData = {};                          // create mode
    this.toggleSidebar('app-warehouse-create');
  }
  toggleSidebar(name): void {    
    this._coreSidebarService.getSidebarRegistry(name).toggleOpen();
  }

}