import { Component, OnInit, ViewChild } from '@angular/core';
import { NgForm } from '@angular/forms';
import * as feather from 'feather-icons';
import Swal from 'sweetalert2';
import { RegionService } from './regions.service';

@Component({
  selector: 'app-regions',
  templateUrl: './regions.component.html',
  styleUrls: ['./regions.component.scss']
})
export class RegionsComponent implements OnInit {

  @ViewChild('addForm') regionForm!: NgForm;
  public id = 0;
  public regionName = "";
  isDisplay: boolean = false;
  modeHeader: string = 'Add Region';
  resetButton: boolean = true;

  rows: any[] = [];
  regionValue: any;
  isEditMode: boolean;

  constructor(private _regionsService: RegionService) { }

  ngOnInit(): void {
    this.getAllRegions();
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

  createRegion() {
    this.isDisplay = true;
    this.modeHeader = 'Add Region';
    this.reset();
  }

  reset() {
    this.modeHeader = "Create Region";
    this.regionName = "";
    this.id = 0;
  }

  getAllRegions() {
    this._regionsService.getRegion().subscribe((response: any) => {
      this.rows = response.data;
    })
  }

  saveRegion() {
    debugger

    const obj = {
      id: this.id,
      regionName: this.regionName,
      createdBy: '1',
      createdDate: new Date(),
      updatedBy: '1',
      updatedDate: new Date(),
      isActive: true,
    };
    if (this.id == 0) {
      this._regionsService.insertRegion(obj).subscribe( {      

         next: () => {
                   Swal.fire({
                     icon: 'success',
                     title: 'Created!',
                     text: 'Region created successfully',
                     confirmButtonText: 'OK',
                     confirmButtonColor: '#0e3a4c'
                   });
                   this.getAllRegions();
                   this.isDisplay = false;
                   this.isEditMode = false;
                 },
                 error: () => {
                   Swal.fire({
                     icon: 'error',
                     title: 'Error',
                     text: 'Failed to created Region',
                     confirmButtonText: 'OK',
                     confirmButtonColor: '#d33'
                   });
                 }

        
      });
    }
    else {
      this._regionsService.updateRegion(obj).subscribe( {
          next: () => {
                   Swal.fire({
                     icon: 'success',
                     title: 'Updated!',
                     text: 'Region updated successfully',
                     confirmButtonText: 'OK',
                     confirmButtonColor: '#0e3a4c'
                   });
                   this.getAllRegions();
                   this.isDisplay = false;
                   this.isEditMode = false;
                 },
                 error: () => {
                   Swal.fire({
                     icon: 'error',
                     title: 'Error',
                     text: 'Failed to update Region',
                     confirmButtonText: 'OK',
                     confirmButtonColor: '#d33'
                   });
                 }
      });
    }
  }



  getRegionDetails(id: any) {
    debugger
    this._regionsService.getRegionById(id).subscribe((arg: any) => {
      this.regionValue = arg.data;
      this.id = this.regionValue.id;
      this.regionName = this.regionValue.regionName;
      this.isDisplay = true;
      this.resetButton = false;
      this.modeHeader = "Edit Region";
      this.isEditMode = true;
    });
  }

  deleteRegion(id) {
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
        _self._regionsService.deleteRegion(id).subscribe((response: any) => {
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
          _self.getAllRegions();
        });
      }
    });
  }

}



