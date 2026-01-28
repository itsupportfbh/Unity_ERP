
import { AfterViewInit, AfterViewChecked, Component, OnInit, ViewChild } from '@angular/core';
import { NgForm } from '@angular/forms';
import * as feather from 'feather-icons';
import Swal from 'sweetalert2';
import { RecurringService } from './recurring.service';

@Component({
  selector: 'app-recurring',
  templateUrl: './recurring.component.html',
  styleUrls: ['./recurring.component.scss']
})
export class RecurringComponent implements OnInit {

  @ViewChild('addForm') recurringForm!: NgForm;
  public id = 0;
  public recurringName = "";
  isDisplay: boolean = false;
  modeHeader: string = 'Add Recurring';
  resetButton: boolean = true;
  rows: any[] = [];
  tempData: any;
  recurringValue: any;
  isEditMode: boolean;

  constructor(private recurringService: RecurringService) { }

  ngOnInit(): void {
    this.getAllRecurrring();
  }

  ngAfterViewInit(): void {
    feather.replace();
  }

  ngAfterViewChecked(): void {
    feather.replace();
  }

  cancel() {
    this.isDisplay = false;
    this.isEditMode = false;
  }

  createRecurring() {
    this.isDisplay = true;

    this.modeHeader = 'Add Recurring';
    this.reset();
  }


  reset() {
    this.modeHeader = "Create Recurring";
    this.recurringName = "";
    this.id = 0;
  }


  getAllRecurrring() {
    this.recurringService.getRecurring().subscribe((response: any) => {
      this.rows = response.data;
      this.tempData = this.rows;
    })
  }


  saveRecurring(data: any) {
    debugger

    const obj = {
      id: this.id,
      recurringName: this.recurringName,
      createdBy: '1',
      createdDate: new Date(),
      updatedBy: '1',
      updatedDate: new Date(),
      isActive: true,
    };
    if (this.id == 0) {
      this.recurringService.insertRecurring(obj).subscribe((res) => {
        if (res.isSuccess) {
          Swal.fire({
            title: "Hi",
            text: res.message,
            icon: "success",
            allowOutsideClick: false,
          });

          this.getAllRecurrring();
          this.isDisplay = false;
          this.isEditMode = false;
        }
      });
    }
    else {
      this.recurringService.updateRecurring(obj).subscribe((res) => {
        if (res.isSuccess) {
          Swal.fire({
            title: "Hi",
            text: res.message,
            icon: "success",
            allowOutsideClick: false,
          });

          this.getAllRecurrring();
          this.isDisplay = false;
          this.isEditMode = false;
        }
      });
    }
  }



  getRecurringDetails(id: any) {
    debugger
    this.recurringService.getRecurringById(id).subscribe((arg: any) => {
      this.recurringValue = arg.data;
      this.id = this.recurringValue.id;
      this.recurringName = this.recurringValue.recurringName;
      this.isDisplay = true;
      this.resetButton = false;
      this.modeHeader = "Edit Recurring";
      this.isEditMode = true;
    });
  }

  deleteRecurring(id) {
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
        _self.recurringService.deleteRecurring(id).subscribe((response: any) => {
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
          _self.getAllRecurrring();
        });
      }
    });
  }

}








