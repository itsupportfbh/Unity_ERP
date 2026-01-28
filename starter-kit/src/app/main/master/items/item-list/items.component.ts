import { Component, OnInit, ViewChild, ViewEncapsulation } from '@angular/core';
import { CoreSidebarService } from '@core/components/core-sidebar/core-sidebar.service';
import { ColumnMode, DatatableComponent } from '@swimlane/ngx-datatable';
import { ItemsService } from '../items.service';
import Swal from 'sweetalert2'; // <-- add this

@Component({
  selector: 'app-items',
  templateUrl: './items.component.html',
  styleUrls: ['./items.component.scss'],
  encapsulation: ViewEncapsulation.None
})
export class ItemsComponent implements OnInit {
  @ViewChild(DatatableComponent) table: DatatableComponent;

  rows: any[] = [];
  tempData: any[] = [];

  public searchValue = '';
  public ColumnMode = ColumnMode;
  public selectedOption = 6;

  // <-- keep track of which item to edit
  selectedItemId: number | null = null;

  constructor(
    private _coreSidebarService: CoreSidebarService,
    private itemsService: ItemsService
  ) {}

  ngOnInit(): void {
    this.loadItem();
  }

  loadItem(): void {
    this.itemsService.getAllItem().subscribe((res: any) => {
      const data = (res?.data || []).filter((i: any) => i.isActive === true);
      this.rows = data;
      this.tempData = [...data]; // for filtering
    });
  }

  // Open sidebar for CREATE
  openCreate(): void {
    this.selectedItemId = null;
    this.toggleSidebar('app-createitemsidebar');
  }

  // Open sidebar for EDIT
  editRequest(id: number): void {
    this.selectedItemId = id;
    this.toggleSidebar('app-createitemsidebar');
  }

  // DELETE with confirm
  deleteRequest(id: number): void {
    Swal.fire({
      title: 'Confirm Delete',
      text: 'Are you sure you want to delete this item?',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Delete',
      cancelButtonText: 'Cancel',
      buttonsStyling: false,
      customClass: {
        confirmButton: 'btn btn-danger',
        cancelButton: 'btn btn-primary ml-2'
      }
    }).then(r => {
      if (!r.isConfirmed) return;

      // Adjust to your service method (delete/Deactivate)
      this.itemsService.deleteItem(id).subscribe({
        next: () => {
          Swal.fire({
            icon: 'success',
            title: 'Deleted!',
            text: 'Item deleted successfully',
            confirmButtonText: 'OK',
            buttonsStyling: false,
            customClass: { confirmButton: 'btn btn-primary' }
          });
          this.loadItem();
        },
        error: (err) => {
          Swal.fire({
            icon: 'error',
            title: 'Error',
            text: err?.error?.message || err?.message || 'Failed to delete item',
            confirmButtonText: 'OK',
            buttonsStyling: false,
            customClass: { confirmButton: 'btn btn-danger' }
          });
        }
      });
    });
  }

  // Search (use item fields, not org*)
  filterUpdate(event: any): void {
    const val = (event?.target?.value || '').toString().toLowerCase();

    const keys = ['itemCode', 'itemName', 'uomName', 'budgetLineName'];
    const temp = this.tempData.filter((d: any) =>
      keys.some(k => (d[k] ?? '').toString().toLowerCase().includes(val))
    );

    this.rows = temp;
    if (this.table) this.table.offset = 0;
  }

  toggleSidebar(name: string): void {
    this._coreSidebarService.getSidebarRegistry(name).toggleOpen();
  }
}
