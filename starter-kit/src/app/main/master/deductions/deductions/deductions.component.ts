import { Component, OnInit, ViewChild } from '@angular/core';
import { NgForm } from '@angular/forms';
import * as feather from 'feather-icons';
import Swal from 'sweetalert2';
import { DeductionService } from './deductions.service';

@Component({
  selector: 'app-deductions',
  templateUrl: './deductions.component.html',
  styleUrls: ['./deductions.component.scss']
})
export class DeductionsComponent implements OnInit {

  @ViewChild('addForm') deductionForm!: NgForm;
  public id = 0;
  name: string = "";
  description: string = '';
  isDisplay: boolean = false;
  modeHeader: string = 'Add Deduction';
  resetButton: boolean = true;

  rows: any[] = [];
  deductionValue: any;
  isEditMode: boolean;

  constructor(private _deductionService: DeductionService) { }

  ngOnInit(): void {
    this.getAllDeduction();
  }

  ngAfterViewInit(): void {
    feather.replace();
  }

  ngAfterViewChecked(): void {
    feather.replace();
  }

  cancel() {
    this.isDisplay = false;
  }

  createDeduction() {
    this.isDisplay = true;
    this.modeHeader = 'Add Deduction';
    this.reset();
  }

  reset() {
    this.modeHeader = "Create Deduction";
    this.name = "";
    this.description = "";
    this.id = 0;
  }

  getAllDeduction() {
    this._deductionService.getDeduction().subscribe((response: any) => {
      this.rows = response.data;
    })
  }

  saveDeduction() {
    debugger

    const obj = {
      id: this.id,
      name: this.name,
      description: this.description,
      createdBy: '1',
      createdDate: new Date(),
      updatedBy: '1',
      updatedDate: new Date(),
      isActive: true,
    };
    if (this.id == 0) {
      this._deductionService.insertDeduction(obj).subscribe( {      

         next: () => {
                   Swal.fire({
                     icon: 'success',
                     title: 'Created!',
                     text: 'Deduction created successfully',
                     confirmButtonText: 'OK',
                     confirmButtonColor: '#0e3a4c'
                   });
                   this.getAllDeduction();
                   this.isDisplay = false;
                   this.isEditMode = false;
                 },
                 error: () => {
                   Swal.fire({
                     icon: 'error',
                     title: 'Error',
                     text: 'Failed to created Deduction',
                     confirmButtonText: 'OK',
                     confirmButtonColor: '#d33'
                   });
                 }

        
      });
    }
    else {
      this._deductionService.updateDeduction(obj).subscribe( {
          next: () => {
                   Swal.fire({
                     icon: 'success',
                     title: 'Updated!',
                     text: 'Deduction updated successfully',
                     confirmButtonText: 'OK',
                     confirmButtonColor: '#0e3a4c'
                   });
                   this.getAllDeduction();
                   this.isDisplay = false;
                   this.isEditMode = false;
                 },
                 error: () => {
                   Swal.fire({
                     icon: 'error',
                     title: 'Error',
                     text: 'Failed to update Deduction',
                     confirmButtonText: 'OK',
                     confirmButtonColor: '#d33'
                   });
                 }
      });
    }
  }



  getDeductionDetails(id: any) {
    debugger
    this._deductionService.getDeductionById(id).subscribe((arg: any) => {
      this.deductionValue = arg.data;
      this.id = this.deductionValue.id;
      this.name = this.deductionValue.name;
      this.description = this.deductionValue.description;
      this.isDisplay = true;
      this.resetButton = false;
      this.modeHeader = "Edit Deduction";
      this.isEditMode = true;
    });
  }

  deleteDeduction(id) {
    const _self = this;
    Swal.fire({
      title: "Are you sure?",
      text: "You won't be able to revert this!",
      icon: "success",
      showCancelButton: true,
      confirmButtonColor: "#7367F0",
      cancelButtonColor: "#E42728",
      confirmButtonText: "Yes, Delete it!",
      customClass: {
        confirmButton: "btn btn-primary",
        cancelButton: "btn btn-danger ml-1",
      },
      allowOutsideClick: false,
    }).then(function (result) {
      if (result.value) {
        _self._deductionService.deleteDeduction(id).subscribe((response: any) => {
          if (response.isSuccess) {
            Swal.fire({
              icon: "success",
              title: "Deleted!",
              text: response.message,
              allowOutsideClick: false,
            });
          } else {
            Swal.fire({
              icon: "error",
              title: "Error!",
              text: response.message,
              allowOutsideClick: false,
            });
          }
          _self.getAllDeduction();
        });
      }
    });
  }

}







