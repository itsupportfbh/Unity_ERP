import { Component, OnInit, ViewChild } from '@angular/core';
import { FormBuilder, NgForm } from '@angular/forms';
import Swal from 'sweetalert2';
import { ItemTypeService } from './item-type.service';
import * as feather from 'feather-icons';

@Component({
  selector: 'app-item-type',
  templateUrl: './item-type.component.html',
  styleUrls: ['./item-type.component.scss']
})
export class ItemTypeComponent implements OnInit {

 
 @ViewChild('addForm') addForm!: NgForm;
  ItemTypeList: any[] = [];
  itemTypeName: string = '';
  description: string = '';
  isEditMode = false;
  selectedItemType: any = null;
  public isDisplay = false;
  private iconsReplaced = false;
  userId: string;
  constructor(private fb: FormBuilder,
    private ItemTypeService: ItemTypeService,) {
       this.userId = localStorage.getItem('id');
     }

  ngOnInit(): void {
    this.loadItemType();
  }
  ngAfterViewChecked(): void {
    feather.replace();  // remove the guard so icons refresh every cycle
  }
  ngAfterViewInit(): void {
    feather.replace();
  }
  // Load data from API
  loadItemType() {
    debugger
    this.ItemTypeService.getAllItemType().subscribe((res: any) => {
     this.ItemTypeList = res.data.filter((item: any) => item.isActive === true);
      setTimeout(() => feather.replace(), 0);
    });
  }

  // Show form for creating
  createItemType() {
    this.isDisplay = true;
    this.isEditMode = false;
    this.selectedItemType = null;
    this.reset();
  }

  // Show form for editing
  editItemType(data: any) {
    this.isDisplay = true;       // show the form
    this.isEditMode = true;      // enable edit mode
    this.selectedItemType = data;

    // patch the form fields
    this.itemTypeName = data.itemTypeName;       // bind to input
    this.description = data.description; // bind to textarea
  }
  cancel() {

    this.isEditMode = false;
    this.isDisplay = false;
  }

  reset() {
    this.itemTypeName = '';
    this.description = '';
  }

  // Save or update
onSubmit(form: any) {
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

  const payload = {
    itemTypeName: this.itemTypeName,
    description: this.description,
    CreatedBy: '1',
    UpdatedBy: '1',
    UpdatedDate: new Date(),
    isActive: true,
  };

  const showApiMessage = (res: any, successText: string) => {
    if (res?.isSuccess === false) {
      Swal.fire({
        icon: 'error',
        title: 'Warning',
        text: res?.message || 'Operation failed',
        confirmButtonText: 'OK',
        confirmButtonColor: '#0e3a4c'
      });
      return;
    }

    Swal.fire({
      icon: 'success',
      title: 'Success!',
      text: res?.message || successText,
      confirmButtonText: 'OK',
      confirmButtonColor: '#0e3a4c'
    });

    this.loadItemType();
    this.cancel();
  };

  if (this.isEditMode) {
    const updatedItemType = { ...this.selectedItemType, ...payload };

    this.ItemTypeService
      .updateItemType(this.selectedItemType.id, updatedItemType)
      .subscribe({
        next: (res: any) => showApiMessage(res, 'ItemType updated successfully'),
        error: (err) => {
          Swal.fire({
            icon: 'error',
            title: 'Error',
            text: err?.error?.message || 'Failed to update ItemType',
            confirmButtonText: 'OK',
            confirmButtonColor: '#d33'
          });
        }
      });

  } else {
    this.ItemTypeService
      .createItemType(payload)
      .subscribe({
        next: (res: any) => showApiMessage(res, 'ItemType created successfully'),
        error: (err) => {
          Swal.fire({
            icon: 'error',
            title: 'Error',
            text: err?.error?.message || 'Failed to create ItemType',
            confirmButtonText: 'OK',
            confirmButtonColor: '#d33'
          });
        }
      });
  }
}

  // Delete
  confirmdeleteItemType(data: any) {
    Swal.fire({
      title: 'Confirm Delete',
      text: 'Are you sure you want to delete this item?',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Delete',
      cancelButtonText: 'Cancel',
      confirmButtonColor: '#d33',
      cancelButtonColor: '#3085d6'
    }).then((result) => {
      if (result.isConfirmed) {
        this.deleteItemType(data);
        Swal.fire({
          icon: 'success',
          title: 'Deleted!',
          text: 'Item has been deleted.',
          confirmButtonColor: '#3085d6'
        });
      }
    });
  }
  // Delete
  deleteItemType(item: any) {
    this.ItemTypeService.deleteItemType(item.id).subscribe({
      next: (res) => {
        Swal.fire({
          icon: 'success',
          title: 'Deleted!',
          text: 'ItemType deleted successfully',
          confirmButtonColor: '#3085d6'
        });
        this.ngOnInit();
      },
      error: (err) => {
        Swal.fire({
          icon: 'error',
          title: 'Error',
          text: 'Failed to delete ItemType',
          confirmButtonColor: '#d33'
        });
      }
    });
  }




}
