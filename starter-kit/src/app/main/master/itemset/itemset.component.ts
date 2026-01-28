import { Component, OnInit, ViewChild, AfterViewInit, AfterViewChecked } from '@angular/core';
import { NgForm } from '@angular/forms';
import Swal from 'sweetalert2';
import * as feather from 'feather-icons';
import { ItemsetService } from './itemsetservice/itemset.service';
import { ItemMasterService } from 'app/main/inventory/item-master/item-master.service';

type ItemMaster = {
  id: number;
  itemCode?: string;
  itemName: string;
  itemType?: string | null;
  isActive?: boolean;
};

@Component({
  selector: 'app-itemset',
  templateUrl: './itemset.component.html',
  styleUrls: ['./itemset.component.scss']
})
export class ItemsetComponent implements OnInit, AfterViewInit, AfterViewChecked {

  @ViewChild('addForm') addForm!: NgForm;

  // list
  itemSetList: any[] = [];

  // form fields
  setName: string = '';
  selectedItemIds: number[] = [];

  // dropdown source
  itemsMaster: ItemMaster[] = [];

  // ui state
  isEditMode = false;
  selectedItemSet: any = null;
  isDisplay = false;
  modeHeader = 'Create Item Set';

  userId: string = 'system';

  constructor(
    private itemSetService: ItemsetService,
    private itemMasterService: ItemMasterService
  ) {
    this.userId = localStorage.getItem('id') || 'system';
  }

  ngOnInit(): void {
    this.loadItemSets();
    this.loadItemsMaster();
  }

  ngAfterViewInit(): void {
    feather.replace();
  }

  ngAfterViewChecked(): void {
    setTimeout(() => feather.replace(), 0);
  }

  // =========================
  // Load Item Sets
  // =========================
  loadItemSets() {
    this.itemSetService.getAllItemSet().subscribe({
      next: (res: any) => {
        const data = res?.data ?? res ?? [];
        this.itemSetList = (data || []).filter((x: any) => x.isActive === true);
        setTimeout(() => feather.replace(), 0);
      },
      error: () => {
        this.itemSetList = [];
      }
    });
  }

  // =========================
  // Load Items Master (FIXED)
  // =========================
  loadItemsMaster() {
    this.itemMasterService.getAllItemMaster().subscribe({
      next: (res: any) => {
        // your sample: { isSuccess, message, data: [...] }
        const data = res?.data ?? [];

        // ✅ IMPORTANT FIX: itemType is null in your API, so DO NOT filter by finishedfoods.
       this.itemsMaster = (data || []).filter((x: any) =>
        x?.isActive === true && Number(x?.itemTypeId) === 1   // ✅ only typeId=1
      );

        // debug
        console.log('Items loaded:', this.itemsMaster.length);
      },
      error: () => {
        this.itemsMaster = [];
      }
    });
  }

  // =========================
  // Create mode
  // =========================
  createItemSet() {
    this.isDisplay = true;
    this.isEditMode = false;
    this.selectedItemSet = null;
    this.modeHeader = 'Create Item Set';
    this.reset();
  }

  // =========================
  // Edit mode
  // =========================
  editItemSet(data: any) {
    this.isDisplay = true;
    this.isEditMode = true;
    this.selectedItemSet = data;
    this.modeHeader = 'Edit Item Set';

    this.setName = data?.setName || '';

    // backend returns Items: [{ itemId, ... }]
    this.selectedItemIds = (data?.items || []).map((x: any) => Number(x.itemId));
  }

  cancel() {
    this.isEditMode = false;
    this.isDisplay = false;
  }

  reset() {
    this.setName = '';
    this.selectedItemIds = [];
  }

  // =========================
  // Submit (Create/Update)
  // =========================
  onSubmit(form: NgForm) {
    if (!form.valid) {
      Swal.fire({
        icon: 'warning',
        title: 'Warning',
        text: 'Please fill all required fields',
        confirmButtonText: 'OK',
        confirmButtonColor: '#0e3a4c'
      });
      return;
    }

    if (!this.selectedItemIds || this.selectedItemIds.length === 0) {
      Swal.fire({
        icon: 'warning',
        title: 'Warning',
        text: 'Please select at least one item',
        confirmButtonText: 'OK',
        confirmButtonColor: '#0e3a4c'
      });
      return;
    }

    const payload = {
      setName: this.setName,
      createdBy: this.userId,
      updatedBy: this.userId,
      createdDate: new Date(),
      updatedDate: new Date(),
      isActive: true,

      // IMPORTANT: backend expects Items list (mapping)
      items: this.selectedItemIds.map(id => ({
        itemId: id,
        isActive: true,
        createdBy: this.userId,
        createdDate: new Date()
      }))
    };

    if (this.isEditMode) {
      const updated = { ...this.selectedItemSet, ...payload };

      this.itemSetService.updateItemSet(this.selectedItemSet.id, updated).subscribe({
        next: () => {
          Swal.fire({
            icon: 'success',
            title: 'Updated!',
            text: 'Item Set updated successfully',
            confirmButtonText: 'OK',
            confirmButtonColor: '#0e3a4c'
          });
          this.loadItemSets();
          this.cancel();
        },
        error: () => {
          Swal.fire({
            icon: 'error',
            title: 'Error',
            text: 'Failed to update Item Set',
            confirmButtonText: 'OK',
            confirmButtonColor: '#d33'
          });
        }
      });

    } else {

      this.itemSetService.createItemSet(payload).subscribe({
        next: () => {
          Swal.fire({
            icon: 'success',
            title: 'Created!',
            text: 'Item Set created successfully',
            confirmButtonText: 'OK',
            confirmButtonColor: '#0e3a4c'
          });
          this.loadItemSets();
          this.cancel();
        },
        error: () => {
          Swal.fire({
            icon: 'error',
            title: 'Error',
            text: 'Failed to create Item Set',
            confirmButtonText: 'OK',
            confirmButtonColor: '#d33'
          });
        }
      });

    }
  }

  // =========================
  // Delete
  // =========================
  confirmDeleteItemSet(data: any) {
    Swal.fire({
      title: 'Confirm Delete',
      text: 'Are you sure you want to delete this Item Set?',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Delete',
      cancelButtonText: 'Cancel',
      confirmButtonColor: '#d33',
      cancelButtonColor: '#3085d6'
    }).then((result) => {
      if (result.isConfirmed) this.deleteItemSet(data);
    });
  }

  deleteItemSet(item: any) {
    this.itemSetService.deleteItemSet(item.id).subscribe({
      next: () => {
        Swal.fire({
          icon: 'success',
          title: 'Deleted!',
          text: 'Item Set deleted successfully',
          confirmButtonColor: '#3085d6'
        });
        this.loadItemSets();
      },
      error: () => {
        Swal.fire({
          icon: 'error',
          title: 'Error',
          text: 'Failed to delete Item Set',
          confirmButtonColor: '#d33'
        });
      }
    });
  }
}
