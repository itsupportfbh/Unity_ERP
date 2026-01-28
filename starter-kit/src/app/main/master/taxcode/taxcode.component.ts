import {
  AfterViewInit,
  AfterViewChecked,
  Component,
  OnInit,
  ViewChild
} from '@angular/core';
import { NgForm } from '@angular/forms';
import * as feather from 'feather-icons';
import Swal from 'sweetalert2';
import { TaxCodeService } from './taxcode.service';

@Component({
  selector: 'app-taxcode',
  templateUrl: './taxcode.component.html',
  styleUrls: ['./taxcode.component.scss']
})
export class TaxcodeComponent implements OnInit, AfterViewInit, AfterViewChecked {

  @ViewChild('taxCodeForm') taxCodeForm!: NgForm;

  public id = 0;
  public name = '';
  public description = '';
  public rate: number | null = null;
  public typeId: number | null = null;

  isDisplay: boolean = false;
  modeHeader: string = 'Add TaxCode';
  resetButton: boolean = true;
  rows: any[] = [];
  tempData: any;
  taxCodeValue: any;
  isEditMode: boolean = false;

  // static dropdown – later you can load from API
  taxTypes = [
    { id: 1, name: 'Input GST' },
    { id: 2, name: 'Output GST' }
    // add more types if required
  ];

  constructor(private taxCodeService: TaxCodeService) {}

  ngOnInit(): void {
    this.getAllTaxCode();
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

  createTaxCode() {
    this.isDisplay = true;
    this.modeHeader = 'Add TaxCode';
    this.resetButton = true;
    this.isEditMode = false;
    this.reset();
  }

  reset() {
    this.modeHeader = 'Create TaxCode';
    this.id = 0;
    this.name = '';
    this.description = '';
    this.rate = null;
    this.typeId = null;

    if (this.taxCodeForm) {
      this.taxCodeForm.resetForm();
    }
  }

  getAllTaxCode() {
    this.taxCodeService.getTaxCode().subscribe((response: any) => {
      this.rows = response.data;
      this.tempData = this.rows;
    });
  }

  saveTaxCode() {
    const obj = {
      id: this.id,
      name: this.name,
      description: this.description,
      typeId: this.typeId,
      rate: this.rate,
      createdBy: '1',
      createdDate: new Date(),
      updatedBy: '1',
      updatedDate: new Date(),
      isActive: true
    };

    if (this.id === 0) {
      // INSERT
      this.taxCodeService.insertTaxCode(obj).subscribe((res: any) => {
        if (res.isSuccess) {
          Swal.fire({
            title: 'Hi',
            text: res.message,
            icon: 'success',
            allowOutsideClick: false
          });
          this.getAllTaxCode();
          this.isDisplay = false;
          this.isEditMode = false;
        } else {
          Swal.fire({
            title: 'Hi',
            text: res.message,
            icon: 'error',
            allowOutsideClick: false
          });
        }
      });
    } else {
      // UPDATE
      this.taxCodeService.updateTaxCode(obj).subscribe((res: any) => {
        if (res.isSuccess) {
          Swal.fire({
            title: 'Hi',
            text: res.message,
            icon: 'success',
            allowOutsideClick: false
          });
          this.getAllTaxCode();
          this.isDisplay = false;
          this.isEditMode = false;
        } else {
          Swal.fire({
            title: 'Hi',
            text: res.message,
            icon: 'error',
            allowOutsideClick: false
          });
        }
      });
    }
  }

  getTaxCodeDetails(id: any) {
    this.taxCodeService.getTaxCodeById(id).subscribe((arg: any) => {
      this.taxCodeValue = arg.data;
      this.id = this.taxCodeValue.id;
      this.name = this.taxCodeValue.name;
      this.description = this.taxCodeValue.description;
      this.typeId = this.taxCodeValue.typeId;
      this.rate = this.taxCodeValue.rate;

      this.isDisplay = true;
      this.resetButton = false;
      this.modeHeader = 'Edit TaxCode';
      this.isEditMode = true;
    });
  }

  deleteTaxCode(id: any, isUsed?: boolean) {
    const _self = this;
    Swal.fire({
      title: 'Are you sure?',
      text: 'You won\'t be able to revert this!',
      icon: 'success',
      showCancelButton: true,
      confirmButtonColor: '#7367F0',
      cancelButtonColor: '#E42728',
      confirmButtonText: 'Yes, Delete it!',
      customClass: {
        confirmButton: 'btn btn-primary',
        cancelButton: 'btn btn-danger ml-1'
      },
      allowOutsideClick: false
    }).then(function (result) {
      if (result.value) {
        _self.taxCodeService.deleteTaxCode(id).subscribe((response: any) => {
          if (response.isSuccess) {
            Swal.fire({
              icon: 'success',
              title: 'Deleted!',
              text: response.message,
              allowOutsideClick: false
            });
          } else {
            Swal.fire({
              icon: 'error',
              title: 'Error!',
              text: response.message,
              allowOutsideClick: false
            });
          }
          _self.getAllTaxCode();
        });
      }
    });
  }
}
