import { AfterViewChecked, AfterViewInit, Component, OnInit, ViewChild } from '@angular/core';
import { NgForm } from '@angular/forms';
import * as feather from 'feather-icons';
import Swal from 'sweetalert2';
import { CitiesService } from './cities.service';
import { StatesService } from '../states/states.service';
import { CountriesService } from '../countries/countries.service';
import { FunctionPermission, PermissionService } from 'app/shared/permission.service';

@Component({
  selector: 'app-cities',
  templateUrl: './cities.component.html',
  styleUrls: ['./cities.component.scss']
})
export class CitiesComponent implements OnInit, AfterViewChecked, AfterViewInit {
  @ViewChild('cityForm') cityForm!: NgForm;

  public id = 0;
  public cityName = '';
  public isDisplay = false;
  public cityHeader = 'Add City';
  public resetButton = true;
  public isEditMode = false;

  rows: any[] = [];           // Countries
  StateList: any[] = [];      // States
  CityList: any[] = [];       // Cities

  selectedCountry: number | null = null;
  selectedState: number | null = null;
  userId: number;

    functionId = 'cities';
  
    permission: FunctionPermission;
      isPermissionLoaded = false;
      isPageLoading = false;
  constructor(
    private _cityService: CitiesService,
    private _stateService: StatesService,
    private _countriesService: CountriesService,
     private permissionService : PermissionService
  ) 
  {
         this.userId = Number(localStorage.getItem('id') || 0);
          this.permission = this.permissionService.getEmptyPermission(this.functionId);
  }

  ngOnInit(): void {
    this.loadPermission();
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
                this.getAllCities();
              } else {
                this.CityList = [];
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
  ngAfterViewInit(): void { feather.replace(); }
  ngAfterViewChecked(): void { feather.replace(); }

  // ===== CRUD Actions =====

  createcity() {
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
    this.cityHeader = 'Add City';
    this.reset();
    if (!this.rows?.length) this.getAllCountries();
  }

  reset() {
    this.cityHeader = 'Create City';
    this.cityName = '';
    this.id = 0;
    this.selectedCountry = null;
    this.selectedState = null;
    this.isEditMode = false;
    this.resetButton = true;
  }

  cancel() {
    this.isDisplay = false;
    this.isEditMode = false;
  }

  // ===== Dropdown Handling =====

  onCountryChange(countryId: number | null) {
    this.selectedCountry = countryId;
    this.selectedState = null; // clear state selection
    if (countryId != null) {
      this.getAllState(countryId);
    } else {
      this.StateList = [];
    }
  }

  getAllState(countryId: number, preselectStateId?: number) {
    this._cityService.GetStateWithCountryId(countryId).subscribe({
      next: (res: any) => {
        const data = res?.data;
        this.StateList = Array.isArray(data) ? data : (data ? [data] : []);

        if (preselectStateId != null) {
          this.selectedState = preselectStateId;
        }
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

  getAllCountries() {
    this._countriesService.getCountry().subscribe({
      next: (response: any) => {
        this.rows = response.data ?? [];
      },
      error: (err) => {
        this.rows = [];
        Swal.fire({
          icon: 'error',
          title: 'Error',
          text: err?.error?.message || err?.message || 'Unable to load countries.',
          confirmButtonColor: '#d33'
        });
      }
    });
  }

  getAllCities() {
    this._cityService.getCities().subscribe({
      next: (response: any) => {
        this.CityList = response.data ?? [];
        this.getAllCountries();
      },
      error: (err) => {
        this.CityList = [];
        Swal.fire({
          icon: 'error',
          title: 'Error',
          text: err?.error?.message || err?.message || 'Unable to load cities.',
          confirmButtonColor: '#d33'
        });
      }
    });
  }

  // ===== Create / Update =====

  CreateCity() {
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
      cityName: this.cityName,
      countryId: this.selectedCountry,
      stateId: this.selectedState,
      createdBy: this.userId,
      createdDate: new Date(),
      updatedBy: this.userId,
      updatedDate: new Date(),
      isActive: true,
    };

    const req$ = this.id === 0
      ? this._cityService.insertCities(obj)
      : this._cityService.updateCities(obj);

    req$.subscribe({
      next: (res: any) => {
        if (res.isSuccess) {
          Swal.fire({ title: 'Success', text: res.message, icon: 'success', allowOutsideClick: false });
          this.getAllCities();
          this.isDisplay = false;
          this.isEditMode = false;
        } else {
          Swal.fire({ title: 'Error', text: res.message || 'Operation failed', icon: 'error', allowOutsideClick: false });
        }
      },
      error: (err) => {
        Swal.fire({
          title: 'Error',
          text: err?.error?.message || err?.message || 'Operation failed',
          icon: 'error',
          allowOutsideClick: false
        });
      }
    });
  }

  // ===== Edit =====

  getCityDetails(id: number) {
    if (!this.canEdit()) {
      Swal.fire({
        icon: 'warning',
        title: 'Access Denied',
        text: 'You do not have edit permission.',
        confirmButtonColor: '#0e3a4c'
      });
      return;
    }

    this._cityService.getCitiesById(id).subscribe({
      next: (arg: any) => {
        const s = arg.data;

        this.id = s.id;
        this.cityName = s.cityName;

        this.isDisplay = true;
        this.resetButton = false;
        this.cityHeader = 'Edit City';
        this.isEditMode = true;

        this.selectedCountry = s.countryId;

        this.getAllState(s.countryId, s.stateId);
      },
      error: (err) => {
        Swal.fire({
          icon: 'error',
          title: 'Error',
          text: err?.error?.message || err?.message || 'Unable to load city details.',
          confirmButtonColor: '#d33'
        });
      }
    });
  }

  // ===== Delete =====

  deleteCity(id: number) {
    if (!this.canDelete()) {
      Swal.fire({
        icon: 'warning',
        title: 'Access Denied',
        text: 'You do not have delete permission.',
        confirmButtonColor: '#0e3a4c'
      });
      return;
    }

    Swal.fire({
      title: 'Are you sure?',
      text: "You won't be able to revert this!",
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#7367F0',
      cancelButtonColor: '#E42728',
      confirmButtonText: 'Yes, Delete it!',
      customClass: {
        confirmButton: 'btn btn-primary',
        cancelButton: 'btn btn-danger ml-1'
      },
      allowOutsideClick: false,
    }).then((result) => {
      if (result.value) {
        this._cityService.deleteCities(id).subscribe({
          next: (response: any) => {
            Swal.fire({
              icon: response.isSuccess ? 'success' : 'error',
              title: response.isSuccess ? 'Deleted!' : 'Error!',
              text: response.message,
              allowOutsideClick: false,
            });
            this.getAllCities();
          },
          error: (err) => {
            Swal.fire({
              icon: 'error',
              title: 'Error!',
              text: err?.error?.message || err?.message || 'Failed to delete city.',
              allowOutsideClick: false,
            });
          }
        });
      }
    });
  }
}
