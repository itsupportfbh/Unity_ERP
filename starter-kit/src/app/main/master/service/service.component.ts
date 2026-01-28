import { AfterViewChecked, AfterViewInit, Component, OnInit, ViewChild } from '@angular/core';
import { NgForm } from '@angular/forms';
import { ServiceService } from './service.service';
import * as feather from 'feather-icons';
import Swal from 'sweetalert2';

@Component({
  selector: 'app-service',
  templateUrl: './service.component.html',
  styleUrls: ['./service.component.scss']
})
export class ServiceComponent implements OnInit, AfterViewInit, AfterViewChecked {
  @ViewChild('serviceForm') serviceForm!: NgForm;
  public id = 0;
  public serviceName = "";
  isDisplay: boolean = false;
  modeHeader: string = 'Add Service';
  resetButton: boolean = true;
 rows: any[] = [];
  tempData: any;
  isEditMode: boolean;
 public description= '';
 public tax = 0;
 public charges = 0;
  serviceValue: any;
  constructor(private _service: ServiceService) { }

  ngOnInit(): void 
  {
    this.getAllService();
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

  createService() {
    this.isDisplay = true;
   
    this.modeHeader = 'Add Service';
    this.reset();
  }


    reset() {
    this.modeHeader = "Create Service";
    this.serviceName = "";
    this.description = "";
    this.tax =0;
    this.charges =0;
    this.id = 0;
  }


   getAllService() {
    this._service.getService().subscribe((response: any) => {
      this.rows = response.data;
      this.tempData = this.rows;
    })
  }


  CreateService(data: any) {
    debugger
   
  const obj = {
    Id:this.id,
    Name: this.serviceName,
    Charge:this.charges,
    Tax:this.tax,
    Description:this.description,
    createdBy: '1',
    createdDate: new Date(),
    updatedBy: '1',
    updatedDate: new Date(),
    isActive: true,
  };
 if(this.id == 0){
  this._service.insertService(obj).subscribe((res) => {
    if (res.isSuccess) {
      Swal.fire({
        title: "Hi",
        text: res.message,
        icon: "success",
        allowOutsideClick: false,
      });

      this.getAllService();
      this.isDisplay = false;
      this.isEditMode=false;
    }
  });
}
else{
   this._service.updateService(obj).subscribe((res) => {
    if (res.isSuccess) {
      Swal.fire({
        title: "Hi",
        text: res.message,
        icon: "success",
        allowOutsideClick: false,
      });

      this.getAllService();
      this.isDisplay = false;
      this.isEditMode=false;
    }
  });
}
}



  getServiceDetails(id: any) {
    debugger
    this._service.getServiceById(id).subscribe((arg: any) => {
      this.serviceValue = arg.data;
      console.log("servicevalue",this.serviceValue)
      this.id = this.serviceValue.id;
      this.serviceName = this.serviceValue.name;
      this.charges=this.serviceValue.charge;
      this.tax=this.serviceValue.tax;
      this.description = this.serviceValue.description;
      this.isDisplay = true;
      this.resetButton = false;
      this.modeHeader = "Edit Service";
      this.isEditMode = true;
    });
  }

  deleteService(id) {
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
        _self._service.deleteService(id).subscribe((response: any) => {
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
          _self.getAllService();
        });
      }
    });
  }

}
