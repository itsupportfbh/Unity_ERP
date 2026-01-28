import { AfterViewChecked, AfterViewInit, Component, OnInit, ViewChild } from '@angular/core';
import Swal from 'sweetalert2';
import { SupplierGroupsService } from './supplier-groups.service';
import * as feather from 'feather-icons';
import { NgForm } from '@angular/forms';
@Component({
  selector: 'app-supplier-groups',
  templateUrl: './supplier-groups.component.html',
  styleUrls: ['./supplier-groups.component.scss']
})
export class SupplierGroupsComponent implements OnInit, AfterViewInit, AfterViewChecked {
  @ViewChild('addForm') addFormForm!: NgForm;
  public id = 0;
  public countryName = "";
  isDisplay: boolean = false;
  modeHeader: string = 'Add SupplierGroups';
  resetButton: boolean = true;
 rows: any[] = [];
  tempData: any;
  countryValue: any;
  isEditMode: boolean;
  customerName: string;
  customerGroupValue: any;
  Name: any;
  description: any;
  supplierGroupValue: any;

  constructor(private _supplierService: SupplierGroupsService) { }

  ngOnInit(): void 
  {
    this.getAllSupplierGroups();
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

  createSupplierGroups() {
    this.isDisplay = true;
   
    this.modeHeader = 'Add createSupplierGroups';
    this.reset();
  }


    reset() {
    this.modeHeader = "Create Supplier Groups";
    this.Name = "";
    this.description = "";
    this.id = 0;
  }


   getAllSupplierGroups() {
    this._supplierService.getSupplier().subscribe((response: any) => {
      this.rows = response.data;
      this.tempData = this.rows;
    })
  }


  CreateSupplierGroups(data: any) {
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
  this._supplierService.insertSupplier(obj).subscribe((res) => {
    if (res.isSuccess) {
      Swal.fire({
        title: "Hi",
        text: res.message,
        icon: "success",
        allowOutsideClick: false,
      });

      this.getAllSupplierGroups();
      this.isDisplay = false;
      this.isEditMode=false;
    }
  });
}
else{
   this._supplierService.updateSupplier(obj).subscribe((res) => {
    if (res.isSuccess) {
      Swal.fire({
        title: "Hi",
        text: res.message,
        icon: "success",
        allowOutsideClick: false,
      });

      this.getAllSupplierGroups();
      this.isDisplay = false;
      this.isEditMode=false;
    }
  });
}
}



  getSupplierGroupsDetails(id: any) {
    debugger
    this._supplierService.getSupplierById(id).subscribe((arg: any) => {
      this.supplierGroupValue = arg.data;
      this.id = this.supplierGroupValue.id;
      this.Name = this.supplierGroupValue.name;
      this.description = this.supplierGroupValue.description;
      this.isDisplay = true;
      this.resetButton = false;
      this.modeHeader = "Edit SupplierGroups";
      this.isEditMode = true;
    });
  }

  deleteSupplierGroups(id) {
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
        _self._supplierService.deleteSupplier(id).subscribe((response: any) => {
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
          _self.getAllSupplierGroups();
        });
      }
    });
  }

}
