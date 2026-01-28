import { AfterViewChecked, AfterViewInit, Component, OnInit, ViewChild } from '@angular/core';
import { NgForm } from '@angular/forms';
import * as feather from 'feather-icons';
import { StatesService } from './states.service';
import Swal from 'sweetalert2';
import { CountriesService } from '../countries/countries.service';
@Component({
  selector: 'app-states',
  templateUrl: './states.component.html',
  styleUrls: ['./states.component.scss']
})
export class StatesComponent implements OnInit, AfterViewChecked, AfterViewInit {
  @ViewChild('stateForm') stateForm!: NgForm;

  public id = 0;
  public stateName = "";
  public isDisplay = false;
  public modeHeader = 'Add State';
  public resetButton = true;
  public isEditMode = false;

  rows: any[] = [];
  tempData: any;
  StateList: any;

  // make this numeric
  selectedCountry: number | null = null;

  constructor(
    private _stateService: StatesService,
    private _countriesService: CountriesService
  ) {}

  ngOnInit(): void {
    this.getAllState();
    this.getAllCountries(); // <-- ensure list is ready for edit
  }

  ngAfterViewInit(): void { feather.replace(); }
  ngAfterViewChecked(): void { feather.replace(); }

  cancel() 
  { 
    this.isDisplay = false; 
    this.isEditMode = false;
  }

  createState() {
    this.isDisplay = true;
    this.modeHeader = 'Add State';
    this.reset();
    // optional: refresh countries if needed
    if (!this.rows?.length) this.getAllCountries();
  }

  reset() {
    this.modeHeader = 'Create State';
    this.stateName = "";
    this.id = 0;
    this.selectedCountry = 0; 
    this.isEditMode = false;
    this.resetButton = true;
  }

  getAllState() {
    this._stateService.getState().subscribe((response: any) => {
      this.StateList = response.data;
      this.tempData = this.rows;
    });
  }

  getAllCountries() {
    this._countriesService.getCountry().subscribe((response: any) => {
      this.rows = response.data;
      this.tempData = this.rows;
    });
  }

  // helper: load countries then set the selected one
  private ensureCountriesThenSet(countryId: number) {
    if (this.rows?.length) {
      this.selectedCountry = countryId;
      return;
    }
    this._countriesService.getCountry().subscribe((response: any) => {
      this.rows = response.data;
      this.selectedCountry = countryId;
    });
  }

  CreateState() {
    const obj = {
      id: this.id,
      StateName: this.stateName,
      countryId: this.selectedCountry, // <-- numeric id
      createdBy: '1',
      createdDate: new Date(),
      updatedBy: '1',
      updatedDate: new Date(),
      isActive: true,
    };

    const req$ = this.id === 0
      ? this._stateService.insertState(obj)
      : this._stateService.updateState(obj);

    req$.subscribe((res: any) => {
      if (res.isSuccess) {
        Swal.fire({ title: 'Hi', text: res.message, icon: 'success', allowOutsideClick: false });
        this.getAllState();
        this.isDisplay = false;
        this.isEditMode = false;
      }
      else{
         Swal.fire({ title: 'Hi', text: res.message, icon: 'error', allowOutsideClick: false });
      }
    });
  }

  getStateDetails(id: number) {
    this._stateService.getStateById(id).subscribe((arg: any) => {
      const s = arg.data;
      this.id = s.id;
      this.stateName = s.stateName;

      // make the form visible first
      this.isDisplay = true;
      this.resetButton = false;
      this.modeHeader = 'Edit State';
      this.isEditMode = true;

      // ensure country list is ready, then set value
      this.ensureCountriesThenSet(s.countryId);
    });
  }

  deleteState(id: number) {
    Swal.fire({
      title: 'Are you sure?',
      text: "You won't be able to revert this!",
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#7367F0',
      cancelButtonColor: '#E42728',
      confirmButtonText: 'Yes, Delete it!',
      customClass: { confirmButton: 'btn btn-primary', cancelButton: 'btn btn-danger ml-1' },
      allowOutsideClick: false,
    }).then((result) => {
      if (result.value) {
        this._stateService.deleteState(id).subscribe((response: any) => {
          Swal.fire({
            icon: response.isSuccess ? 'success' : 'error',
            title: response.isSuccess ? 'Deleted!' : 'Error!',
            text: response.message,
            allowOutsideClick: false,
          });
          this.getAllState();
        });
      }
    });
  }
}

