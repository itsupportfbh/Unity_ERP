import { Component, EventEmitter, Input, OnInit, Output, ViewChild, OnChanges, SimpleChanges } from '@angular/core';

import { CountriesService } from '../../countries/countries.service';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { CitiesService } from '../../cities/cities.service';
import { LocationService } from '../location.service';
import Swal from 'sweetalert2';
import { CoreSidebarService } from '@core/components/core-sidebar/core-sidebar.service';
import { throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';

@Component({
  selector: 'app-create-location',
  templateUrl: './create-location.component.html',
  styleUrls: ['./create-location.component.scss']
})
export class CreateLocationComponent implements OnInit,OnChanges {
  rows: any;
  @ViewChild('form') form: any;
  locationForm!: FormGroup;
  countries: any;
  StateList: any[];
  selectedState: number;
  CityList: any[];
  submitted = false;
 @Output() onLocationChange = new EventEmitter<any>();
 @Input() locationId: number | null = null;
  constructor(private _countriesService: CountriesService, private fb: FormBuilder,
    private _cityService: CitiesService,
    private _locationService : LocationService,
    private _coreSidebarService: CoreSidebarService
  ) { }

  ngOnInit(): void {
    this.initForm();
    this.getAllCountries();

  }

ngOnChanges(changes: SimpleChanges): void {
   if (changes['locationId']) {

    // ✅ EDIT
    if (this.locationId) {
      this.getLocationById(this.locationId);
      return;
    }

    // ✅ CREATE (Add New)
    this.resetToCreateMode();
  }
}
resetToCreateMode() {
  this.submitted = false;

  this.locationForm.reset({
    locationName: '',
    countryId: '',
    stateId: '',
    cityId: '',
    contactNumber: ''
  });

  this.StateList = [];
  this.CityList = [];

  this.locationForm.markAsPristine();
  this.locationForm.markAsUntouched();
  this.locationForm.updateValueAndValidity();

  // ✅ reload each time (core-sidebar reuse)
  this.getAllCountries();
}

  getAllCountries() {
    this._countriesService.getCountry().subscribe((response: any) => {
      this.countries = response?.data ?? [];
      console.log("Countries", this.countries)
    });
  }

getLocationById(id: number) {
  this._locationService.getLocationById(id)
    .pipe(catchError((error) => {
      console.error('Error fetching location details:', error);
      return throwError(error);
    }))
    .subscribe(async (resp: any) => {
      if (resp.isSuccess) {
        const location = resp.data;

        // First, set countryId and load states
        this.locationForm.patchValue({
          locationName: location.name,
          contactNumber: location.contactNumber,
         // latitude: location.latitude,
        //  longitude: location.longitude,
          countryId: location.countryId
        });

        await this.loadStatesAndCities(location.countryId, location.stateId, location.cityId);
      }
    });
}

async loadStatesAndCities(countryId: number, stateId: number, cityId: number) {
  this._cityService.GetStateWithCountryId(countryId).subscribe((stateRes: any) => {
    const states = stateRes?.data ?? [];
    this.StateList = Array.isArray(states) ? states : [states];

    this.locationForm.patchValue({ stateId });

    this._cityService.GetCityWithStateId(stateId).subscribe((cityRes: any) => {
      const cities = cityRes?.data ?? [];
      this.CityList = Array.isArray(cities) ? cities : [cities];

      this.locationForm.patchValue({ cityId });
    });
  });
}



  getAllState(countryId: number) {
    debugger
    this._cityService.GetStateWithCountryId(countryId).subscribe((res: any) => {
      const data = res?.data;
      this.StateList = Array.isArray(data) ? data : (data ? [data] : []);
    });
  }
  onCountryChange(selectedCountry: any) {
    debugger;
    const countryId = +selectedCountry; // Convert to number

    if (countryId) {
      this.getAllState(countryId);
      this.locationForm.get('stateId')?.reset();
    } else {
      this.StateList = [];
    }
  }

  onStateChange(stateId: string) {
    debugger
    const parsedStateId = +stateId;
    if (parsedStateId) {
      this.getAllCities(parsedStateId);
      this.locationForm.get('cityId')?.reset();
    } else {
      this.CityList = [];
    }
  }

toggleModal(name: string): void {
  const sidebar = this._coreSidebarService.getSidebarRegistry(name);
  sidebar.toggleOpen();
 
  // If closing, reset the form
  if (!sidebar.open) {
    this.enterCreateDefaults();
  }
}

enterCreateDefaults(){
this.locationForm.reset({
    locationName: '',
    countryId: null,
    stateId: null,
    cityId: null,
    contactNumber:'',
    latitude: '',
    longitude: ''
  });
}
  getAllCities(stateId: number) {
    debugger
    this._cityService.GetCityWithStateId(stateId).subscribe((res: any) => {
      const data = res?.data;
      this.CityList = Array.isArray(data) ? data : (data ? [data] : []);
    });
  }
  private initForm(): void {
    this.locationForm = this.fb.group({
      locationName: ['', Validators.required],
      countryId: [null, Validators.required],
      stateId: [null, Validators.required],
      cityId: [null, Validators.required],
      contactNumber: ['', [Validators.required, Validators.pattern(/^[0-9]{10}$/)]]
     
    });
  }

  resetForm() {
  this.locationForm.reset({
    locationName: '',
    countryId: null,
    stateId: null,
    cityId: null,
    latitude: '',
    contactNumber: '',
    longitude: ''
  });
}


 submit() {
  this.submitted = true;

  if (this.locationForm.invalid) {
    this.locationForm.markAllAsTouched();
    return;
  }

  const isEdit = this.locationId && this.locationId > 0;

  const obj: any = {
    id: isEdit ? this.locationId : 0,
    name: this.locationForm.value.locationName,
    contactNumber: this.locationForm.value.contactNumber,
    latitude: null,
    longitude: null,
    countryId: +this.locationForm.value.countryId,
    stateId: +this.locationForm.value.stateId,
    cityId: +this.locationForm.value.cityId,
    isActive: true,
    createdBy: "1",
    createdDate: isEdit ? undefined : new Date(),
    updatedBy: "1",
    updatedDate: new Date()
  };

  const request$ = isEdit
    ? this._locationService.updateLocation(obj)
    : this._locationService.insertLocation(obj);

  request$.subscribe((res) => {
    if (res.isSuccess) {
      Swal.fire({
        title: isEdit ? 'Updated' : 'Created',
        text: res.message,
        icon: 'success',
        allowOutsideClick: false,
      });

      this.onLocationChange.emit();
      this.toggleModal('app-create-location');

      this.resetToCreateMode();
      this.locationId = null;
    }
  });
}
onlyDigits(event: any) {
  const input = event.target as HTMLInputElement;
  const v = (input.value || '').replace(/\D/g, '').slice(0, 10);
  input.value = v;
  this.locationForm.get('contactNumber')?.setValue(v, { emitEvent: false });
}
}
