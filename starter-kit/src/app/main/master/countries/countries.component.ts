import {
  AfterViewInit,
  AfterViewChecked,
  Component,
  OnInit,
  ViewChild,
  ViewEncapsulation
} from '@angular/core';
import { NgForm } from '@angular/forms';
import * as feather from 'feather-icons';
import Swal from 'sweetalert2';

import { CountriesService } from './countries.service';
import { FunctionPermission, PermissionService } from 'app/shared/permission.service';

@Component({
  selector: 'app-countries',
  templateUrl: './countries.component.html',
  styleUrls: ['./countries.component.scss'],
  encapsulation: ViewEncapsulation.None
})
export class CountriesComponent implements OnInit, AfterViewInit, AfterViewChecked {
  @ViewChild('countryForm') countryForm!: NgForm;

  public id = 0;
  public countryName = '';
  public gstPercentage = 0;

  isDisplay = false;
  modeHeader: string = 'Add Country';
  resetButton = true;

  rows: any[] = [];
  tempData: any;
  countryValue: any;
  isEditMode = false;

  userId: number = 0;

  // IMPORTANT: DB/Menu permission function id same ah irukanum
  functionId = 'countries';

  permission: FunctionPermission;
  isPermissionLoaded = false;
  isPageLoading = false;

  constructor(
    private _countriesService: CountriesService,
    private permissionService: PermissionService
  ) {
    this.userId = Number(localStorage.getItem('id') || 0);
    this.permission = this.permissionService.getEmptyPermission(this.functionId);
  }

  ngOnInit(): void {
    this.loadPermission();
  }

  ngAfterViewInit(): void {
    feather.replace();
  }

  ngAfterViewChecked(): void {
    feather.replace();
  }

  loadPermission(): void {
    if (!this.userId || this.userId <= 0) {
      this.permission = this.permissionService.getEmptyPermission(this.functionId);
      this.isPermissionLoaded = true;

      Swal.fire({
        icon: 'warning',
        title: 'Access Denied',
        text: 'User not found. Please login again.',
        confirmButtonColor: '#0e3a4c'
      });
      return;
    }

    this.isPageLoading = true;

    this.permissionService.getFunctionPermission(this.userId, this.functionId).subscribe({
      next: (res: FunctionPermission) => {
        this.permission = res || this.permissionService.getEmptyPermission(this.functionId);
        this.isPermissionLoaded = true;
        this.isPageLoading = false;

        if (this.canView()) {
          this.getAllCountries();
        } else {
          this.rows = [];
          this.isDisplay = false;
        }
      },
      error: (err) => {
        console.error('Permission load error:', err);

        this.permission = this.permissionService.getEmptyPermission(this.functionId);
        this.isPermissionLoaded = true;
        this.isPageLoading = false;

        Swal.fire({
          icon: 'error',
          title: 'Error',
          text: 'Unable to load permission.',
          confirmButtonColor: '#d33'
        });
      }
    });
  }

  canView(): boolean {
    return this.permissionService.hasView(this.permission);
  }

  canCreate(): boolean {
    return this.permissionService.hasCreate(this.permission);
  }

  canEdit(): boolean {
    return this.permissionService.hasEdit(this.permission);
  }

  canDelete(): boolean {
    return this.permissionService.hasDelete(this.permission);
  }

  cancel(): void {
    this.isDisplay = false;
    this.isEditMode = false;
    this.resetButton = true;
  }

  createCountry(): void {
    if (!this.canCreate()) {
      Swal.fire({
        icon: 'warning',
        title: 'Access Denied',
        text: 'You do not have create permission.',
        confirmButtonColor: '#0e3a4c'
      });
      return;
    }

    this.isDisplay = true;
    this.isEditMode = false;
    this.resetButton = true;
    this.modeHeader = 'Create Country';
    this.reset();
  }

  reset(): void {
    this.modeHeader = this.isEditMode ? 'Edit Country' : 'Create Country';
    this.countryName = '';
    this.gstPercentage = 0;
    this.id = 0;
  }

  getAllCountries(): void {
    this._countriesService.getCountry().subscribe({
      next: (response: any) => {
        this.rows = response?.data || [];
        this.tempData = this.rows;
      },
      error: (err) => {
        console.error('Load country error:', err);
        this.rows = [];
      }
    });
  }

  CreateCountry(): void {
    if (!this.countryName) {
      Swal.fire({
        icon: 'warning',
        title: 'Warning',
        text: 'Please fill all required fields',
        confirmButtonColor: '#0e3a4c'
      });
      return;
    }

    if (this.id > 0 && !this.canEdit()) {
      Swal.fire({
        icon: 'warning',
        title: 'Access Denied',
        text: 'You do not have edit permission.',
        confirmButtonColor: '#0e3a4c'
      });
      return;
    }

    if (this.id === 0 && !this.canCreate()) {
      Swal.fire({
        icon: 'warning',
        title: 'Access Denied',
        text: 'You do not have create permission.',
        confirmButtonColor: '#0e3a4c'
      });
      return;
    }

    const obj = {
      id: this.id,
      countryName: this.countryName,
      gstPercentage: this.gstPercentage,
      createdBy: this.userId,
      createdDate: new Date(),
      updatedBy: this.userId,
      updatedDate: new Date(),
      isActive: true,
      companyId: Number(localStorage.getItem('companyId') || 0)
    };

    if (this.id === 0) {
      this._countriesService.insertCountry(obj).subscribe({
        next: (res: any) => {
          if (res?.isSuccess) {
            Swal.fire({
              title: 'Success',
              text: res.message || 'Country created successfully',
              icon: 'success',
              allowOutsideClick: false,
              confirmButtonColor: '#0e3a4c'
            });

            this.getAllCountries();
            this.isDisplay = false;
            this.isEditMode = false;
          } else {
            Swal.fire({
              title: 'Error',
              text: res?.message || 'Failed to create country',
              icon: 'error',
              allowOutsideClick: false,
              confirmButtonColor: '#d33'
            });
          }
        },
        error: (err) => {
          Swal.fire({
            title: 'Error',
            text: err?.error?.message || err?.message || 'Failed to create country',
            icon: 'error',
            allowOutsideClick: false,
            confirmButtonColor: '#d33'
          });
        }
      });
    } else {
      this._countriesService.updateCountry(obj).subscribe({
        next: (res: any) => {
          if (res?.isSuccess) {
            Swal.fire({
              title: 'Success',
              text: res.message || 'Country updated successfully',
              icon: 'success',
              allowOutsideClick: false,
              confirmButtonColor: '#0e3a4c'
            });

            this.getAllCountries();
            this.isDisplay = false;
            this.isEditMode = false;
          } else {
            Swal.fire({
              title: 'Error',
              text: res?.message || 'Failed to update country',
              icon: 'error',
              allowOutsideClick: false,
              confirmButtonColor: '#d33'
            });
          }
        },
        error: (err) => {
          Swal.fire({
            title: 'Error',
            text: err?.error?.message || err?.message || 'Failed to update country',
            icon: 'error',
            allowOutsideClick: false,
            confirmButtonColor: '#d33'
          });
        }
      });
    }
  }

  getCountryDetails(id: any): void {
    if (!this.canEdit()) {
      Swal.fire({
        icon: 'warning',
        title: 'Access Denied',
        text: 'You do not have edit permission.',
        confirmButtonColor: '#0e3a4c'
      });
      return;
    }

    this._countriesService.getCountryById(id).subscribe({
      next: (arg: any) => {
        this.countryValue = arg?.data;
        this.id = this.countryValue?.id || 0;
        this.countryName = this.countryValue?.countryName || '';
        this.gstPercentage = this.countryValue?.gstPercentage || 0;

        this.isDisplay = true;
        this.resetButton = false;
        this.modeHeader = 'Edit Country';
        this.isEditMode = true;
      },
      error: (err) => {
        Swal.fire({
          icon: 'error',
          title: 'Error',
          text: err?.error?.message || err?.message || 'Unable to load country details',
          confirmButtonColor: '#d33'
        });
      }
    });
  }

  deleteCountry(id: any, isUsed?: any): void {
    if (!this.canDelete()) {
      Swal.fire({
        icon: 'warning',
        title: 'Access Denied',
        text: 'You do not have delete permission.',
        confirmButtonColor: '#0e3a4c'
      });
      return;
    }

    if (isUsed) {
      Swal.fire({
        icon: 'warning',
        title: 'Cannot Delete',
        text: 'This country is already used.',
        confirmButtonColor: '#0e3a4c'
      });
      return;
    }

    Swal.fire({
      title: 'Are you sure?',
      text: 'You will not be able to revert this!',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#d33',
      cancelButtonColor: '#3085d6',
      confirmButtonText: 'Yes, Delete it!',
      cancelButtonText: 'Cancel',
      allowOutsideClick: false
    }).then((result) => {
      if (result.isConfirmed) {
        this._countriesService.deleteCountry(id).subscribe({
          next: (response: any) => {
            if (response?.isSuccess) {
              Swal.fire({
                icon: 'success',
                title: 'Deleted!',
                text: response.message || 'Country deleted successfully',
                allowOutsideClick: false,
                confirmButtonColor: '#3085d6'
              });
            } else {
              Swal.fire({
                icon: 'error',
                title: 'Error!',
                text: response?.message || 'Failed to delete country',
                allowOutsideClick: false,
                confirmButtonColor: '#d33'
              });
            }

            this.getAllCountries();
          },
          error: (err) => {
            Swal.fire({
              icon: 'error',
              title: 'Error!',
              text: err?.error?.message || err?.message || 'Failed to delete country',
              allowOutsideClick: false,
              confirmButtonColor: '#d33'
            });
          }
        });
      }
    });
  }
}