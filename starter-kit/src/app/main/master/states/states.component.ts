import {
  AfterViewChecked,
  AfterViewInit,
  Component,
  OnInit,
  ViewChild,
  ViewEncapsulation
} from '@angular/core';
import { NgForm } from '@angular/forms';
import * as feather from 'feather-icons';
import Swal from 'sweetalert2';

import { StatesService } from './states.service';
import { CountriesService } from '../countries/countries.service';
import { FunctionPermission, PermissionService } from 'app/shared/permission.service';

@Component({
  selector: 'app-states',
  templateUrl: './states.component.html',
  styleUrls: ['./states.component.scss'],
  encapsulation: ViewEncapsulation.None
})
export class StatesComponent implements OnInit, AfterViewChecked, AfterViewInit {
  @ViewChild('stateForm') stateForm!: NgForm;

  public id = 0;
  public stateName = '';
  public isDisplay = false;
  public modeHeader = 'Add State';
  public resetButton = true;
  public isEditMode = false;

  rows: any[] = [];
  tempData: any;
  StateList: any[] = [];

  selectedCountry: number | null = null;

  userId: number = 0;

  // IMPORTANT: DB/Menu permission code exact ah match aaganum
  functionId = 'states';

  permission: FunctionPermission;
  isPermissionLoaded = false;
  isPageLoading = false;

  constructor(
    private _stateService: StatesService,
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
          this.getAllState();
          this.getAllCountries();
        } else {
          this.StateList = [];
          this.rows = [];
          this.isDisplay = false;
        }
      },
      error: () => {
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

  createState(): void {
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
    this.modeHeader = 'Create State';
    this.reset();

    if (!this.rows?.length) {
      this.getAllCountries();
    }
  }

  reset(): void {
    this.modeHeader = this.isEditMode ? 'Edit State' : 'Create State';
    this.stateName = '';
    this.id = 0;
    this.selectedCountry = null;
    this.isEditMode = false;
    this.resetButton = true;
  }

  getAllState(): void {
    this._stateService.getState().subscribe({
      next: (response: any) => {
        this.StateList = response?.data || [];
      },
      error: (err) => {
        this.StateList = [];
        Swal.fire({
          icon: 'error',
          title: 'Error',
          text: err?.error?.message || err?.message || 'Unable to load states.',
          confirmButtonColor: '#d33'
        });
      }
    });
  }

  getAllCountries(): void {
    this._countriesService.getCountry().subscribe({
      next: (response: any) => {
        this.rows = response?.data || [];
        this.tempData = this.rows;
      },
      error: (err) => {
        this.rows = [];
        this.tempData = [];
        Swal.fire({
          icon: 'error',
          title: 'Error',
          text: err?.error?.message || err?.message || 'Unable to load countries.',
          confirmButtonColor: '#d33'
        });
      }
    });
  }

  private ensureCountriesThenSet(countryId: number): void {
    if (this.rows?.length) {
      this.selectedCountry = countryId;
      return;
    }

    this._countriesService.getCountry().subscribe({
      next: (response: any) => {
        this.rows = response?.data || [];
        this.tempData = this.rows;
        this.selectedCountry = countryId;
      },
      error: (err) => {
        this.rows = [];
        this.selectedCountry = countryId;
        Swal.fire({
          icon: 'error',
          title: 'Error',
          text: err?.error?.message || err?.message || 'Unable to load countries.',
          confirmButtonColor: '#d33'
        });
      }
    });
  }

  CreateState(): void {
    if (!this.stateName || !this.stateName.trim() || !this.selectedCountry) {
      Swal.fire({
        icon: 'warning',
        title: 'Warning',
        text: 'State Name and Country are required.',
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
      StateName: this.stateName.trim(),
      countryId: Number(this.selectedCountry),
      createdBy: this.userId,
      createdDate: new Date(),
      updatedBy: this.userId,
      updatedDate: new Date(),
      isActive: true
    };

    const req$ =
      this.id === 0
        ? this._stateService.insertState(obj)
        : this._stateService.updateState(obj);

    req$.subscribe({
      next: (res: any) => {
        if (res?.isSuccess) {
          Swal.fire({
            title: 'Success',
            text: res.message || (this.id === 0 ? 'State created successfully' : 'State updated successfully'),
            icon: 'success',
            allowOutsideClick: false,
            confirmButtonColor: '#0e3a4c'
          });

          this.getAllState();
          this.isDisplay = false;
          this.isEditMode = false;
        } else {
          Swal.fire({
            title: 'Error',
            text: res?.message || 'Operation failed',
            icon: 'error',
            allowOutsideClick: false,
            confirmButtonColor: '#d33'
          });
        }
      },
      error: (err) => {
        Swal.fire({
          title: 'Error',
          text: err?.error?.message || err?.message || 'Operation failed',
          icon: 'error',
          allowOutsideClick: false,
          confirmButtonColor: '#d33'
        });
      }
    });
  }

  getStateDetails(id: number): void {
    if (!this.canEdit()) {
      Swal.fire({
        icon: 'warning',
        title: 'Access Denied',
        text: 'You do not have edit permission.',
        confirmButtonColor: '#0e3a4c'
      });
      return;
    }

    this._stateService.getStateById(id).subscribe({
      next: (arg: any) => {
        const s = arg?.data;

        this.id = s?.id || 0;
        this.stateName = s?.stateName || '';

        this.isDisplay = true;
        this.resetButton = false;
        this.modeHeader = 'Edit State';
        this.isEditMode = true;

        this.ensureCountriesThenSet(Number(s?.countryId || 0));
      },
      error: (err) => {
        Swal.fire({
          icon: 'error',
          title: 'Error',
          text: err?.error?.message || err?.message || 'Unable to load state details',
          confirmButtonColor: '#d33'
        });
      }
    });
  }

  deleteState(id: number, isUsed?: any): void {
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
        text: 'This state is already used.',
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
        this._stateService.deleteState(id).subscribe({
          next: (response: any) => {
            Swal.fire({
              icon: response?.isSuccess ? 'success' : 'error',
              title: response?.isSuccess ? 'Deleted!' : 'Error!',
              text: response?.message || (
                response?.isSuccess
                  ? 'State deleted successfully'
                  : 'Failed to delete state'
              ),
              allowOutsideClick: false
            });

            this.getAllState();
          },
          error: (err) => {
            Swal.fire({
              icon: 'error',
              title: 'Error!',
              text: err?.error?.message || err?.message || 'Failed to delete state',
              allowOutsideClick: false,
              confirmButtonColor: '#d33'
            });
          }
        });
      }
    });
  }
}
