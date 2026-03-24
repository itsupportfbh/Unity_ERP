import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { CurrencyService } from '../../currency/currency.service';
import { CountriesService } from '../../countries/countries.service';
import { BankService } from '../bank-service/bank.service';
import Swal from 'sweetalert2';
import { ChartofaccountService } from 'app/main/financial/chartofaccount/chartofaccount.service';
import { FunctionPermission, PermissionService } from 'app/shared/permission.service';

@Component({
  selector: 'app-bank',
  templateUrl: './bank.component.html',
  styleUrls: ['./bank.component.scss']
})
export class BankComponent implements OnInit {
  bank: any = {
    bankName: '',
    accountName: '',
    accountNumber: '',
    accountTypeId: null,
    branch: '',
    ifscSwift: '',
    routingNumber: '',
    currencyId: null,
    countryId: null,
    primaryContact: '',
    contactEmail: '',
    contactPhone: '',
    address: '',
    budgetLineId: null
  };

  accountTypes: any[] = [
    { id: 1, name: 'Checking' },
    { id: 2, name: 'Savings' },
    { id: 3, name: 'Current' },
    { id: 4, name: 'Other' }
  ];

  currencies: any[] = [];
  countries: any[] = [];
  parentHeadList: Array<{ value: number; label: string }> = [];

  isSaving = false;
  isEdit = false;
  bankId: number | null = null;
  userId: number = 0;

  permission: FunctionPermission;
  isPermissionLoaded = false;
  functionId = 'bank';

  constructor(
    private _currencyService: CurrencyService,
    private _countryService: CountriesService,
    private _bankService: BankService,
    private route: ActivatedRoute,
    private router: Router,
    private coaService: ChartofaccountService,
    private permissionService: PermissionService
  ) {
    this.userId = Number(localStorage.getItem('id') || 0);
    this.permission = this.permissionService.getEmptyPermission(this.functionId);
  }

  ngOnInit(): void {
    const idParam = this.route.snapshot.paramMap.get('id');

    if (idParam) {
      this.bankId = Number(idParam);
      this.isEdit = true;
    }

    this.loadPermission();
  }

  // =========================
  // PERMISSION
  // =========================
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

    this.permissionService.getFunctionPermission(this.userId, this.functionId).subscribe({
      next: (res: FunctionPermission) => {
        this.permission = res || this.permissionService.getEmptyPermission(this.functionId);
        this.isPermissionLoaded = true;

        if (this.canView()) {
          this.loadInitialData();
        }
      },
      error: (err) => {
        console.error('Permission load error:', err);
        this.permission = this.permissionService.getEmptyPermission(this.functionId);
        this.isPermissionLoaded = true;

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

  canShowSaveButton(): boolean {
    return this.isEdit ? this.canEdit() : this.canCreate();
  }

  // =========================
  // INITIAL LOAD
  // =========================
  loadInitialData(): void {
    this.loadAccountHeads();
    this.loadCurrency();
    this.loadCountry();

    if (this.isEdit && this.bankId) {
      this.loadBankById(this.bankId);
    }
  }

  // =========================
  // LOAD MASTER DATA
  // =========================
  loadCurrency(): void {
    this._currencyService.getAllCurrency().subscribe({
      next: (res: any) => {
        this.currencies = res?.data || [];
      },
      error: (err) => {
        console.error('Currency load error:', err);
        this.currencies = [];
      }
    });
  }

  loadCountry(): void {
    this._countryService.getCountry().subscribe({
      next: (res: any) => {
        this.countries = res?.data || [];
      },
      error: (err) => {
        console.error('Country load error:', err);
        this.countries = [];
      }
    });
  }

  loadAccountHeads(): void {
    this.coaService.getAllChartOfAccount().subscribe({
      next: (res: any) => {
        const data = (res?.data || []).filter((x: any) => x.isActive === true);
        this.parentHeadList = data.map((head: any) => ({
          value: Number(head.id),
          label: this.buildFullPath(head, data)
        }));
      },
      error: (err) => {
        console.error('Chart of account load error:', err);
        this.parentHeadList = [];
      }
    });
  }

  private buildFullPath(item: any, all: any[]): string {
    let path = item.headName;
    let current = all.find((x: any) => x.headCode === item.parentHead);

    while (current) {
      path = `${current.headName} >> ${path}`;
      current = all.find((x: any) => x.headCode === current.parentHead);
    }

    return path;
  }

  // =========================
  // LOAD BANK BY ID
  // =========================
  loadBankById(id: number): void {
    this._bankService.getByIdBank(id).subscribe({
      next: (res: any) => {
        const d = res?.data;
        if (!d) return;

        this.bankId = d.id;

        this.bank = {
          bankName: d.bankName || '',
          accountName: d.accountHolderName || '',
          accountNumber: d.accountNo || '',
          accountTypeId: d.accountType || null,
          branch: d.branch || '',
          ifscSwift: d.ifsc || '',
          routingNumber: d.routing || '',
          currencyId: d.currencyId || null,
          countryId: d.countryId || null,
          primaryContact: d.primaryContact || '',
          contactEmail: d.email || '',
          contactPhone: d.contactNo || '',
          address: d.address || '',
          budgetLineId: d.budgetLineId ?? null
        };
      },
      error: (err) => {
        console.error('Load bank error:', err);
        Swal.fire({
          icon: 'error',
          title: 'Error',
          text: 'Unable to load bank details.',
          confirmButtonColor: '#d33'
        });
      }
    });
  }

  // =========================
  // RESET
  // =========================
  onReset(): void {
    this.bank = {
      bankName: '',
      accountName: '',
      accountNumber: '',
      accountTypeId: null,
      branch: '',
      ifscSwift: '',
      routingNumber: '',
      currencyId: null,
      countryId: null,
      primaryContact: '',
      contactEmail: '',
      contactPhone: '',
      address: '',
      budgetLineId: null
    };

    if (this.isEdit && this.bankId) {
      this.loadBankById(this.bankId);
    }
  }

  // =========================
  // SAVE / UPDATE
  // =========================
  onSave(): void {
    if (this.isEdit && !this.canEdit()) {
      Swal.fire({
        icon: 'warning',
        title: 'Access Denied',
        text: 'You do not have edit permission.',
        confirmButtonColor: '#0e3a4c'
      });
      return;
    }

    if (!this.isEdit && !this.canCreate()) {
      Swal.fire({
        icon: 'warning',
        title: 'Access Denied',
        text: 'You do not have create permission.',
        confirmButtonColor: '#0e3a4c'
      });
      return;
    }

    if (
      !this.bank.bankName ||
      !this.bank.accountName ||
      !this.bank.accountNumber ||
      !this.bank.accountTypeId ||
      !this.bank.currencyId ||
      !this.bank.countryId ||
      !this.bank.contactEmail ||
      !this.bank.budgetLineId
    ) {
      Swal.fire({
        icon: 'warning',
        title: 'Warning',
        text: 'Please fill all required fields',
        confirmButtonColor: '#0e3a4c'
      });
      return;
    }

    const payload: any = {
      bankName: this.bank.bankName,
      accountHolderName: this.bank.accountName,
      accountNo: this.bank.accountNumber,
      accountType: this.bank.accountTypeId,
      branch: this.bank.branch,
      ifsc: this.bank.ifscSwift,
      routing: this.bank.routingNumber,
      currencyId: this.bank.currencyId,
      countryId: this.bank.countryId,
      primaryContact: this.bank.primaryContact,
      email: this.bank.contactEmail,
      contactNo: this.bank.contactPhone,
      address: this.bank.address,
      budgetLineId: this.bank.budgetLineId,
      isActive: true,
      createdBy: this.userId,
      updatedBy: this.userId
    };

    this.isSaving = true;

    if (this.isEdit && this.bankId) {
      payload.id = this.bankId;

      this._bankService.updateBank(this.bankId, payload).subscribe({
        next: (res: any) => {
          this.isSaving = false;

          Swal.fire({
            icon: 'success',
            title: 'Success',
            text: res?.message || 'Bank updated successfully',
            confirmButtonColor: '#2E5F73'
          });

          this.router.navigate(['/master/bank-list']);
        },
        error: (err) => {
          this.isSaving = false;
          console.error('Error updating bank', err);

          Swal.fire({
            icon: 'error',
            title: 'Error',
            text: err?.error?.message || 'Error updating bank',
            confirmButtonColor: '#d33'
          });
        }
      });
    } else {
      this._bankService.createBank(payload).subscribe({
        next: (res: any) => {
          this.isSaving = false;

          Swal.fire({
            icon: 'success',
            title: 'Success',
            text: res?.message || 'Bank created successfully',
            confirmButtonColor: '#2E5F73'
          });

          this.onReset();
          this.router.navigate(['/master/bank-list']);
        },
        error: (err) => {
          this.isSaving = false;
          console.error('Error creating bank', err);

          Swal.fire({
            icon: 'error',
            title: 'Error',
            text: err?.error?.message || 'Error creating bank',
            confirmButtonColor: '#d33'
          });
        }
      });
    }
  }
}