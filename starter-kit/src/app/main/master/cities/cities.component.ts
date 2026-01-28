import { AfterViewChecked, AfterViewInit, Component, OnInit, ViewChild } from '@angular/core';
import { NgForm } from '@angular/forms';
import * as feather from 'feather-icons';
import Swal from 'sweetalert2';
import { CitiesService } from './cities.service';
import { StatesService } from '../states/states.service';
import { CountriesService } from '../countries/countries.service';

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

  constructor(
    private _cityService: CitiesService,
    private _stateService: StatesService,
    private _countriesService: CountriesService
  ) {}

  ngOnInit(): void {
    this.getAllCities();
    this.getAllCountries();
  }

  ngAfterViewInit(): void { feather.replace(); }
  ngAfterViewChecked(): void { feather.replace(); }

  // ===== CRUD Actions =====

  createcity() {
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
    this._cityService.GetStateWithCountryId(countryId).subscribe((res: any) => {
      const data = res?.data;
      this.StateList = Array.isArray(data) ? data : (data ? [data] : []);

      // Preselect state if provided (edit scenario)
      if (preselectStateId != null) {
        this.selectedState = preselectStateId;
      }
    });
  }

  getAllCountries() {
    this._countriesService.getCountry().subscribe((response: any) => {
      this.rows = response.data ?? [];
    });
  }

  getAllCities() {
    this._cityService.getCities().subscribe((response: any) => {
      this.CityList = response.data ?? [];
    });
  }

  // ===== Create / Update =====

  CreateCity() {
    const obj = {
      id: this.id,
      cityName: this.cityName,
      countryId: this.selectedCountry,
      stateId: this.selectedState,
      createdBy: '1',
      createdDate: new Date(),
      updatedBy: '1',
      updatedDate: new Date(),
      isActive: true,
    };

    const req$ = this.id === 0
      ? this._cityService.insertCities(obj)
      : this._cityService.updateCities(obj);

    req$.subscribe((res: any) => {
      if (res.isSuccess) {
        Swal.fire({ title: 'Success', text: res.message, icon: 'success', allowOutsideClick: false });
        this.getAllCities();
        this.isDisplay = false;
        this.isEditMode = false;
      }
      else{
        Swal.fire({ title: 'Error', text: res.message, icon: 'error', allowOutsideClick: false });
      }
    });
  }

  // ===== Edit =====

  getCityDetails(id: number) {
    this._cityService.getCitiesById(id).subscribe((arg: any) => {
      const s = arg.data;

      this.id = s.id;
      this.cityName = s.cityName;

      this.isDisplay = true;
      this.resetButton = false;
      this.cityHeader = 'Edit City';
      this.isEditMode = true;

      // 1. Set country
      this.selectedCountry = s.countryId;

      // 2. Load states for that country, preselect the correct one
      this.getAllState(s.countryId, s.stateId);
    });
  }

  // ===== Delete =====

  deleteCity(id: number) {
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
        this._cityService.deleteCities(id).subscribe((response: any) => {
          Swal.fire({
            icon: response.isSuccess ? 'success' : 'error',
            title: response.isSuccess ? 'Deleted!' : 'Error!',
            text: response.message,
            allowOutsideClick: false,
          });
          this.getAllCities();
        });
      }
    });
  }
}
