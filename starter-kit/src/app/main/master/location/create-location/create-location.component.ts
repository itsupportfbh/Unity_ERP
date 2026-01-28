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
  if (changes['locationId'] && this.locationId) {
    this.getLocationById(this.locationId);
  }
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
      contactNumber: ['', Validators.required],
     
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


 submit(formGroupRef: any) {
  debugger
  if (this.locationForm.valid) {
    const isEdit = this.locationId && this.locationId > 0;

    const obj: any = {
      id: isEdit ? this.locationId : 0,
      name: this.locationForm.controls['locationName'].value,
      contactNumber: this.locationForm.controls['contactNumber'].value,
      latitude: null,
      longitude: null,
      countryId: this.locationForm.controls['countryId'].value,
      stateId: this.locationForm.controls['stateId'].value,
      cityId: this.locationForm.controls['cityId'].value,
      isActive: true,
      createdBy: "1",
      createdDate: isEdit ? undefined : new Date(), // Only set on create
      updatedBy: "1",
      updatedDate: new Date()
    };

    const request$ = isEdit
      ? this._locationService.updateLocation(obj) // 👈 update path
      : this._locationService.insertLocation(obj); // 👈 create path

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

        // ✅ Reset form and mode after submit
        this.resetForm();
        this.locationId = null;
      }
    });
  }
}

}
