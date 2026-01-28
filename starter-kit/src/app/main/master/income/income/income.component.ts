import { Component, OnInit, ViewChild } from '@angular/core';
import { NgForm } from '@angular/forms';
import * as feather from 'feather-icons';
import Swal from 'sweetalert2';
import { IncomeService } from './income.service';

@Component({
  selector: 'app-income',
  templateUrl: './income.component.html',
  styleUrls: ['./income.component.scss']
})
export class IncomeComponent implements OnInit {

  
  @ViewChild('addForm') incomeForm!: NgForm;
  public id = 0;
  description: string = "";
  name: string = '';
  isDisplay: boolean = false;
  modeHeader: string = 'Add Income';
  resetButton: boolean = true;

  rows: any[] = [];
  incomeValue: any;
  isEditMode: boolean;

  constructor(private _incomeService: IncomeService) { }

  ngOnInit(): void {
    this.getAllIncome();
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

  createIncome() {
    this.isDisplay = true;
    this.modeHeader = 'Add Income';
    this.reset();
  }

  reset() {
    this.modeHeader = "Create Income";
    this.name = "";
    this.description = "";
    this.id = 0;
  }

  getAllIncome() {
    this._incomeService.getIncome().subscribe((response: any) => {
      this.rows = response.data;
    })
  }

  saveIncome() {
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
      this._incomeService.insertIncome(obj).subscribe( {      

         next: () => {
                   Swal.fire({
                     icon: 'success',
                     title: 'Created!',
                     text: 'Income created successfully',
                     confirmButtonText: 'OK',
                     confirmButtonColor: '#0e3a4c'
                   });
                   this.getAllIncome();
                   this.isDisplay = false;
                   this.isEditMode = false;
                 },
                 error: () => {
                   Swal.fire({
                     icon: 'error',
                     title: 'Error',
                     text: 'Failed to created Income',
                     confirmButtonText: 'OK',
                     confirmButtonColor: '#d33'
                   });
                 }

        
      });
    }
    else {
      this._incomeService.updateIncome(obj).subscribe( {
          next: () => {
                   Swal.fire({
                     icon: 'success',
                     title: 'Updated!',
                     text: 'Income updated successfully',
                     confirmButtonText: 'OK',
                     confirmButtonColor: '#0e3a4c'
                   });
                   this.getAllIncome();
                   this.isDisplay = false;
                   this.isEditMode = false;
                 },
                 error: () => {
                   Swal.fire({
                     icon: 'error',
                     title: 'Error',
                     text: 'Failed to update Income',
                     confirmButtonText: 'OK',
                     confirmButtonColor: '#d33'
                   });
                 }
      });
    }
  }



  getIncomeDetails(id: any) {
    debugger
    this._incomeService.getIncomeById(id).subscribe((arg: any) => {
      this.incomeValue = arg.data;
      this.id = this.incomeValue.id;
      this.name = this.incomeValue.name;
      this.description = this.incomeValue.description;
      this.isDisplay = true;
      this.resetButton = false;
      this.modeHeader = "Edit Income";
      this.isEditMode = true;
    });
  }

  deleteIncome(id) {
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
        _self._incomeService.deleteIncome(id).subscribe((response: any) => {
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
          _self.getAllIncome();
        });
      }
    });
  }


}














