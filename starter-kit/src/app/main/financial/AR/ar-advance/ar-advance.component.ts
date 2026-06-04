import { Component, OnInit } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from 'environments/environment';
import Swal from 'sweetalert2';

import { ArInvoiceService } from '../Invoice/invoice-service';
import { CustomerMasterService } from 'app/main/businessPartners/customer-master/customer-master.service';
import { SalesOrderService } from 'app/main/sales/sales-order/sales-order.service';
import { AccountsPayableService } from '../../accounts-payable/accounts-payable.service';
import { Router } from '@angular/router';
import { PeriodCloseService } from '../../period-close-fx/period-close-fx.service';

@Component({
  selector: 'app-ar-advance',
  templateUrl: './ar-advance.component.html',
  styleUrls: ['./ar-advance.component.scss']
})
export class ArAdvanceComponent implements OnInit {

  isPeriodLocked = false;
  periodName     = '';

  customers:    any[] = [];
  orders:       any[] = [];
  openAdvances: any[] = [];
  bankAccounts: any[] = [];

  isOrderSpecific = false;
  saving          = false;
  loadingOrders   = false;

  // ✅ FxRate properties
  fxRate:           number  = 1;
  amountBase:       number  = 0;
  currencyId:       number  = 0;
  currencyName:     string  = '';
  baseCurrencyId:   number  = 0;
  baseCurrencyName: string  = 'SGD';
  fxRateLoading:    boolean = false;

  private apiUrl = environment.apiUrl;

  model: any = {
    customerId:    null,
    salesOrderId:  null,
    advanceDate:   new Date().toISOString().slice(0, 10),
    amount:        null,
    bankAccountId: null,
    paymentMode:   'Bank',
    remarks:       ''
  };

  constructor(
    private arService:       ArInvoiceService,
    private customerService: CustomerMasterService,
    private salesOrderService: SalesOrderService,
    private apSvc:           AccountsPayableService,
    private router:          Router,
    private periodLock:      PeriodCloseService,
    private http:            HttpClient
  ) {}

  ngOnInit(): void {
    // ✅ Base currency
    this.baseCurrencyId   = Number(localStorage.getItem('companyCurrencyId') || 0);
    this.baseCurrencyName = 'SGD';

    this.loadCustomers();
    this.loadBankAccounts();
    this.checkPeriodLockForToday();
  }

  // ✅ Foreign currency check
  isForeignCurrency(): boolean {
    return !!(
      this.currencyId &&
      this.currencyId !== this.baseCurrencyId &&
      this.currencyName &&
      this.currencyName !== this.baseCurrencyName
    );
  }

  // ✅ Base SGD calculate
  calcAmountBase(): void {
    const fx  = Number(this.fxRate  || 1);
    const amt = Number(this.model.amount || 0);
    this.amountBase = +(amt * fx).toFixed(2);
  }

  // ✅ Fetch FxRate from API
  fetchFxRate(fromCurrencyId: number): void {
    if (!fromCurrencyId || !this.baseCurrencyId) return;
    this.fxRateLoading = true;
    const today = new Date().toISOString().substring(0, 10);

    this.http.get<any>(`${this.apiUrl}/ExchangeRate/GetRate`, {
      params: {
        fromCurrencyId: fromCurrencyId.toString(),
        toCurrencyId:   this.baseCurrencyId.toString(),
        rateDate:       today
      }
    }).subscribe({
      next: (res: any) => {
        this.fxRateLoading = false;
        if (res?.isSuccess && res?.data?.rate) {
          this.fxRate = Number(res.data.rate);
        } else {
          this.fxRate = 1;
        }
        this.calcAmountBase();
      },
      error: () => {
        this.fxRateLoading = false;
        this.fxRate = 1;
      }
    });
  }

  // ✅ SO select → FxRate inherit
  onSalesOrderChange(): void {
    this.loadOpenAdvances();

    if (!this.model.salesOrderId) {
      this.fxRate       = 1;
      this.currencyId   = 0;
      this.currencyName = '';
      this.amountBase   = 0;
      return;
    }

    // SO-ல் இருந்து FxRate fetch
    const so = this.orders.find(
      (o: any) => o.id === this.model.salesOrderId
    );

    if (so) {
      this.fxRate       = Number(so.fxRate       ?? so.FxRate       ?? 1);
      this.currencyId   = Number(so.currencyId   ?? so.CurrencyId   ?? 0);
      this.currencyName = so.currencyName         ?? so.CurrencyName  ?? '';

      if (this.isForeignCurrency()) {
        // ✅ Already have rate from SO → use it
        // If rate = 1 (not set), fetch from API
        if (this.fxRate === 1 && this.currencyId !== this.baseCurrencyId) {
          this.fetchFxRate(this.currencyId);
        } else {
          this.calcAmountBase();
        }
      }
    }
  }

  // ==================== LOADERS ====================

  private checkPeriodLockForToday(): void {
    const today = new Date().toISOString().substring(0, 10);
    this.periodLock.getStatusForDateWithName(today).subscribe({
      next: status => {
        this.isPeriodLocked = !!status?.isLocked;
        this.periodName     = status?.periodName || '';
      },
      error: () => {
        this.isPeriodLocked = false;
        this.periodName     = '';
      }
    });
  }

  loadCustomers(): void {
    this.customerService.getAllCustomerMaster().subscribe((res: any) => {
      this.customers = res?.data || [];
    });
  }

  loadBankAccounts(): void {
    this.apSvc.getBankAccounts().subscribe({
      next: (res: any) => {
        this.bankAccounts = res?.data || res || [];
      },
      error: () => Swal.fire('Error', 'Failed to load bank accounts', 'error')
    });
  }

  // ==================== CUSTOMER / ORDER ====================

  onCustomerChange(): void {
    this.model.salesOrderId = null;
    this.orders             = [];
    this.openAdvances       = [];

    // ✅ reset FxRate
    this.fxRate       = 1;
    this.currencyId   = 0;
    this.currencyName = '';
    this.amountBase   = 0;

    if (!this.model.customerId) return;
    if (this.isOrderSpecific) this.loadOrdersForCustomer();
    this.loadOpenAdvances();
  }

  onToggleOrderSpecific(event?: any): void {
    this.isOrderSpecific = event?.target?.checked === true;
    this.model.salesOrderId = null;
    this.orders             = [];

    // ✅ reset FxRate when toggle
    this.fxRate       = 1;
    this.currencyId   = 0;
    this.currencyName = '';
    this.amountBase   = 0;

    if (this.isOrderSpecific && this.model.customerId) {
      this.loadOrdersForCustomer();
    }
  }

  loadOrdersForCustomer(): void {
    if (!this.model.customerId) return;
    this.loadingOrders = true;

    this.salesOrderService.getOpenByCustomer(this.model.customerId).subscribe({
      next: (res: any) => {
        this.orders        = res?.data || [];
        this.loadingOrders = false;
      },
      error: () => {
        this.orders        = [];
        this.loadingOrders = false;
      }
    });
  }

  // ==================== ADVANCES ====================

  loadOpenAdvances(): void {
    if (!this.model.customerId) return;
    this.arService.getOpenAdvances(
      this.model.customerId,
      this.isOrderSpecific ? this.model.salesOrderId : null
    ).subscribe({
      next: res  => this.openAdvances = res || [],
      error: _   => this.openAdvances = []
    });
  }

  onBankChange(): void {
    const bank = this.bankAccounts.find(b => b.id === this.model.bankAccountId);
    if (bank) console.log('Bank:', bank.headName);
  }

  onPaymentModeChange(): void {
    if (this.model.paymentMode !== 'Bank') {
      this.model.bankAccountId = null;
    }
  }

  // ==================== SAVE ====================

  saveAdvance(): void {
    if (this.isPeriodLocked) {
      Swal.fire('Period Locked',
        this.periodName
          ? `Period "${this.periodName}" is locked.`
          : 'Selected period is locked.',
        'warning');
      return;
    }

    if (!this.model.customerId || !this.model.amount || this.model.amount <= 0) {
      Swal.fire('Validation', 'Select customer and enter valid amount', 'warning');
      return;
    }

    if (this.isOrderSpecific !== true) {
      Swal.fire('Validation', 'Please tick Link to Sales Order', 'warning');
      return;
    }

    const salesOrderId = Number(this.model.salesOrderId ?? 0);
    if (this.isOrderSpecific && salesOrderId <= 0) {
      Swal.fire('Validation', 'Select sales order', 'warning');
      return;
    }

    if (this.model.paymentMode === 'Bank' && !this.model.bankAccountId) {
      Swal.fire('Validation', 'Select bank account', 'warning');
      return;
    }

    const payload = {
      customerId:    this.model.customerId,
      salesOrderId:  this.isOrderSpecific ? salesOrderId : null,
      advanceDate:   this.model.advanceDate,
      amount:        this.model.amount,
      bankAccountId: this.model.bankAccountId,
      paymentMode:   this.model.paymentMode,
      remarks:       this.model.remarks,
      // ✅ FxRate fields
      fxRate:        this.fxRate       || 1,
      amountBase:    this.amountBase   || this.model.amount,
      currencyId:    this.currencyId   || null,
      currencyName:  this.currencyName || this.baseCurrencyName
    };

    this.saving = true;

    this.arService.createAdvance(payload).subscribe({
      next: () => {
        this.saving = false;
        Swal.fire('Success', 'Advance saved successfully', 'success');
        this.model.amount  = null;
        this.model.remarks = '';
        this.loadOpenAdvances();
        this.router.navigate(['/financial/AR']);
      },
      error: () => {
        this.saving = false;
        Swal.fire('Error', 'Failed to save advance', 'error');
      }
    });
  }

  goBack(): void {
    this.router.navigate(['/financial/AR']);
  }
}