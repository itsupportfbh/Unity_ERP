import { AfterViewChecked, AfterViewInit, Component, OnInit, ViewChild } from '@angular/core';
import { NgForm } from '@angular/forms';
import { CustomerGroupsService } from './customer-groups.service';
import * as feather from 'feather-icons';
import Swal from 'sweetalert2';
@Component({
  selector: 'app-customer-groups',
  templateUrl: './customer-groups.component.html',
  styleUrls: ['./customer-groups.component.scss']
})
export class CustomerGroupsComponent implements OnInit, AfterViewInit, AfterViewChecked {
  @ViewChild('addForm') addFormForm!: NgForm;
  public id = 0;
  public countryName = "";
  isDisplay: boolean = false;
  modeHeader: string = 'Add CustomerGroups';
  resetButton: boolean = true;
 rows: any[] = [];
  tempData: any;
  countryValue: any;
  isEditMode: boolean;
  customerName: string;
  customerGroupValue: any;
  Name: any;
  description: any;

  constructor(private _customerService: CustomerGroupsService) { }

  ngOnInit(): void 
  {
    this.getAllCustomerGroups();
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

  createCustomerGroups() {
    this.isDisplay = true;
   
    this.modeHeader = 'Add createCustomerGroups';
    this.reset();
  }


    reset() {
    this.modeHeader = "Create createCustomerGroups";
    this.Name = "";
    this.description = "";
    this.id = 0;
  }


   getAllCustomerGroups() {
    this._customerService.getCustomer().subscribe((response: any) => {
      this.rows = response.data;
      this.tempData = this.rows;
    })
  }


  CreateCustomerGroups(data: any) {
    debugger
   
  const obj = {
    id:this.id,
    name: this.Name,
    description:this.description,
    createdBy: '1',
    createdDate: new Date(),
    updatedBy: '1',
    updatedDate: new Date(),
    isActive: true,
  };
 if(this.id == 0){
  this._customerService.insertCustomer(obj).subscribe((res) => {
    if (res.isSuccess) {
      Swal.fire({
        title: "Hi",
        text: res.message,
        icon: "success",
        allowOutsideClick: false,
      });

      this.getAllCustomerGroups();
      this.isDisplay = false;
      this.isEditMode=false;
    }
  });
}
else{
   this._customerService.updateCustomer(obj).subscribe((res) => {
    if (res.isSuccess) {
      Swal.fire({
        title: "Hi",
        text: res.message,
        icon: "success",
        allowOutsideClick: false,
      });

      this.getAllCustomerGroups();
      this.isDisplay = false;
      this.isEditMode=false;
    }
  });
}
}



  getCustomerGroupsDetails(id: any) {
    debugger
    this._customerService.getCustomerById(id).subscribe((arg: any) => {
      this.customerGroupValue = arg.data;
      this.id = this.customerGroupValue.id;
      this.Name = this.customerGroupValue.name;
      this.description = this.customerGroupValue.description;
      this.isDisplay = true;
      this.resetButton = false;
      this.modeHeader = "Edit CustomerGroups";
      this.isEditMode = true;
    });
  }

  deleteCustomerGroups(id) {
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
        _self._customerService.deleteCustomer(id).subscribe((response: any) => {
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
          _self.getAllCustomerGroups();
        });
      }
    });
  }

}