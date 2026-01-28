import { Component, OnInit, ViewEncapsulation } from '@angular/core';
import { Router } from '@angular/router';
import { CustomerMasterService } from '../customer-master.service';
import Swal from 'sweetalert2';

@Component({
  selector: 'app-customer-master-list',
  templateUrl: './customer-master-list.component.html',
  styleUrls: ['./customer-master-list.component.scss'],
  encapsulation:ViewEncapsulation.None,
})
export class CustomerMasterListComponent implements OnInit {
 selectedOption = 10;
searchValue = '';
CustomerMasterList: any[] = [];
CustomerMasterListFiltered: any[] = [];
  constructor(
    private _customerMasterService : CustomerMasterService,
    private router: Router

  ) { }

  ngOnInit(): void {
    this.loadCustomerMasterDetails();
  }

   filterUpdate(evt?: any) {
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
