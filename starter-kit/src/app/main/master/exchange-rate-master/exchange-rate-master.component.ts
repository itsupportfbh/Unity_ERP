import { Component, OnInit, AfterViewChecked } from '@angular/core';
import { NgForm } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import Swal from 'sweetalert2';
import * as feather from 'feather-icons';
import { environment } from 'environments/environment';

@Component({
  selector: 'app-exchange-rate-master',
  templateUrl: './exchange-rate-master.component.html',
  styleUrls: ['./exchange-rate-master.component.scss']
})
export class ExchangeRateMasterComponent implements OnInit, AfterViewChecked {

  apiUrl = environment.apiUrl;

  rateList: any[] = [];
  currencyList: any[] = [];

  isDisplay = false;
  isEditMode = false;
  selectedRate: any = null;

  // Form fields
  fromCurrencyId: number | null = null;
  toCurrencyId: number | null = null;
  rate: number | null = null;
  rateDate: string = this.today();
  isActive: boolean = true;

  userId = Number(localStorage.getItem('id') || 0);
  companyId = Number(localStorage.getItem('companyId') || 0);

  constructor(private http: HttpClient) {}

  ngOnInit(): void {
    this.loadCurrencies();
    this.loadRates();
  }

  ngAfterViewChecked(): void {
    feather.replace();
  }

  today(): string {
    return new Date().toISOString().substring(0, 10);
  }

  get modeHeader(): string {
    return this.isEditMode ? 'Edit Exchange Rate' : 'Add Exchange Rate';
  }

  loadCurrencies(): void {
    this.http.get<any>(`${this.apiUrl}/Currency/GetCurrencies`).subscribe({
      next: (res) => {
        const list = res?.data || res || [];
        this.currencyList = list.filter((x: any) => x.isActive !== false);
      }
    });
  }

  loadRates(): void {
    this.http.get<any>(`${this.apiUrl}/ExchangeRate/GetAll`, {
      params: { companyId: this.companyId }
    }).subscribe({
      next: (res) => {
        this.rateList = res?.data || res || [];
        setTimeout(() => feather.replace(), 0);
      }
    });
  }

  createRate(): void {
    this.isDisplay = true;
    this.isEditMode = false;
    this.selectedRate = null;
    this.reset();
  }

  editRate(item: any): void {
    this.isDisplay = true;
    this.isEditMode = true;
    this.selectedRate = item;
    this.fromCurrencyId = item.fromCurrencyId;
    this.toCurrencyId   = item.toCurrencyId;
    this.rate           = item.rate;
    this.rateDate       = item.rateDate?.substring(0, 10) || this.today();
    this.isActive       = item.isActive;
  }

  cancel(): void {
    this.isDisplay = false;
    this.isEditMode = false;
  }

  reset(): void {
    this.fromCurrencyId = null;
    this.toCurrencyId   = null;
    this.rate           = null;
    this.rateDate       = this.today();
    this.isActive       = true;
  }

  onSubmit(form: NgForm): void {
    if (!form.valid) {
      Swal.fire({ icon: 'warning', title: 'Warning',
        text: 'Please fill all required fields',
        confirmButtonColor: '#0e3a4c' });
      return;
    }

    if (this.fromCurrencyId === this.toCurrencyId) {
      Swal.fire({ icon: 'warning', title: 'Warning',
        text: 'From and To currency cannot be the same',
        confirmButtonColor: '#0e3a4c' });
      return;
    }

    const payload: any = {
      fromCurrencyId: this.fromCurrencyId,
      toCurrencyId:   this.toCurrencyId,
      rate:           Number(this.rate),
      rateDate:       this.rateDate,
      isActive:       this.isActive,
      companyId:      this.companyId,
      createdBy:      this.userId,
      updatedBy:      this.userId
    };

    const handleResponse = (res: any, successMsg: string) => {
      if (res?.isSuccess === false) {
        Swal.fire({ icon: 'error', title: 'Error',
          text: res?.message || 'Operation failed',
          confirmButtonColor: '#d33' });
        return;
      }
      Swal.fire({ icon: 'success', title: 'Success!',
        text: res?.message || successMsg,
        confirmButtonColor: '#0e3a4c' });
      this.loadRates();
      this.cancel();
    };

    if (this.isEditMode) {
      payload.id = this.selectedRate.id;
      this.http.put<any>(`${this.apiUrl}/ExchangeRate/Update/${payload.id}`, payload)
        .subscribe({
          next: (res) => handleResponse(res, 'Exchange rate updated successfully'),
          error: (err) => Swal.fire({ icon: 'error', title: 'Error',
            text: err?.error?.message || 'Update failed',
            confirmButtonColor: '#d33' })
        });
    } else {
      this.http.post<any>(`${this.apiUrl}/ExchangeRate/Create`, payload)
        .subscribe({
          next: (res) => handleResponse(res, 'Exchange rate created successfully'),
          error: (err) => Swal.fire({ icon: 'error', title: 'Error',
            text: err?.error?.message || 'Create failed',
            confirmButtonColor: '#d33' })
        });
    }
  }

  confirmDelete(item: any): void {
    Swal.fire({
      title: 'Confirm Delete',
      text: `Delete rate: ${item.fromCurrencyName} → ${item.toCurrencyName}?`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Delete',
      cancelButtonText: 'Cancel',
      confirmButtonColor: '#d33',
      cancelButtonColor: '#3085d6'
    }).then((result) => {
      if (!result.isConfirmed) return;

      this.http.delete<any>(`${this.apiUrl}/ExchangeRate/Delete/${item.id}`).subscribe({
        next: (res) => {
          if (res?.isSuccess === false) {
            Swal.fire({ icon: 'error', title: 'Error',
              text: res?.message || 'Delete failed',
              confirmButtonColor: '#d33' });
            return;
          }
          Swal.fire({ icon: 'success', title: 'Deleted!',
            text: 'Exchange rate deleted successfully',
            confirmButtonColor: '#3085d6' });
          this.loadRates();
        },
        error: () => Swal.fire({ icon: 'error', title: 'Error',
          text: 'Failed to delete', confirmButtonColor: '#d33' })
      });
    });
  }
}