import { Component, OnInit, ViewEncapsulation } from '@angular/core';
import { Router } from '@angular/router';
import { BankService } from '../bank-service/bank.service';
import Swal from 'sweetalert2';

@Component({
  selector: 'app-list-bank',
  templateUrl: './list-bank.component.html',
  styleUrls: ['./list-bank.component.scss'],
  encapsulation: ViewEncapsulation.None
})
export class ListBankComponent implements OnInit {

  // full list from API
  bankList: any[] = [];
  // filtered list for table
  bankListFiltered: any[] = [];

  selectedOption = 10;
  searchValue = '';

  // simple map for account type id -> name
  accountTypeMap: { [key: number]: string } = {
    1: 'Checking',
    2: 'Savings',
    3: 'Current',
    4: 'Other'
  };

  constructor(
    private _bankService: BankService,
    private router: Router
  ) { }

  ngOnInit(): void {
    this.loadBank();
  }

  // ---------- LOAD DATA ----------
  loadBank(): void {
    this._bankService.getAllBank().subscribe((res: any) => {
      this.bankList = res?.data || [];
      this.bankListFiltered = [...this.bankList];
    });
  }

  // ---------- SEARCH / FILTER ----------
  filterUpdate(event?: any): void {
    const term = (this.searchValue || '').toLowerCase().trim();

    if (!term) {
      this.bankListFiltered = [...this.bankList];
      return;
    }

    this.bankListFiltered = this.bankList.filter(b => {
      return (
        (b.bankName || '').toLowerCase().includes(term) ||
        (b.accountHolderName || '').toLowerCase().includes(term) ||
        String(b.accountNo || '').toLowerCase().includes(term) ||
        (b.branch || '').toLowerCase().includes(term) ||
        (b.email || '').toLowerCase().includes(term) ||
        (b.contactNo || '').toLowerCase().includes(term)
      );
    });
  }

  // ---------- UI HELPERS ----------
  getAccountTypeName(typeId: number | null | undefined): string {
    if (!typeId) { return '—'; }
    return this.accountTypeMap[typeId] || typeId.toString();
  }

  // ---------- ACTIONS ----------
  Add(): void {
    this.router.navigate(['/master/bank']);
  }

  onEdit(row: any): void {
    this.router.navigate(['/master/bank/edit', row.id]);
  }

  // ---------- DELETE WITH CONFIRM ----------
  confirmDeleteBank(row: any): void {
    Swal.fire({
      title: 'Confirm Delete',
      text: `Are you sure you want to delete bank "${row.bankName}"?`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Delete',
      cancelButtonText: 'Cancel',
      confirmButtonColor: '#d33',
      cancelButtonColor: '#3085d6'
    }).then((result) => {
      if (result.isConfirmed) {
        this.deleteBank(row);
      }
    });
  }

  deleteBank(row: any): void {
    this._bankService.deleteBank(row.id).subscribe({
      next: (res: any) => {
        Swal.fire({
          icon: 'success',
          title: 'Deleted!',
          text: res?.message || 'Bank deleted successfully',
          confirmButtonColor: '#3085d6'
        });
        this.loadBank();   // refresh list
      },
      error: (err) => {
        console.error('Error deleting bank', err);
        Swal.fire({
          icon: 'error',
          title: 'Error',
          text: 'Failed to delete bank',
          confirmButtonColor: '#d33'
        });
      }
    });
  }
}
