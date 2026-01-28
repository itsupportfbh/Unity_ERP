import {
  Component,
  EventEmitter,
  Input,
  OnInit,
  OnChanges,
  Output,
  SimpleChanges,
  ViewChild
} from '@angular/core';
import { NgForm } from '@angular/forms';
import { forkJoin } from 'rxjs';
import Swal from 'sweetalert2';

import { CoreSidebarService } from '@core/components/core-sidebar/core-sidebar.service';
import { CountriesService } from '../../countries/countries.service';
import { StatesService } from '../../states/states.service';
import { CitiesService } from '../../cities/cities.service';
import { WarehouseService } from '../warehouse.service';
import { BinService } from '../../bin/bin.service';

interface BinDto {
  id: number | string;
  binName: string;
  code?: string;
  isActive?: boolean;
}

@Component({
  selector: 'app-warehouse-create',
  templateUrl: './warehouse-create.component.html',
  styleUrls: ['./warehouse-create.component.scss']
})
export class WarehouseCreateComponent implements OnInit, OnChanges {
  @Output() callList = new EventEmitter<void>();
  @Input() passData: any;
  @ViewChild('newWarehouseForm') newWarehouseForm!: NgForm;

  // ===== UI / state =====
  loading = false;
  isEdit = false;

  // ===== form model =====
  public name: string | null = null;
  public countryId: number | null = null;
  public stateId: number | null = null;
  public cityId: number | null = null;
  public phone: string | null = null;
  public address: string | null = null;
  public description: string | null = null;

  // ===== master lists =====
  countryList: any[] = [];
  stateList: any[] = [];
  cityList: any[] = [];

  // dependent lists
  stateUpdatedList: any[] = [];
  cityUpdatedList: any[] = [];

  // ===== Bin multiselect =====
  binList: BinDto[] = [];
  selectedBinIds: Array<number | string> = [];

  constructor(
    private _coreSidebarService: CoreSidebarService,
    private countryService: CountriesService,
    private stateService: StatesService,
    private cityService: CitiesService,
    private warehouseService: WarehouseService,
    private binService: BinService
  ) {}

  // React when parent changes passData
  ngOnChanges(changes: SimpleChanges): void {
    if ('passData' in changes) this.loadData();
  }

  ngOnInit(): void {
    this.getAllData();
    this.loadBin();
  }

  // ===== Loaders =====
  private getAllData(): void {
    forkJoin({
      countries: this.countryService.getCountry(),
      states: this.stateService.getState(),
      cities: this.cityService.getCities()
    }).subscribe({
      next: (result: any) => {
        this.countryList = result.countries?.data ?? [];
        this.stateList   = result.states?.data ?? [];
        this.cityList    = result.cities?.data ?? [];
        this.loadData();
      },
      error: (err) => console.error('Error fetching data', err)
    });
  }

  private loadBin(): void {
    this.binService.getAllBin().subscribe((res: any) => {
      const raw = Array.isArray(res?.data) ? res.data : [];
      this.binList = raw
        .filter((x: any) => x.isActive === true)
        .map((x: any) => ({
          id: x.id,
          binName: x.binName ?? x.name ?? `Bin ${x.id}`,
          code: x.code,
          isActive: x.isActive
        }));
      setTimeout(() => (window as any).feather?.replace?.(), 0);
    });
  }

  // ===== Mode & form helpers =====
  private enterCreateMode(): void {
    this.isEdit = false;
    this.resetFormModel();
    this.selectedBinIds = [];

    Promise.resolve().then(() => {
      this.newWarehouseForm?.resetForm({
        name: null,
        countryId: null,
        stateId: null,
        cityId: null,
        phone: null,
        address: null,
        description: null,
        binIds: [] // template name for ngModel
      });
    });
  }

  private resetFormModel(): void {
    this.name = this.phone = this.address = this.description = null;
    this.countryId = this.stateId = this.cityId = null;
    this.stateUpdatedList = [];
    this.cityUpdatedList = [];
  }

  /** Hydrate UI based on passData (edit) or reset for create */
  private loadData(): void {
    if (!this.countryList.length || !this.stateList.length || !this.cityList.length) return;

    if (this.passData && this.passData.id) {
      this.isEdit = true;

      this.name        = this.passData.name ?? null;
      this.phone       = this.passData.phone ?? null;
      this.address     = this.passData.address ?? null;
      this.description = this.passData.description ?? null;

      this.countryId = this.passData.countryId ?? null;
      this.onCountryChange(this.countryId);

      this.stateId = this.passData.stateId ?? null;
      this.onStateChange(this.stateId);

      this.cityId = this.passData.cityId ?? null;

      // --- KEY: hydrate bins from backend ---
      // Backend sends BinID as CSV (e.g., "1,3,4")
      if (typeof this.passData?.BinID === 'string') {
        this.selectedBinIds = this.passData.BinID
          .split(',')
          .map((s: string) => Number(s.trim()))
          .filter((n: number) => Number.isFinite(n));
      } else if (Array.isArray(this.passData?.binIds)) {
        // fallback if backend sometimes returns array
        this.selectedBinIds = [...this.passData.binIds];
      } else {
        this.selectedBinIds = [];
      }

      Promise.resolve().then(() => {
        this.newWarehouseForm?.resetForm({
          name: this.name,
          countryId: this.countryId,
          stateId: this.stateId,
          cityId: this.cityId,
          phone: this.phone,
          address: this.address,
          description: this.description,
          binIds: this.selectedBinIds
        });
      });
    } else {
      this.enterCreateMode();
    }
  }

  // ===== Cascading selects =====
  onCountryChange(selectedCountryId: number | null): void {
    this.stateId = null;
    this.cityId = null;
    this.cityUpdatedList = [];
    this.stateUpdatedList = [];
    if (selectedCountryId == null) return;

    this.stateUpdatedList = (this.stateList ?? []).filter(
      (s: any) => Number(s.countryId) === Number(selectedCountryId)
    );
  }

  onStateChange(selectedStateId: number | null): void {
    this.cityUpdatedList = [];
    if (selectedStateId == null) return;

    this.cityUpdatedList = (this.cityList ?? []).filter(
      (c: any) => Number(c.stateId) === Number(selectedStateId)
    );
  }

  // ===== Sidebar =====
  toggleSidebar(name: string): void {
    this._coreSidebarService.getSidebarRegistry(name).toggleOpen();
  }

  // ===== Submit =====
  submit(form: NgForm): void {
    form.control.markAllAsTouched();
    if (!form.valid || this.loading) return;

    this.loading = true;

    // Convert selectedBinIds -> CSV string because backend requires "BinID"
    const binIdCsv = (this.selectedBinIds ?? [])
      .map(x => Number(x))
      .filter(n => Number.isFinite(n))
      .join(',');

    const basePayload: any = {
      name: this.name?.trim(),
      countryId: this.countryId,
      stateId: this.stateId,
      cityId: this.cityId,
      phone: this.phone?.trim(),
      address: this.address?.trim() || null,
      description: this.description?.trim() || null,
      // IMPORTANT: backend expects PascalCase "BinID" (CSV string "1,3,4")
      BinID: binIdCsv
    };

    const request$ = this.isEdit
      ? this.warehouseService.updateWarehouse({ id: this.passData.id, ...basePayload })
      : this.warehouseService.insertWarehouse(basePayload);

    request$.subscribe({
      next: () => {
        Swal.fire({
          icon: 'success',
          title: this.isEdit ? 'Updated!' : 'Created!',
          text: `Warehouse ${this.isEdit ? 'updated' : 'created'} successfully`,
          confirmButtonText: 'OK',
          confirmButtonColor: '#0e3a4c'
        }).then(() => {
          this.callList.emit();
          this.toggleSidebar('app-warehouse-create');
          if (!this.isEdit) this.enterCreateMode();
        });
      },
      error: (err) => {
        console.error('Warehouse save error', err);
        Swal.fire({
          icon: 'error',
          title: 'Error',
          text: `Failed to ${this.isEdit ? 'update' : 'create'} Warehouse`,
          confirmButtonText: 'OK',
          confirmButtonColor: '#d33'
        });
      },
      complete: () => {
        this.loading = false;
      }
    });
  }
}
