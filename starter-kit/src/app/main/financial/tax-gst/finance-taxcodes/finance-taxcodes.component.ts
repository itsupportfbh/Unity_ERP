import { Component, OnInit } from '@angular/core';
import { TaxCodeService } from 'app/main/master/taxcode/taxcode.service';
import { FunctionPermission, PermissionService } from 'app/shared/permission.service';
import Swal from 'sweetalert2';

@Component({
  selector: 'app-finance-taxcodes',
  templateUrl: './finance-taxcodes.component.html',
  styleUrls: ['./finance-taxcodes.component.scss']
})
export class FinanceTaxcodesComponent implements OnInit {
  rows: any[] = [];

  taxTypes: { id: number; name: string }[] = [
    { id: 1, name: 'Input' },
    { id: 2, name: 'Output' }
  ];

  levelMap: { id: number; name: string }[] = [
    { id: 1, name: 'Line' },
    { id: 2, name: 'Invoice' },
    { id: 3, name: 'Line / Invoice' }
  ];

  taxTypeOptions = [
    { id: 1, label: 'Input GST' },
    { id: 2, label: 'Output GST' }
  ];

  isTaxModalOpen = false;

  newTax: {
    name: string;
    description: string;
    typeId: number | null;
    rate: number | null;
    levelId: number | null;
  } = {
    name: '',
    description: '',
    typeId: null,
    rate: null,
    levelId: 1
  };

  userId: number = 0;

  // DB/Menu function code exact ah match aaganum
  functionId = 'tax';

  permission: FunctionPermission;
  isPermissionLoaded = false;
  isPageLoading = false;

  constructor(
    private taxCodeService: TaxCodeService,
    private permissionService: PermissionService
  ) {
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
        confirmButtonColor: '#2E5F73'
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
          this.loadTaxCodes();
        } else {
          this.rows = [];
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
          confirmButtonColor: '#2E5F73'
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

  loadTaxCodes(): void {
    this.taxCodeService.getTaxCode().subscribe({
      next: (res: any) => {
        this.rows = res?.data || [];
      },
      error: () => {
        this.rows = [];

        Swal.fire({
          icon: 'error',
          title: 'Error',
          text: 'Failed to load tax codes.',
          confirmButtonColor: '#2E5F73'
        });
      }
    });
  }

  getTypeName(typeId: number): string {
    const found = this.taxTypes.find(t => +t.id === +typeId);
    return found ? found.name : '-';
  }

  getLevelName(level: number | string): string {
    if (typeof level === 'string') {
      return level;
    }

    const found = this.levelMap.find(l => +l.id === +level);
    return found ? found.name : '-';
  }

  openNewTaxModal(): void {
    if (!this.canCreate()) {
      Swal.fire({
        icon: 'warning',
        title: 'Access Denied',
        text: 'You do not have create permission.',
        confirmButtonColor: '#2E5F73'
      });
      return;
    }

    this.newTax = {
      name: '',
      description: '',
      typeId: null,
      rate: null,
      levelId: 1
    };

    this.isTaxModalOpen = true;
  }

  closeNewTaxModal(): void {
    this.isTaxModalOpen = false;
  }

  saveTaxCode(): void {
    if (!this.canCreate()) {
      Swal.fire({
        icon: 'warning',
        title: 'Access Denied',
        text: 'You do not have create permission.',
        confirmButtonColor: '#2E5F73'
      });
      return;
    }

    if (!this.newTax.name || !this.newTax.typeId || this.newTax.rate == null) {
      Swal.fire({
        icon: 'warning',
        title: 'Missing details',
        text: 'Name, Type and Rate are required.',
        confirmButtonColor: '#2E5F73'
      });
      return;
    }

    const payload: any = {
      name: this.newTax.name,
      description: this.newTax.description,
      typeId: this.newTax.typeId,
      rate: this.newTax.rate,
      level: this.newTax.levelId,
      createdBy: this.userId,
      createdDate: new Date(),
      updatedBy: this.userId,
      updatedDate: new Date(),
      isActive: true
    };

    this.taxCodeService.insertTaxCode(payload).subscribe({
      next: () => {
        this.isTaxModalOpen = false;
        this.loadTaxCodes();

        Swal.fire({
          icon: 'success',
          title: 'Saved',
          text: 'Tax code saved successfully.',
          timer: 1500,
          showConfirmButton: false
        });
      },
      error: err => {
        Swal.fire({
          icon: 'error',
          title: 'Error',
          text: err?.error?.message || err?.message || 'Failed to save tax code.',
          confirmButtonColor: '#2E5F73'
        });
      }
    });
  }
}
