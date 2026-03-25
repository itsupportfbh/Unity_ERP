import { Component, OnInit, ViewEncapsulation } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';

import {
  CompanyService,
  CreateCompanySetupPayload,
  CompanySetupDetailDto,
  OrganizationLookupRow
} from '../company-service';
import Swal from 'sweetalert2';
import { Observable } from 'rxjs';

type CompanyTab =
  | 'general'
  | 'financeTax'
  | 'defaults'
  | 'numberSeries'
  | 'adminUser'
  | 'audit';

interface NumberSeriesRow {
  document: string;
  prefix: string;
  nextNo: number;
  reset: boolean;
}

@Component({
  selector: 'app-company-create',
  templateUrl: './company-create.component.html',
  styleUrls: ['./company-create.component.scss'],
  encapsulation: ViewEncapsulation.None
})
export class CompanyCreateComponent implements OnInit {
  activeTab: CompanyTab = 'general';

  readonly tabsOrder: CompanyTab[] = [
    'general',
    'financeTax',
    'defaults',
    'numberSeries',
    'adminUser',
    'audit'
  ];

  generalForm!: FormGroup;
  financeForm!: FormGroup;
  defaultsForm!: FormGroup;
  integrationForm!: FormGroup;
  adminUserForm!: FormGroup;

  logoPreview: string | null = null;

  numberSeries: NumberSeriesRow[] = [
    { document: 'Sales Invoice', prefix: 'SI', nextNo: 1, reset: true },
    { document: 'Purchase Invoice (PIN)', prefix: 'PIN', nextNo: 1, reset: true },
    { document: 'Delivery Order', prefix: 'DO', nextNo: 1, reset: true }
  ];

  lastUpdatedBy: string = '—';
  lastUpdatedAt = '—';
  auditTrail: Array<{ date: string; user: string; change: string }> = [];

  saving = false;
  loading = false;
  successMsg = '';
  errorMsg = '';

  isEdit = false;
  companyId = 0;
  showPassword = false;

  isNewOrganization = true;
  organizations: OrganizationLookupRow[] = [];
  selectedOrganizationId = 0;
  selectedOrgGuid = '';

  constructor(
    private fb: FormBuilder,
    private router: Router,
    private route: ActivatedRoute,
    private companyService: CompanyService
  ) {}

  ngOnInit(): void {
    this.buildForms();
    this.loadOrganizations();

    const idParam = this.route.snapshot.paramMap.get('id');
    if (idParam) {
      this.isEdit = true;
      this.companyId = +idParam;
      this.loadCompany(this.companyId);
    }

    this.setPasswordState();
  }

  private buildForms(): void {
    this.generalForm = this.fb.group({
      code: ['', [Validators.required, Validators.maxLength(50)]],
      name: ['', [Validators.required, Validators.maxLength(200)]],
      legalName: [''],
      registrationNo: [''],
      taxRegistrationNo: [''],
      status: ['1'],
      phone: [''],
      email: ['', [Validators.email]],
      website: [''],
      country: ['Singapore'],

      contactPerson: [''],
      contactMobileNo: [''],
      contactEmail: ['', [Validators.email]],

      address1: [''],
      address2: [''],
      city: [''],
      state: [''],
      postal: ['']
    });

    this.financeForm = this.fb.group({
      baseCurrency: ['SGD', [Validators.required]],
      country: ['Singapore'],
      taxMode: ['Exclusive'],
      gstNo: [''],
      filingFrequency: ['Monthly'],
      defaultOutputTaxCode: [''],
      defaultInputTaxCode: [''],
      decimalPlaces: [2],
      roundingRule: ['Round half up']
    });

    this.defaultsForm = this.fb.group({
      defaultBranch: ['Head Office'],
      defaultWarehouse: ['Main Warehouse'],
      defaultBin: ['MAIN'],
      defaultLanguage: ['EN'],
      timeZone: ['Asia/Kolkata']
    });

    this.integrationForm = this.fb.group({
      whatsapp: [true],
      smtp: [true],
      ocr: [false],
      apiEndpoint: [''],
      apiKey: ['']
    });

    this.adminUserForm = this.fb.group({
      username: ['', [Validators.required, Validators.maxLength(100)]],
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required, Validators.minLength(6)]],
      departmentId: [1],
      locationId: [1]
    });
  }

  private loadOrganizations(): void {
    this.companyService.getOrganizations().subscribe({
      next: (res) => {
        this.organizations = res || [];
      },
      error: () => {
        this.organizations = [];
      }
    });
  }

  onOrganizationModeChange(value: boolean): void {
    this.isNewOrganization = value;

    if (value) {
      this.selectedOrganizationId = 0;
      this.selectedOrgGuid = '';
    }
  }

  onOrganizationSelected(orgId: number | string): void {
    this.selectedOrganizationId = Number(orgId || 0);

    const org = this.organizations.find(x => x.id === this.selectedOrganizationId);
    this.selectedOrgGuid = org?.orgGuid || '';
  }

  private getCurrentUserId(): number {
    return Number(localStorage.getItem('id') || 0);
  }

  private loadCompany(id: number): void {
    this.loading = true;
    this.errorMsg = '';

    this.companyService.getCompanyById(id).subscribe({
      next: (res: CompanySetupDetailDto) => {
        this.loading = false;

        this.generalForm.patchValue({
          code: res.general?.code ?? '',
          name: res.general?.name ?? '',
          legalName: res.general?.legalName ?? '',
          registrationNo: res.general?.registrationNo ?? '',
          taxRegistrationNo: res.general?.taxRegistrationNo ?? '',
          status: String(res.general?.status ?? '1'),
          phone: res.general?.phone ?? '',
          email: res.general?.email ?? '',
          website: res.general?.website ?? '',
          country: res.general?.country ?? 'Singapore',
          contactPerson: res.general?.contactPerson ?? '',
          contactMobileNo: res.general?.contactMobileNo ?? '',
          contactEmail: res.general?.contactEmail ?? '',
          address1: res.general?.address1 ?? '',
          address2: res.general?.address2 ?? '',
          city: res.general?.city ?? '',
          state: res.general?.state ?? '',
          postal: res.general?.postal ?? ''
        });

        this.financeForm.patchValue({
          baseCurrency: res.financeTax?.baseCurrency ?? 'SGD',
          country: res.financeTax?.country ?? 'Singapore',
          taxMode: res.financeTax?.taxMode ?? 'Exclusive',
          gstNo: res.financeTax?.gstNo ?? '',
          filingFrequency: res.financeTax?.filingFrequency ?? 'Monthly',
          defaultOutputTaxCode: res.financeTax?.defaultOutputTaxCode ?? '',
          defaultInputTaxCode: res.financeTax?.defaultInputTaxCode ?? '',
          decimalPlaces: res.financeTax?.decimalPlaces ?? 2,
          roundingRule: res.financeTax?.roundingRule ?? 'Round half up'
        });

        this.defaultsForm.patchValue({
          defaultBranch: res.defaults?.defaultBranch ?? 'Head Office',
          defaultWarehouse: res.defaults?.defaultWarehouse ?? 'Main Warehouse',
          defaultBin: res.defaults?.defaultBin ?? 'MAIN',
          defaultLanguage: res.defaults?.defaultLanguage ?? 'EN',
          timeZone: res.defaults?.timeZone ?? 'Asia/Kolkata'
        });

        this.integrationForm.patchValue({
          whatsapp: res.integrations?.whatsapp ?? true,
          smtp: res.integrations?.smtp ?? true,
          ocr: res.integrations?.ocr ?? false,
          apiEndpoint: res.integrations?.apiEndpoint ?? '',
          apiKey: res.integrations?.apiKey ?? ''
        });

        this.adminUserForm.patchValue({
          username: res.initialAdminUser?.username ?? 'admin',
          email: res.initialAdminUser?.email ?? '',
          password: '',
          departmentId: res.initialAdminUser?.departmentId ?? 1,
          locationId: res.initialAdminUser?.locationId ?? 1
        });

        this.numberSeries = res.numberSeries?.length
          ? res.numberSeries.map(x => ({
              document: x.document ?? '',
              prefix: x.prefix ?? '',
              nextNo: Number(x.nextNo ?? 1),
              reset: !!x.reset
            }))
          : [];

        this.logoPreview = res.logoBase64 ?? null;
        this.lastUpdatedBy = res.lastUpdatedBy || '—';
        this.lastUpdatedAt = res.lastUpdatedAt || '—';
        this.auditTrail = res.auditTrail || [];

        this.selectedOrganizationId = Number(res.organizationId || 0);
        this.selectedOrgGuid = res.orgGuid || '';
        this.isNewOrganization = false;

        this.setPasswordState();
      },
      error: (err) => {
        this.loading = false;
        this.errorMsg = err?.error?.message || 'Failed to load company details';
      }
    });
  }

  isInvalid(form: FormGroup, controlName: string): boolean {
    const control = form.get(controlName);
    return !!control && control.invalid && (control.dirty || control.touched);
  }

  setTab(tab: CompanyTab): void {
    this.activeTab = tab;
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  isFirstTab(): boolean {
    return this.tabsOrder.indexOf(this.activeTab) === 0;
  }

  isLastTab(): boolean {
    return this.tabsOrder.indexOf(this.activeTab) === this.tabsOrder.length - 1;
  }

  goPrev(): void {
    const idx = this.tabsOrder.indexOf(this.activeTab);
    if (idx > 0) {
      this.setTab(this.tabsOrder[idx - 1]);
    }
  }

  goNext(): void {
    const idx = this.tabsOrder.indexOf(this.activeTab);
    if (idx < this.tabsOrder.length - 1) {
      this.setTab(this.tabsOrder[idx + 1]);
    }
  }

  onLogoPicked(evt: Event): void {
    const input = evt.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) {
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      this.logoPreview = String(reader.result || '');
    };
    reader.readAsDataURL(file);
  }

  removeLogo(): void {
    this.logoPreview = null;
  }

  addNumberRow(): void {
    this.numberSeries.push({
      document: '',
      prefix: '',
      nextNo: 1,
      reset: false
    });
  }

  removeNumberRow(i: number): void {
    this.numberSeries.splice(i, 1);
  }

  togglePassword(): void {
    this.showPassword = !this.showPassword;
  }

  setPasswordState(): void {
    const ctrl = this.adminUserForm.get('password');
    if (!ctrl) {
      return;
    }

    if (this.isEdit) {
      ctrl.setValidators([]);
    } else {
      ctrl.setValidators([Validators.required, Validators.minLength(6)]);
    }

    ctrl.updateValueAndValidity({ emitEvent: false });
  }

  private validateBeforeSave(): boolean {
    this.successMsg = '';
    this.errorMsg = '';

    if (!this.isEdit && !this.isNewOrganization && this.selectedOrganizationId <= 0) {
      this.errorMsg = 'Please select an organization.';
      this.setTab('general');
      return false;
    }

    if (this.generalForm.invalid) {
      this.generalForm.markAllAsTouched();
      this.setTab('general');
      return false;
    }

    if (this.financeForm.invalid) {
      this.financeForm.markAllAsTouched();
      this.setTab('financeTax');
      return false;
    }

    if (this.defaultsForm.invalid) {
      this.defaultsForm.markAllAsTouched();
      this.setTab('defaults');
      return false;
    }

    if (this.adminUserForm.invalid) {
      this.adminUserForm.markAllAsTouched();
      this.setTab('adminUser');
      return false;
    }

    const emptyDoc = this.numberSeries.find(x => !x.document || !x.document.trim());
    if (emptyDoc) {
      this.errorMsg = 'Number Series document name is required for all rows.';
      this.setTab('numberSeries');
      return false;
    }

    return true;
  }

  save(): void {
    if (!this.validateBeforeSave()) {
      return;
    }

    const adminRaw = this.adminUserForm.getRawValue();

    const payload: CreateCompanySetupPayload = {
      isNewOrganization: this.isEdit ? false : this.isNewOrganization,
      organizationId: this.isEdit ? this.selectedOrganizationId || null : (this.isNewOrganization ? null : this.selectedOrganizationId),
      orgGuid: this.isEdit ? (this.selectedOrgGuid || null) : (this.isNewOrganization ? null : this.selectedOrgGuid),

      general: {
        ...this.generalForm.getRawValue(),
        createdBy: this.getCurrentUserId()
      },
      financeTax: {
        ...this.financeForm.getRawValue()
      },
      defaults: {
        ...this.defaultsForm.getRawValue()
      },
      numberSeries: this.numberSeries.map(x => ({
        document: (x.document || '').trim(),
        prefix: (x.prefix || '').trim(),
        nextNo: Number(x.nextNo || 1),
        reset: !!x.reset
      })),
      integrations: {
        ...this.integrationForm.getRawValue()
      },
      initialAdminUser: {
        ...adminRaw,
        password: this.isEdit && !adminRaw.password ? null : adminRaw.password
      },
      logoBase64: this.logoPreview
    };

    this.saving = true;

    let req$: Observable<any>;

    if (this.isEdit) {
      req$ = this.companyService.updateCompany(this.companyId, payload);
    } else if (this.isNewOrganization) {
      req$ = this.companyService.createCompany(payload);
    } else {
      req$ = this.companyService.createCompanyUnderOrganization(payload);
    }

    req$.subscribe({
      next: (res: any) => {
        this.saving = false;

        const successText =
          res?.message ||
          (this.isEdit ? 'Company updated successfully' : 'Company created successfully');

        const currentUser = localStorage.getItem('id') || '1';

        this.lastUpdatedBy = currentUser;
        this.lastUpdatedAt = new Date().toLocaleString();

        this.auditTrail.unshift({
          date: new Date().toLocaleString(),
          user: currentUser,
          change: this.isEdit
            ? 'Company updated'
            : this.isNewOrganization
            ? `Organization + Company created${res?.companyId ? ' (CompanyId: ' + res.companyId + ')' : ''}`
            : `Company created under existing organization${res?.companyId ? ' (CompanyId: ' + res.companyId + ')' : ''}`
        });

        this.setTab('audit');

        Swal.fire({
          icon: 'success',
          title: this.isEdit ? 'Updated' : 'Created',
          text: successText,
          confirmButtonText: 'OK',
          confirmButtonColor: '#2E5F73'
        }).then(() => {
          this.router.navigate(['/master/companyList']);
        });
      },
      error: (err) => {
        this.saving = false;
        this.errorMsg = err?.error?.message || 'Failed to save company';

        Swal.fire({
          icon: 'error',
          title: 'Error',
          text: this.errorMsg,
          confirmButtonColor: '#d33'
        });
      }
    });
  }

  cancel(): void {
    this.router.navigate(['/master/companyList']);
  }
}