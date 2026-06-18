import { Component, OnInit, ViewEncapsulation } from '@angular/core';
import { Router } from '@angular/router';
import { CustomerMasterService } from '../customer-master.service';
import Swal from 'sweetalert2';
import { FunctionPermission, PermissionService } from 'app/shared/permission.service';

@Component({
  selector: 'app-customer-master-list',
  templateUrl: './customer-master-list.component.html',
  styleUrls: ['./customer-master-list.component.scss'],
  encapsulation:ViewEncapsulation.None,
})
export class CustomerMasterListComponent implements OnInit {
 selectedOption = 10;
  currentPage = 1;
  searchValue = '';
  CustomerMasterList: any[] = [];
  CustomerMasterListFiltered: any[] = [];

  get totalPages(): number {
    if (this.selectedOption >= 999999) return 1;
    return Math.max(1, Math.ceil(this.CustomerMasterListFiltered.length / this.selectedOption));
  }

  get pageNumbers(): number[] {
    const total = this.totalPages;
    const current = this.currentPage;
    const start = Math.max(1, current - 2);
    const end = Math.min(total, current + 2);
    const pages: number[] = [];
    for (let i = start; i <= end; i++) pages.push(i);
    return pages;
  }

  onPageChange(page: number): void { this.currentPage = page; }
  onPageSizeChange(): void { this.currentPage = 1; }
  
  userId: number = 0;
  functionId = 'bp-customer';

  permission: FunctionPermission;
  isPermissionLoaded = false;
  isPageLoading = false;
  public isDisplay = false;
  
  constructor(
    private _customerMasterService : CustomerMasterService,
    private router: Router,private permissionService: PermissionService

  ) {this.userId = Number(localStorage.getItem('id') || 0);
    this.permission = this.permissionService.getEmptyPermission(this.functionId); }

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
          this.loadCustomerMasterDetails(); 
        } else {
          this.CustomerMasterList = [];
          this.isDisplay = false;
        }
      },
      error: (err) => {
        console.error('Permission load error:', err);
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

  filterUpdate(evt?: any) {
  this.currentPage = 1;
  const val = (this.searchValue || '').toString().toLowerCase().trim();

  if (!val) {
    this.CustomerMasterListFiltered = [...this.CustomerMasterList];
    return;
  }

  this.CustomerMasterListFiltered = this.CustomerMasterList.filter((r: any) => {
    return [
      r?.customerName,
      r?.contactNumber?.toString(),
      r?.pointOfContactPerson,
      r?.email,
      r?.paymentTermsName,
      r?.customerGroupName,
      r?.countryName,
      r?.locationName,
      r?.creditAmount?.toString(),
      r?.isApproved ? 'approved' : 'not approved'
    ]
    .filter(Boolean)
    .some((field: string) => field.toString().toLowerCase().includes(val));
  });
}

loadCustomerMasterDetails() {
  this._customerMasterService.GetAllCustomerDetails().subscribe((res: any) => {
    if (res?.isSuccess && Array.isArray(res.data)) {
      this.CustomerMasterList = res.data;
      this.CustomerMasterListFiltered = [...this.CustomerMasterList]; // initial
    } else {
      this.CustomerMasterList = [];
      this.CustomerMasterListFiltered = [];
    }
  });
}
onEdit(row: any) {
  const id = row.id || row.customerId;
  if (!id) return;
  this.router.navigate(['/Businesspartners/customermaster/edit', id]);
}

 Add() {
  this.router.navigate(['/Businesspartners/customermaster/create']);
}
deleteCustomer(row: any) {
  const customerId = row?.id ?? row?.customerId;
  const kycId = row?.kycId ?? null;
  if (!customerId) return;

  Swal.fire({
    title: 'Are you sure?',
    text: 'This will deactivate the customer (and KYC if available).',
    icon: 'warning',
    showCancelButton: true,
    confirmButtonColor: '#7367F0',
    cancelButtonColor: '#E42728',
    confirmButtonText: 'Yes, Deactivate',
    customClass: { confirmButton: 'btn btn-primary', cancelButton: 'btn btn-danger ml-1' },
    allowOutsideClick: false,
  }).then((result: any) => {
    if (result.isConfirmed) {
      this._customerMasterService
        .deleteCustomer(customerId, kycId)   // ← only two params now
        .subscribe({
          next: (res: any) => {
            Swal.fire({
              icon: res?.isSuccess ? 'success' : 'error',
              title: res?.isSuccess ? 'Deactivated!' : 'Error!',
              text: res?.message ?? 'Operation completed.',
              allowOutsideClick: false,
            });
            this.loadCustomerMasterDetails();
          },
          error: () => {
            Swal.fire({ icon: 'error', title: 'Error!', text: 'Something went wrong.' });
          },
        });
    }
  });
}

}
