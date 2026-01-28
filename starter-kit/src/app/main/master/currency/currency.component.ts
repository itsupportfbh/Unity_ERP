import { Component, OnInit, ViewChild } from '@angular/core';
import Swal from 'sweetalert2';
import * as feather from 'feather-icons';
import { FormBuilder, NgForm } from '@angular/forms';
import { CurrencyService } from './currency.service';

@Component({
  selector: 'app-currency',
  templateUrl: './currency.component.html',
  styleUrls: ['./currency.component.scss']
})
export class CurrencyComponent implements OnInit {
 @ViewChild('addForm') addForm!: NgForm;
  CurrencyList: any[] = [];
  CurrencyName: string = '';
  description: string = '';
  isEditMode = false;
  selectedCurrency: any = null;
  public isDisplay = false;
  private iconsReplaced = false;
  userId: string;
  constructor(private fb: FormBuilder,
    private CurrencyService: CurrencyService,) {
       this.userId = localStorage.getItem('id');
     }

  ngOnInit(): void {
    this.loadCurrency();
  }
  ngAfterViewChecked(): void {
    feather.replace();  // remove the guard so icons refresh every cycle
  }
  ngAfterViewInit(): void {
    feather.replace();
  }
  // Load data from API
  loadCurrency() {
    debugger
    this.CurrencyService.getAllCurrency().subscribe((res: any) => {
     this.CurrencyList = res.data.filter((item: any) => item.isActive === true);
      setTimeout(() => feather.replace(), 0);
    });
  }

  // Show form for creating
  createCurrency() {
    this.isDisplay = true;
    this.isEditMode = false;
    this.selectedCurrency = null;
    this.reset();
  }

  // Show form for editing
  editCurrency(data: any) {
    this.isDisplay = true;       // show the form
    this.isEditMode = true;      // enable edit mode
    this.selectedCurrency = data;

    // patch the form fields
    this.CurrencyName = data.currencyName;       // bind to input
    this.description = data.description; // bind to textarea
  }
  cancel() {

    this.isEditMode = false;
    this.isDisplay = false;
  }

  reset() {
    this.CurrencyName = '';
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
    CurrencyName: this.CurrencyName,
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

    this.loadCurrency();
    this.cancel();
  };

  if (this.isEditMode) {
    const updatedCurrency = { ...this.selectedCurrency, ...payload };

    this.CurrencyService
      .updateCurrency(this.selectedCurrency.id, updatedCurrency)
      .subscribe({
        next: (res: any) => showApiMessage(res, 'Currency updated successfully'),
        error: (err) => {
          Swal.fire({
            icon: 'error',
            title: 'Error',
            text: err?.error?.message || 'Failed to update Currency',
            confirmButtonText: 'OK',
            confirmButtonColor: '#d33'
          });
        }
      });

  } else {
    this.CurrencyService
      .createCurrency(payload)
      .subscribe({
        next: (res: any) => showApiMessage(res, 'Currency created successfully'),
        error: (err) => {
          Swal.fire({
            icon: 'error',
            title: 'Error',
            text: err?.error?.message || 'Failed to create Currency',
            confirmButtonText: 'OK',
            confirmButtonColor: '#d33'
          });
        }
      });
  }
}

  // Delete
  confirmdeleteCurrency(data: any) {
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
        this.deleteCurrency(data);
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
  deleteCurrency(item: any) {
    this.CurrencyService.deleteCurrency(item.id).subscribe({
      next: (res) => {
        Swal.fire({
          icon: 'success',
          title: 'Deleted!',
          text: 'Currency deleted successfully',
          confirmButtonColor: '#3085d6'
        });
        this.ngOnInit();
      },
      error: (err) => {
        Swal.fire({
          icon: 'error',
          title: 'Error',
          text: 'Failed to delete Currency',
          confirmButtonColor: '#d33'
        });
      }
    });
  }

}
