import { Component, OnInit, ViewChild, ViewEncapsulation } from '@angular/core';
import { ItemMasterService } from '../item-master.service';
import { Router } from '@angular/router';
import { NgbModal, NgbModalRef } from '@ng-bootstrap/ng-bootstrap';
import Swal from 'sweetalert2';

export interface ItemMaster {
  id: number;
  sku: string;
  itemName: string;
  catagoryName?: string;
  uomName?: string;
  wareHouse?: string; // matches your payload key
  // add other keys if your API returns them (e.g., bin, brand, etc.)
}
interface ListRow { id: number; sku: string; name: string;}
@Component({
  selector: 'app-item-master-list',
  templateUrl: './item-master-list.component.html',
  styleUrls: ['./item-master-list.component.scss'],
  encapsulation: ViewEncapsulation.None
})
export class ItemMasterListComponent implements OnInit {
@ViewChild('itemViewModal') itemViewModalTemplate: any;
  ItemMasterList: any;
 rows: ItemMaster[] = [];
  filteredRows: ItemMaster[] = [];

   // paging + search
  pageSizes = [10, 25, 50, 100];
  pageSize = 10;
  searchValue = '';

    // ui state
  loading = false;
  errorMsg: string | null = null;
   currentItem: { id: number; sku: string; name: string } | null = null;
  activeTab: 'warehouse' | 'supplier' | 'audit' = 'warehouse';
  modalRef?: NgbModalRef;

  warehouseRows: any[] = [];
  supplierRows: any[] = [];
  auditRows: any[] = [];
  selectedAudit: any | null = null;
  constructor(private itemMasterService : ItemMasterService,  private router: Router,private modal: NgbModal) { }

  ngOnInit(): void {
    this.loadMasterItem();
  }


  loadMasterItem(): void {
    this.loading = true;
    this.errorMsg = null;

    this.itemMasterService.getAllItemMaster().subscribe({
      next: (res: any) => {
        // expecting: { isSuccess: true, data: [...] }
        const list: ItemMaster[] = Array.isArray(res?.data) ? res.data : [];
        this.rows = list;
        this.filteredRows = [...list]; // initial render
        this.loading = false;
      },
      error: (err) => {
        this.loading = false;
        this.errorMsg = 'Failed to load Item Master list.';
        console.error('Item Master load error', err);
      }
    });
  }

  /** Search filter across common fields */
  applyFilter(): void {
    const q = (this.searchValue || '').toLowerCase().trim();
    if (!q) {
      this.filteredRows = [...this.rows];
      return;
    }

    this.filteredRows = this.rows.filter(r => {
      const id = String(r.id ?? '').toLowerCase();
      const sku = String(r.sku ?? '').toLowerCase();
      const name = String(r.itemName ?? '').toLowerCase();
      const cat = String(r.catagoryName ?? '').toLowerCase();
      const uom = String(r.uomName ?? '').toLowerCase();
      const wh  = String(r.wareHouse ?? '').toLowerCase();

      return (
        id.includes(q) ||
        sku.includes(q) ||
        name.includes(q) ||
        cat.includes(q) ||
        uom.includes(q) ||
        wh.includes(q)
      );
    });
  }

  /** Eye action */
  openView(row: ItemMaster): void {
    // TODO: open a modal or navigate to a detail page
    // this.router.navigate(['/inventory/item-master/view', row.id]);
    console.log('view', row);
  }

  /** Edit action */
  editItem(id: number): void {
   this.router.navigateByUrl(`/Inventory/Edit-itemmaster/${id}`);
  }

 
    goToCreateItem(): void {
    this.router.navigate(['/Inventory/Create-itemmaster']);
  }
    openLinesModal(row: ListRow) {
    this.currentItem = { id: Number(row.id), sku: row.sku, name: row.name };
    this.activeTab = 'warehouse';
    this.modalRef = this.modal.open(this.itemViewModalTemplate, { size: 'xl',
      centered: true,
      backdrop: 'static',
      keyboard: true,
      scrollable: true,
      windowClass: 'item-modal' });
    // load default tab
    this.loadWarehouse();
  }

  switchTab(tab: 'warehouse' | 'supplier' | 'audit') {
    if (!this.currentItem) return;
    this.activeTab = tab;
    if (tab === 'warehouse') this.loadWarehouse();
    if (tab === 'supplier') this.loadSupplier();
    if (tab === 'audit') this.loadAudit();
  }
 closeModal() {
    this.modalRef?.close();
  }
   loadWarehouse() {
    if (!this.currentItem) return;
    this.itemMasterService.getWarehouseStock(this.currentItem.id).subscribe((rows:any) => {
      // Optionally compute Available if your DB column is null
      this.warehouseRows = rows.data.map((r: any) => ({
        ...r,
        available: r.available ?? (Number(r.onHand || 0) - Number(r.reserved || 0))
      }));
    });
  }

   loadSupplier() {
    if (!this.currentItem) return;
    this.itemMasterService.getSupplierPrices(this.currentItem.id).subscribe((rows:any) => this.supplierRows = rows.data);
  }

   loadAudit() {
    if (!this.currentItem) return;
    this.itemMasterService.getAudit(this.currentItem.id).subscribe((rows:any) => {
      this.auditRows = rows.data;
      this.selectedAudit = null;
    });
  }

  onAuditRowSelect(row: any) { this.selectedAudit = row; }




deleteItem(id: number) {
  if (!id) return;

  Swal.fire({
    title: 'Delete this item?',
    text: 'This action cannot be undone.',
    icon: 'warning',
    showCancelButton: true,
    confirmButtonText: 'Yes, delete',
    cancelButtonText: 'Cancel',
    reverseButtons: true,
    buttonsStyling: false,         // we will fully style via didOpen
    didOpen: (el) => {
      // add spacing between buttons
      const actions = el.querySelector('.swal2-actions') as HTMLElement | null;
      if (actions) {
        actions.style.display = 'flex';
        actions.style.gap = '14px';
        actions.style.marginTop = '10px';
      }

      // style confirm button
      const confirmBtn = el.querySelector('.swal2-confirm') as HTMLButtonElement | null;
      if (confirmBtn) {
        confirmBtn.style.background = '#dc2626';
        confirmBtn.style.color = '#fff';
        confirmBtn.style.border = 'none';
        confirmBtn.style.borderRadius = '10px';
        confirmBtn.style.padding = '10px 16px';
        confirmBtn.style.cursor = 'pointer';
        confirmBtn.style.fontWeight = '600';
      }

      // style cancel button
      const cancelBtn = el.querySelector('.swal2-cancel') as HTMLButtonElement | null;
      if (cancelBtn) {
        cancelBtn.style.background = '#6b7280';
        cancelBtn.style.color = '#fff';
        cancelBtn.style.border = 'none';
        cancelBtn.style.borderRadius = '10px';
        cancelBtn.style.padding = '10px 16px';
        cancelBtn.style.cursor = 'pointer';
        cancelBtn.style.fontWeight = '600';
      }
    }
  }).then(result => {
    if (!result.isConfirmed) return;

    Swal.fire({
      title: 'Deleting…',
      allowOutsideClick: false,
      didOpen: () => Swal.showLoading()
    });

    this.itemMasterService.deleteItemMaster(id).subscribe({
      next: (res) => {
        Swal.close();
        Swal.fire({
          icon: 'success',
          title: 'Deleted',
          text: (res?.message) || 'Item deleted successfully.',
          timer: 1200,
          showConfirmButton: false
        });
        this.loadMasterItem?.();
      },
      error: (err) => {
        Swal.close();
        let msg = 'Failed to delete the item.';
        if (err?.status === 409) msg = 'Cannot delete: item is referenced by other records.';
        else if (err?.status === 404) msg = 'Item not found (maybe already deleted).';

        Swal.fire({ icon: 'error', title: 'Error', text: msg });
      }
    });
  });
}


}