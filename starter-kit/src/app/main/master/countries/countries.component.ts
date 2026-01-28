import { AfterViewInit, AfterViewChecked, Component, OnInit, ViewChild } from '@angular/core';
import { NgForm } from '@angular/forms';
import * as feather from 'feather-icons';
import { CountriesService } from './countries.service';
import Swal from 'sweetalert2';

@Component({
  selector: 'app-countries',
  templateUrl: './countries.component.html',
  styleUrls: ['./countries.component.scss']
})
export class CountriesComponent implements OnInit, AfterViewInit, AfterViewChecked {
  @ViewChild('addForm') countryForm!: NgForm;
  public id = 0;
  public countryName = "";
  public gstPercentage = "";
  isDisplay: boolean = false;
  modeHeader: string = 'Add Country';
  resetButton: boolean = true;
 rows: any[] = [];
  tempData: any;
  countryValue: any;
  isEditMode: boolean;

  constructor(private _countriesService: CountriesService) { }

  ngOnInit(): void 
  {
    this.getAllCountries();
  }

  ngAfterViewInit(): void {
    feather.replace();
  }

  ngAfterViewChecked(): void {
    feather.replace();
  }

  // reset(form: NgForm) {
  //   form.resetForm();
  //   this.isDisplay = false;
  //   this.modeHeader = 'Add Country';
  // }

  saveMode() {
    console.log('Saved:');
  }

  cancel() {
    this.isDisplay = false;
    this.isEditMode = false;
  }

  createCountry() {
    this.isDisplay = true;
   
    this.modeHeader = 'Add Country';
    this.reset();
  }


    reset() {
    this.modeHeader = "Create Country";
    this.countryName = "";
    this.gstPercentage = "";
    this.id = 0;
  }


   getAllCountries() {
    this._countriesService.getCountry().subscribe((response: any) => {
      this.rows = response.data;
      this.tempData = this.rows;
    })
  }


  CreateCountry(data: any) {
    debugger
   
  const obj = {
    id:this.id,
    countryName: this.countryName,
    gstPercentage: this.gstPercentage,
    createdBy: '1',
    createdDate: new Date(),
    updatedBy: '1',
    updatedDate: new Date(),
    isActive: true,
  };
 if(this.id == 0){
  this._countriesService.insertCountry(obj).subscribe((res) => {
    if (res.isSuccess) {
      Swal.fire({
        title: "Hi",
        text: res.message,
        icon: "success",
        allowOutsideClick: false,
      });

      this.getAllCountries();
      this.isDisplay = false;
      this.isEditMode=false;
    }
    else{
Swal.fire({
        title: "Hi",
        text: res.message,
        icon: "error",
        allowOutsideClick: false,
      });
    }
  });
}
else{
   this._countriesService.updateCountry(obj).subscribe((res) => {
    if (res.isSuccess) {
      Swal.fire({
        title: "Hi",
        text: res.message,
        icon: "success",
        allowOutsideClick: false,
      });

      this.getAllCountries();
      this.isDisplay = false;
      this.isEditMode=false;
    }

        else{
Swal.fire({
        title: "Hi",
        text: res.message,
        icon: "error",
        allowOutsideClick: false,
      });
    }
  });
}
}



  getCountryDetails(id: any) {
    debugger
    this._countriesService.getCountryById(id).subscribe((arg: any) => {
      this.countryValue = arg.data;
      this.id = this.countryValue.id;
      this.countryName = this.countryValue.countryName;
      this.gstPercentage = this.countryValue.gstPercentage;
      this.isDisplay = true;
      this.resetButton = false;
      this.modeHeader = "Edit Country";
      this.isEditMode = true;
    });
  }

  deleteCountry(id) {
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
        _self._countriesService.deleteCountry(id).subscribe((response: any) => {
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
          _self.getAllCountries();
        });
      }
    });
  }

}
