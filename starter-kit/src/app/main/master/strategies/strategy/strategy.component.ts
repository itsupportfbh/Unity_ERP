import { AfterViewInit, AfterViewChecked, Component, OnInit, ViewChild } from '@angular/core';
import { NgForm } from '@angular/forms';
import * as feather from 'feather-icons';
import Swal from 'sweetalert2';
import { StrategyService } from '../strategy.service';

@Component({
  selector: 'app-strategy',
  templateUrl: './strategy.component.html',
  styleUrls: ['./strategy.component.scss']
})
export class StrategyComponent implements OnInit {

  @ViewChild('addForm') strategyForm!: NgForm;
  public id = 0;
  public strategyName = "";
  isDisplay: boolean = false;
  modeHeader: string = 'Add Strategy';
  resetButton: boolean = true;
  rows: any[] = [];
  tempData: any;
  strategyValue: any;
  isEditMode: boolean;

  constructor(private strategyService: StrategyService) { }

  ngOnInit(): void {
    this.getAllStrategy();
  }

  ngAfterViewInit(): void {
    feather.replace();
  }

  ngAfterViewChecked(): void {
    feather.replace();
  }

  saveMode() {
    console.log('Saved:');
  }

  cancel() {
    this.isDisplay = false;
    this.isEditMode = false;
  }

  createStrategy() {
    this.isDisplay = true;

    this.modeHeader = 'Add Strategy';
    this.reset();
  }


  reset() {
    this.modeHeader = "Create Frequency";
    this.strategyName = "";
    this.id = 0;
  }


  getAllStrategy() {
    this.strategyService.getStrategy().subscribe((response: any) => {
      this.rows = response.data;
      this.tempData = this.rows;
    })
  }


  saveStrategy(data: any) {
    debugger

    const obj = {
      id: this.id,
      strategyName: this.strategyName,
      createdBy: '1',
      createdDate: new Date(),
      updatedBy: '1',
      updatedDate: new Date(),
      isActive: true,
    };
    if (this.id == 0) {
      this.strategyService.insertStrategy(obj).subscribe((res) => {
        if (res.isSuccess) {
          Swal.fire({
            title: "Hi",
            text: res.message,
            icon: "success",
            allowOutsideClick: false,
          });

          this.getAllStrategy();
          this.isDisplay = false;
          this.isEditMode = false;
        }
      });
    }
    else {
      this.strategyService.updateStrategy(obj).subscribe((res) => {
        if (res.isSuccess) {
          Swal.fire({
            title: "Hi",
            text: res.message,
            icon: "success",
            allowOutsideClick: false,
          });

          this.getAllStrategy();
          this.isDisplay = false;
          this.isEditMode = false;
        }
      });
    }
  }



  getStrategyDetails(id: any) {
    debugger
    this.strategyService.getStrategyById(id).subscribe((arg: any) => {
      this.strategyValue = arg.data;
      this.id = this.strategyValue.id;
      this.strategyName = this.strategyValue.strategyName;
      this.isDisplay = true;
      this.resetButton = false;
      this.modeHeader = "Edit Frequency";
      this.isEditMode = true;
    });
  }

  deleteStrategy(id) {
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
        _self.strategyService.deleteStrategy(id).subscribe((response: any) => {
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
          _self.getAllStrategy();
        });
      }
    });
  }

}



