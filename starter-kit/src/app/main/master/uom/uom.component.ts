import { AfterViewChecked, AfterViewInit, Component, OnInit, ViewChild } from '@angular/core';
import { FormBuilder, FormGroup, NgForm, Validators } from '@angular/forms';
import { UomService } from './uom.service';
import Swal from 'sweetalert2';
import * as feather from 'feather-icons';

@Component({
  selector: 'app-uom',
  templateUrl: './uom.component.html',
  styleUrls: ['./uom.component.scss']
})
export class UomComponent implements OnInit, AfterViewChecked, AfterViewInit {
  @ViewChild('addForm') addForm!: NgForm;
  uomList: any[] = [];
  uomName: string = '';
  description: string = '';
  isEditMode = false;
  selectedUom: any = null;
  public isDisplay = false;
  private iconsReplaced = false;
  userId: string;
  constructor(private fb: FormBuilder,
    private uomService: UomService,) { 
       this.userId = localStorage.getItem('id');
    }

  ngOnInit(): void {
    this.loadUom();
  }
 ngAfterViewChecked(): void {
  setTimeout(() => {
    feather.replace();
  });
}

  ngAfterViewInit(): void {
    feather.replace();
  }
  // Load data from API
  loadUom() {
    debugger
    this.uomService.getAllUom().subscribe((res: any) => {
     this.uomList = res.data.filter((item: any) => item.isActive === true);
      setTimeout(() => feather.replace(), 0);
    });
  }

  // Show form for creating
  createUom() {
    this.isDisplay = true;
    this.isEditMode = false;
    this.selectedUom = null;
    this.reset();
  }

  // Show form for editing
  editUom(data: any) {
    this.isDisplay = true;       // show the form
    this.isEditMode = true;      // enable edit mode
    this.selectedUom = data;

    // patch the form fields
    this.uomName = data.name;       // bind to input
    this.description = data.description; // bind to textarea
  }
  cancel() {

    this.isEditMode = false;
    this.isDisplay = false;
  }

  reset() {
    this.uomName = '';
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
      Name: this.uomName,
      description: this.description,
      CreatedBy: this.userId,
      UpdatedBy: this.userId,
      UpdatedDate: new Date(),
      isActive: true,
    };

    if (this.isEditMode) {
      const updatedUom = { ...this.selectedUom, ...payload };
      this.uomService.updateUom(this.selectedUom.id, updatedUom).subscribe({
        next: () => {
          Swal.fire({
            icon: 'success',
            title: 'Updated!',
            text: 'Uom updated successfully',
            confirmButtonText: 'OK',
            confirmButtonColor: '#0e3a4c'
          });
          this.loadUom();
          this.cancel();
        },
        error: () => {
          Swal.fire({
            icon: 'error',
            title: 'Error',
            text: 'Failed to update Uom',
            confirmButtonText: 'OK',
            confirmButtonColor: '#d33'
          });
        }
      });
    } else {
      this.uomService.createUom(payload).subscribe({
        next: () => {
          Swal.fire({
            icon: 'success',
            title: 'Created!',
            text: 'Uom created successfully',
            confirmButtonText: 'OK',
            confirmButtonColor: '#0e3a4c'
          });
          this.loadUom();
          this.cancel();
        },
        error: () => {
          Swal.fire({
            icon: 'error',
            title: 'Error',
            text: 'Failed to create Uom',
            confirmButtonText: 'OK',
            confirmButtonColor: '#d33'
          });
        }
      });
    }
  }
  // Delete
  confirmdeleteUom(data: any) {
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
        this.deleteUom(data);
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
  deleteUom(item: any) {
    this.uomService.deleteUom(item.id).subscribe({
      next: (res) => {
        Swal.fire({
          icon: 'success',
          title: 'Deleted!',
          text: 'Uom deleted successfully',
          confirmButtonColor: '#3085d6'
        });
        this.ngOnInit();
      },
      error: (err) => {
        Swal.fire({
          icon: 'error',
          title: 'Error',
          text: 'Failed to delete Uom',
          confirmButtonColor: '#d33'
        });
      }
    });
  }

}
