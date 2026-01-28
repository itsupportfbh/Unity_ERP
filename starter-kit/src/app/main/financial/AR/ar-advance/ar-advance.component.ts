import { Component, OnInit } from '@angular/core';
import Swal from 'sweetalert2';

import { ArInvoiceService } from '../Invoice/invoice-service';
import { CustomerMasterService } from 'app/main/businessPartners/customer-master/customer-master.service';
import { SalesOrderService } from 'app/main/sales/sales-order/sales-order.service';
import { AccountsPayableService } from '../../accounts-payable/accounts-payable.service';
import { Router } from '@angular/router';
@Component({
  selector: 'app-ar-advance',
  templateUrl: './ar-advance.component.html',
  styleUrls: ['./ar-advance.component.scss']
})
export class ArAdvanceComponent implements OnInit {

  customers: any[] = [];
  orders: any[] = [];
  openAdvances: any[] = [];
  bankAccounts: any[] = [];

  isOrderSpecific = false;
  saving = false;
  loadingOrders = false;

  model: any = {
    customerId: null,
    salesOrderId: null,
    advanceDate: new Date().toISOString().slice(0,10),
    amount: null,
    bankAccountId: null,
    paymentMode: 'Bank',
    remarks: ''
  };

  constructor(
    private arService: ArInvoiceService,
    private customerService: CustomerMasterService,
    private salesOrderService: SalesOrderService,
      private apSvc: AccountsPayableService,
       private router: Router
  ) {}

  ngOnInit(): void {
    this.loadCustomers();
    this.loadBankAccounts();
  }

  /* ================== LOADERS ================== */

  loadCustomers() {
    this.customerService.getAllCustomerMaster().subscribe((res:any) => {
      this.customers = res?.data || [];
    });
  }

  loadBankAccounts(): void {
    this.apSvc.getBankAccounts().subscribe({
      next: (res: any) => {
        this.bankAccounts = res?.data || res || [];
      },
      error: () =>
        Swal.fire('Error', 'Failed to load bank accounts', 'error')
    });
  }

  /* ================== CUSTOMER / ORDER ================== */

  onCustomerChange() {
    this.model.salesOrderId = null;
    this.orders = [];
    this.openAdvances = [];

    if (!this.model.customerId) return;

    if (this.isOrderSpecific) {
      this.loadOrdersForCustomer();
    }

    this.loadOpenAdvances();
  }

  onToggleOrderSpecific() {
    this.model.salesOrderId = null;
    this.orders = [];

    if (this.isOrderSpecific && this.model.customerId) {
      this.loadOrdersForCustomer();
    }
  }

  loadOrdersForCustomer() {
    if (!this.model.customerId) return;

    this.loadingOrders = true;
    this.salesOrderService.getOpenByCustomer(this.model.customerId).subscribe({
      next: res => {
        this.orders = res?.data || [];
        this.loadingOrders = false;
      },
      error: _ => {
        this.orders = [];
        this.loadingOrders = false;
      }
    });
  }

  /* ================== ADVANCES ================== */

  loadOpenAdvances() {
    if (!this.model.customerId) return;

    this.arService.getOpenAdvances(
      this.model.customerId,
      this.isOrderSpecific ? this.model.salesOrderId : null
    )
    .subscribe({
      next: res => this.openAdvances = res || [],
      error: _ => this.openAdvances = []
    });
  }

  onBankChange() {
    const bank = this.bankAccounts.find(b => b.id === this.model.bankAccountId);
    if (bank) {
      console.log('Selected bank:', bank.headName);
    }
  }

  /* ================== SAVE ================== */

  saveAdvance() {

    if (!this.model.customerId || !this.model.amount || this.model.amount <= 0) {
      Swal.fire('Validation', 'Select customer and enter valid amount', 'warning');
      return;
    }

    if (!this.model.bankAccountId) {
      Swal.fire('Validation', 'Select bank account', 'warning');
      return;
    }

    const payload = {
      customerId: this.model.customerId,
      salesOrderId: this.isOrderSpecific ? this.model.salesOrderId : null,
      advanceDate: this.model.advanceDate,
      amount: this.model.amount,
      bankAccountId: this.model.bankAccountId,
      paymentMode: this.model.paymentMode,
      remarks: this.model.remarks
    };

    this.saving = true;

    this.arService.createAdvance(payload).subscribe({
      next: _ => {
        this.saving = false;
        Swal.fire('Success', 'Advance saved successfully', 'success');
        this.model.amount = null;
        this.model.remarks = '';
        this.loadOpenAdvances();
      },
      error: _ => {
        this.saving = false;
        Swal.fire('Error', 'Failed to save advance', 'error');
      }
    });
  }
    goBack(): void {
    this.router.navigate(['/financial/AR']);
  }
}
