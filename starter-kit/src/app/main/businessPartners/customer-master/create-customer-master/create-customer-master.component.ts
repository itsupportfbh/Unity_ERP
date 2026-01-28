import { Component, AfterViewInit, ElementRef, ViewChild, OnInit } from '@angular/core';
import { NgForm } from '@angular/forms';
import Stepper from 'bs-stepper';
import * as feather from 'feather-icons';
import Swal from 'sweetalert2';
import { Router, ActivatedRoute } from '@angular/router';

import { CustomerGroupsService } from 'app/main/master/customer-groups/customer-groups.service';
import { PaymentTermsService } from 'app/main/master/payment-terms/payment-terms.service';
import { LocationService } from 'app/main/master/location/location.service';
import { CountriesService } from 'app/main/master/countries/countries.service';
import { ApprovallevelService } from 'app/main/master/approval-level/approvallevel.service';
import { CustomerMasterService } from '../customer-master.service';
import { environment } from 'environments/environment';
import { ChartofaccountService } from 'app/main/financial/chartofaccount/chartofaccount.service';

@Component({
  selector: 'app-create-customer-master',
  templateUrl: './create-customer-master.component.html',
  styleUrls: ['./create-customer-master.component.scss']
})
export class CreateCustomerMasterComponent implements AfterViewInit, OnInit {

  @ViewChild('stepper1', { static: true }) stepperEl!: ElementRef<HTMLDivElement>;
  private stepper!: Stepper;

  // --- Edit mode ---
  editMode = false;
  editingId: number | null = null;
customersCache: any[] = [];
  // --- Files & previews ---
  files: any = { drivingLicence: null, utilityBill: null, bankStatement: null, acra: null };
  preview: any = { drivingLicence: null, utilityBill: null, bankStatement: null, acra: null };

  // --- Dropdown data ---
  ApproverList: Array<{id:number; name:string}> = [];
  CustomerGroupList: any[] = [];
  PaymenttermsList: any[] = [];
  CountryList: any[] = [];
  LocationList: any[] = [];

  // --- Selected values ---
  selectedCountryId: number | null = null;
  selectedLocationId: number | null = null;
  selectedGroupId: number | null = null;
  selectedTermId: number | null = null;
  selectedApprovedById: number | null = null;

  // --- Form fields ---
  TDNameVar = '';
  TDContactPersonVar = '';
  TDEmailVar = '';
  TDContactNumberVar = '';
  TDCreditAmountVar: number | null = null;
  budgetLine: number | null = null;

  // --- Wizard ---
  currentIndex = 0;
  totalSteps = 3;
  editingKycId: any;
  userId:string;
  get isFirstStep() { return this.currentIndex === 0; }
  get isLastStep()  { return this.currentIndex === this.totalSteps - 1; }

  // --- Lock KYC when already approved ---
  isKycLocked = false;
  parentHeadList: Array<{ value: number; label: string }> = [];

  constructor(
    private _customerGroupService: CustomerGroupsService,
    private _paymentTermsService: PaymentTermsService,
    private _locationService: LocationService,
    private _countryService: CountriesService,
    private _approvalLevelService: ApprovallevelService,
    private _customerService: CustomerMasterService,
    private router: Router,
    private route: ActivatedRoute,
     private coaService: ChartofaccountService,
  ) {this.userId = localStorage.getItem('id')}

  // ---------------- INIT ----------------
  ngOnInit(): void {
    this.loadCustomerGroups();
    this.loadPaymentTerms();
    this.loadCountries();
    this.loadApprovalLevel();
    this.loadAccountHeads()
    this.loadExistingCustomers();
    // Detect edit mode by :id
    this.route.paramMap.subscribe(pm => {
      const id = Number(pm.get('id'));
      if (id) {
        this.editMode = true;
        this.editingId = id;
        this.loadForEdit(id);
      }
    });
  }
  private loadExistingCustomers(): void {
  this._customerService.getAllCustomerMaster().subscribe((res: any) => {
    if (res?.data && Array.isArray(res.data)) {
      this.customersCache = res.data;
    } else if (Array.isArray(res)) {
      this.customersCache = res;
    } else {
      this.customersCache = [];
    }
  });
}
private findDuplicateCustomer(): any | null {
  const name = (this.TDNameVar || '').trim().toLowerCase();
  const countryId = this.selectedCountryId;
  const locationId = this.selectedLocationId;

  if (!name || !countryId || !locationId || !Array.isArray(this.customersCache)) {
    return null;
  }

  return this.customersCache.find((c: any) => {
    const cName       = (c.customerName || c.CustomerName || '').trim().toLowerCase();
    const cCountryId  = Number(c.countryId ?? c.CountryId);
    const cLocationId = Number(c.locationId ?? c.LocationId);
    const cId         = Number(c.customerId ?? c.CustomerId ?? c.id ?? c.Id);

    // ignore current record in edit mode
    if (this.editMode && this.editingId && cId === this.editingId) {
      return false;
    }

    return (
      cName === name &&
      cCountryId === Number(countryId) &&
      cLocationId === Number(locationId)
    );
  }) || null;
}

   loadAccountHeads(): void {
    this.coaService.getAllChartOfAccount().subscribe((res: any) => {
      const data = (res?.data || []).filter((x: any) => x.isActive === true);
      this.parentHeadList = data.map((head: any) => ({
        value: Number(head.id),
        label: this.buildFullPath(head, data)
      }));
    });
  }

  /** Build breadcrumb like: Parent >> Child >> This */
  private buildFullPath(item: any, all: any[]): string {
    let path = item.headName;
    let current = all.find((x: any) => x.headCode === item.parentHead);
    while (current) {
      path = `${current.headName} >> ${path}`;
      current = all.find((x: any) => x.headCode === current.parentHead);
    }
    return path;
  }

  ngAfterViewInit(): void {
    this.stepper = new Stepper(this.stepperEl.nativeElement, { linear: true, animation: true });
    const update = () => {
      // @ts-ignore (private field on Stepper)
      this.currentIndex = this.stepper?._currentIndex ?? 0;
      feather.replace();
    };
    this.stepperEl.nativeElement.addEventListener('shown.bs.stepper', update);
    update();
  }

  // ------------- LOAD MASTER DATA -------------
  loadCustomerGroups() {
    this._customerGroupService.getCustomer().subscribe((res: any) => {
      if (res?.isSuccess && Array.isArray(res.data)) this.CustomerGroupList = res.data;
    });
  }

  loadPaymentTerms() {
    this._paymentTermsService.getAllPaymentTerms().subscribe((res: any) => {
      if (res?.isSuccess && Array.isArray(res.data)) this.PaymenttermsList = res.data;
    });
  }

  loadCountries() {
    this._countryService.getCountry().subscribe((res: any) => {
      if (res?.isSuccess && Array.isArray(res.data)) this.CountryList = res.data;
    });
  }

  loadLocationByCountryId(countryId: number) {
    this._locationService.getLocationByCountryId(countryId).subscribe((res: any) => {
      if (res?.isSuccess && Array.isArray(res.data)) this.LocationList = res.data;
    });
  }

  loadApprovalLevel() {
    this._approvalLevelService.getAllApprovalLevel().subscribe((res: any) => {
      if (res?.isSuccess && Array.isArray(res.data)) {
        // Ensure items expose {id:number, name:string}
        this.ApproverList = res.data.map((u: any) => ({
          id: Number(u.id ?? u.Id),
          name: String(u.name ?? u.Name ?? u.userName ?? 'User')
        }));
      }
    });
  }

  onCountryChange(event: any) {
    this.selectedCountryId = event?.id || null;
    if (this.selectedCountryId) this.loadLocationByCountryId(this.selectedCountryId);
    this.selectedLocationId = null;
  }

  // ------------- VALIDATION -------------
  onContactNumberInput() {
    if (this.TDContactNumberVar) {
      this.TDContactNumberVar = this.TDContactNumberVar.replace(/[^0-9]/g, '').slice(0, 10);
    }
  }

  // ------------- FILES -------------
  onFileChange(event: any, type: 'drivingLicence'|'utilityBill'|'bankStatement'|'acra') {
    if (this.isKycLocked) return; // guard when locked
    const file = event.target.files?.[0];
    if (!file) return;
    this.files[type] = file;

    const reader = new FileReader();
    reader.onload = () => this.preview[type] = reader.result;
    reader.readAsDataURL(file);
  }
  nextFromAccountDetails(form: NgForm) {
  // 1) Validate Step 1 form
  if (form && !form.valid) {
    form.control.markAllAsTouched();
    return;
  }

  // 2) Duplicate check (CustomerName + Country + Location)
  const duplicate = this.findDuplicateCustomer();

  if (duplicate && !this.editMode) {
    Swal.fire({
      icon: 'warning',
      title: 'Duplicate Record Found',
      html: `
        Customer <b>${this.TDNameVar}</b> already exists for the selected
        Country and Location.<br/><br/>
        Do you want to <b>load & update</b> that existing customer instead?
      `,
      showCancelButton: true,
      confirmButtonText: 'Yes, load & update',
      cancelButtonText: 'No, continue new'
    }).then(result => {
      if (result.isConfirmed) {
        const dupId = Number(duplicate.customerId ?? duplicate.CustomerId ?? duplicate.id ?? duplicate.Id);
        if (dupId) {
          this.editMode  = true;
          this.editingId = dupId;
          this.loadForEdit(dupId);    // load existing data into the wizard
          // Optionally jump directly to step 2 or 3; here we stay on step 1 so user can see data.
        }
      } else {
        // user wants to continue as NEW anyway → go to next step
        this.stepper.next();
      }
    });

    return; // stop here until Swal resolved
  }

  // 3) No duplicate → normal next
  this.stepper.next();
}

nextFromPersonalInfo(form: NgForm) {
  // 1) Validate Step 2 form
  if (form && !form.valid) {
    form.control.markAllAsTouched();
    return;
  }

  // 2) Duplicate check (CustomerName + Country + Location)
  const duplicate = this.findDuplicateCustomer();

  if (duplicate && !this.editMode) {
    Swal.fire({
      icon: 'warning',
      title: 'Duplicate Record Found',
      html: `
        Customer <b>${this.TDNameVar}</b> already exists for the selected
        Country and Location.<br/><br/>
        Do you want to update that existing customer instead?
      `,
      showCancelButton: true,
      confirmButtonText: 'Yes, load & update',
      cancelButtonText: 'No, stay here'
    }).then(result => {
      if (result.isConfirmed) {
        const dupId = Number(duplicate.customerId ?? duplicate.CustomerId ?? duplicate.id ?? duplicate.Id);
        if (dupId) {
          this.editMode  = true;
          this.editingId = dupId;
          this.loadForEdit(dupId);   // load existing record into wizard
          // optionally move to KYC step:
          this.stepper.to(3);        // step index is 1-based in bs-stepper (1,2,3)
        }
      }
    });

    return; // stop normal navigation
  }

  // 3) If no duplicate → normal Next to KYC
  this.stepper.next();
}

  // ------------- WIZARD -------------
  next(form?: NgForm) {
    if (form && !form.valid) {
      form.control.markAllAsTouched();
      return;
    }
    this.stepper.next();
  }

  prev() { this.stepper.previous(); }

  // ------------- EDIT: LOAD BY ID -------------
  loadForEdit(id: number) {
    this._customerService.EditLoadforCustomerbyId(id).subscribe({
      next: (res: any) => {
        if (!res?.isSuccess || !res.data) {
          Swal.fire({ icon: 'error', title: 'Error', text: 'Record not found.' });
          return;
        }
        const d = res.data;
        // this.editingId = d.customerId
 this.editingKycId = d.kycId; 
        // Fields
        this.TDNameVar            = d.customerName || '';
        this.TDContactPersonVar   = d.pointOfContactPerson || '';
        this.TDEmailVar           = d.email || '';
        this.TDContactNumberVar   = d.contactNumber?.toString() || '';
        this.TDCreditAmountVar    = d.creditAmount ?? null;

        this.selectedCountryId    = d.countryId ?? null;
        this.selectedLocationId   = d.locationId ?? null;
        this.selectedGroupId      = d.customerGroupId ?? null;
        this.budgetLine      = d.budgetLineId ?? null;
        this.selectedTermId       = d.paymentTermId ?? null;

        // FIX: API returns "approvedBy": "1" (string)
        this.selectedApprovedById = this.toNumOrNull(d.approvedBy);

        // Lock KYC when already approved
        this.isKycLocked = !!d.isApproved;

        // Previews
        const base = environment.apiUrl?.replace(/\/api$/,'') || '';
        this.preview.drivingLicence = d.dlImage ? (base + d.dlImage) : null;
        this.preview.utilityBill    = d.utilityBillImage ? (base + d.utilityBillImage) : null;
        this.preview.bankStatement  = d.bsImage ? (base + d.bsImage) : null;
        this.preview.acra           = d.acraImage ? (base + d.acraImage) : null;

        if (this.selectedCountryId) this.loadLocationByCountryId(this.selectedCountryId);
      },
      error: (err) => {
        Swal.fire({ icon: 'error', title: 'Error', text: err.error?.message || err.message });
      }
    });
  }

  // tiny helper (handles null/undefined/"")
  private toNumOrNull(v: any): number | null {
    const n = Number(v);
    return Number.isFinite(n) ? n : null;
  }

  // ------------- SUBMIT (CREATE / UPDATE) -------------
  onSubmit() {
     const duplicate = this.findDuplicateCustomer();

  if (duplicate && !this.editMode) {
    Swal.fire({
      icon: 'warning',
      title: 'Duplicate Record Found',
      html: `
        Customer <b>${this.TDNameVar}</b> already exists for the selected
        Country and Location.<br/><br/>
        Do you want to update that existing customer instead?
      `,
      showCancelButton: true,
      confirmButtonText: 'Yes, load & update',
      cancelButtonText: 'No, cancel'
    }).then(result => {
      if (result.isConfirmed) {
        const dupId = Number(duplicate.customerId ?? duplicate.CustomerId ?? duplicate.id ?? duplicate.Id);
        if (dupId) {
          this.editMode  = true;
          this.editingId = dupId;
          this.loadForEdit(dupId);   // load existing record into wizard
        }
      }
    });

    return;  // stop create call
  }

    const formData = new FormData();
  if (this.editingKycId) {
    formData.append('KycId', this.editingKycId.toString());
  }

   if (this.editingId) {
    formData.append('CustomerId', this.editingId.toString());
  }
    // Customer fields
    formData.append('CustomerName', this.TDNameVar || '');
    formData.append('CountryId', (this.selectedCountryId ?? '').toString());
    formData.append('LocationId', (this.selectedLocationId ?? '').toString());
    formData.append('ContactNumber', this.TDContactNumberVar || '');
    formData.append('PointOfContactPerson', this.TDContactPersonVar || '');
    formData.append('Email', this.TDEmailVar || '');
    formData.append('CustomerGroupId', (this.selectedGroupId ?? '').toString());
    formData.append('BudgetLineId', (this.budgetLine ?? '').toString());
    formData.append('PaymentTermId', (this.selectedTermId ?? '').toString());
    formData.append('CreditAmount', (this.TDCreditAmountVar ?? 0).toString());
    formData.append('CreatedBy', (this.userId)); // TODO: current user
    formData.append('UpdatedBy', (this.userId));
    // Approval state:
    const approvedId = Number(this.selectedApprovedById || 0);
    // If record is already approved, keep it approved.
    const isApproved = this.isKycLocked || approvedId > 0;
    formData.append('IsApproved', String(isApproved));
      if (approvedId > 0) {
      formData.append('ApprovedBy', String(approvedId));
      formData.append('IsApproved', 'true');
    } else {
      formData.append('IsApproved', 'false');
    }

    // Files (allow upload only when not locked)
    if (!this.isKycLocked) {
      if (this.files.drivingLicence) formData.append('DrivingLicence', this.files.drivingLicence);
      if (this.files.utilityBill)    formData.append('UtilityBill', this.files.utilityBill);
      if (this.files.bankStatement)  formData.append('BankStatement', this.files.bankStatement);
      if (this.files.acra)           formData.append('Acra', this.files.acra);
    }

    const req$ = this.editMode && this.editingId
      ? this._customerService.updateCustomer(formData)
      : this._customerService.insertCustomer(formData);

    req$.subscribe({
      next: (res: any) => {
        if (res?.isSuccess) {
          Swal.fire({
            icon: 'success',
            title: 'Success',
            text: this.editMode ? 'Customer updated!' : 'Customer + KYC created!'
          });
          this.goToCustomerList();
        } else {
          Swal.fire({ icon: 'error', title: 'Failed', text: res?.message || 'Something went wrong.' });
        }
      },
      error: (err) => {
        Swal.fire({ icon: 'error', title: 'Error', text: err.error?.message || err.message || 'Unexpected error.' });
      }
    });
  }

  goToCustomerList() {
    this.router.navigate(['/Businesspartners/customermaster']);
  }
}
