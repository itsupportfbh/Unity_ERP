import { Component, OnInit } from '@angular/core';
import { Location } from '@angular/common';
import { Router, ActivatedRoute } from '@angular/router';

import { ReceiptService, ReceiptDetailDto } from '../receipt-service';
import { CustomerMasterService } from 'app/main/businessPartners/customer-master/customer-master.service';
import { BankService } from 'app/main/master/bank/bank-service/bank.service';
import Swal from 'sweetalert2';
import { AccountsPayableService } from 'app/main/financial/accounts-payable/accounts-payable.service';

interface AllocationRow {
  invoiceId: number;
  invoiceNo: string;
  allocatedAmount: number;
  selected: boolean;
}

@Component({
  selector: 'app-receipt-create',
  templateUrl: './receipt-create.component.html',
  styleUrls: ['./receipt-create.component.scss']
})
export class ReceiptCreateComponent implements OnInit {

  // ------- edit state -------
  isEdit = false;
  receiptId: number | null = null;
  receiptNo: string | null = null;

  // ------- header -------
  customerId: number | null = null;
  customerName = '';
  receiptDate: string;

  paymentMode: 'CASH' | 'BANK' = 'CASH';
  banks: any
  selectedBankId: number | null = null;

  amountReceived: number = 0;

  // ------- grid -------
  invoices: any[] = [];
  allocations: AllocationRow[] = [];

  isSaving = false;
  customerList: any[] = [];
  bankAccounts: any;
  bankAvailableBalance: any;
  isAmountManual = false;

  constructor(
    private receiptService: ReceiptService,
    private location: Location,
    private router: Router,
    private route: ActivatedRoute,
    private _customerMasterService: CustomerMasterService,
    private _bankService: BankService,
    private apSvc: AccountsPayableService,
  ) {
    const today = new Date();
    this.receiptDate = today.toISOString().substring(0, 10);
  }

  ngOnInit(): void {

    this._bankService.getAllBank().subscribe((res: any) => {
      this.banks = res.data || [];
    });
    this.apSvc.getBankAccounts().subscribe({
        next: (res: any) => {
          // Expecting: { id, headName, availableBalance, ... }
          this.bankAccounts = res?.data || res || [];
        },
        error: () => Swal.fire('Error', 'Failed to load bank accounts', 'error')
    });

    this._customerMasterService.GetAllCustomerDetails().subscribe((res: any) => {
      this.customerList = res.data || [];
    });

    // check route param for edit
    this.route.paramMap.subscribe(pm => {
      const idStr = pm.get('id');
      if (idStr) {
        this.isEdit = true;
        this.receiptId = +idStr;
        this.loadReceiptForEdit(this.receiptId);
      }
    });
  }

  // ==========================
  // LOAD EXISTING RECEIPT
  // ==========================
  private loadReceiptForEdit(id: number): void {
    this.receiptService.getReceiptById(id).subscribe((dto: ReceiptDetailDto) => {
      if (!dto) { return; }

      this.receiptId      = dto.id;
      this.receiptNo      = dto.receiptNo;
      this.customerId     = dto.customerId;
      this.customerName   = dto.customerName;
      this.receiptDate    = dto.receiptDate.toString().substring(0, 10);
      this.paymentMode    = dto.paymentMode === 'BANK' ? 'BANK' : 'CASH';
      this.selectedBankId = dto.bankId ?? null;
      this.amountReceived = dto.amountReceived;

      // current receipt allocations
      this.allocations = (dto.allocations || []).map(a => {
        const amt = Number(a.allocatedAmount || 0);
        return {
          invoiceId:       a.invoiceId,
          invoiceNo:       a.invoiceNo,
          allocatedAmount: amt,
          selected:        amt > 0
        };
      });

      // convert view values to "before this receipt"
      this.invoices = (dto.allocations || []).map(a => {
        const amount      = Number(a.amount || 0);
        const openAfter   = Number(a.balance || 0);         // after this receipt
        const thisAlloc   = Number(a.allocatedAmount || 0); // this receipt

        const openBefore  = openAfter + thisAlloc;
        const paidBefore  = amount - openBefore;

        return {
          id:          a.invoiceId,
          invoiceNo:   a.invoiceNo,
          invoiceDate: a.invoiceDate,
          amount,
          balance:     openBefore,
          paidBefore
        };
      });

      this.recalculateTotals();
    });
  }

  // ==========================
  // CUSTOMER
  // ==========================
  onCustomerChange(event: any): void {
    this.customerId = event.customerId;
    const selected = this.customerList.find(c => c.id === this.customerId);
    this.customerName = selected ? selected.customerName : '';
    this.amountReceived = 0;
    this.isAmountManual = false;
    this.loadInvoicesForCustomer();
  }

  openCustomerLookup(): void {
    // demo only
    this.customerId = 1;
    this.customerName = 'Demo Customer';
    this.loadInvoicesForCustomer();
  }

  loadInvoicesForCustomer(): void {
    if (!this.customerId) return;

    this.receiptService.getOpenInvoices(this.customerId).subscribe(res => {
      const src = res || [];

      this.invoices = src.map((i: any) => ({
        id: i.id,
        invoiceNo: i.invoiceNo,
        invoiceDate: i.invoiceDate,
        amount: Number(i.amount || 0),
        paidBefore: Number(i.paidAmount || 0),
        balance: Number(i.balance || 0)
      }));

      // merge existing allocations if we are editing
      const existing = new Map<number, number>();
      this.allocations.forEach(a => existing.set(a.invoiceId, a.allocatedAmount));

      this.allocations = this.invoices.map((i: any) => {
        const amt = existing.get(i.id) || 0;
        return {
          invoiceId: i.id,
          invoiceNo: i.invoiceNo,
          allocatedAmount: amt,
          selected: amt > 0
        };
      });

      this.recalculateTotals();
    });
  }

  // ==========================
  // HEADER EVENTS
  // ==========================
  onPaymentModeChange(): void {
    if (this.paymentMode === 'CASH') {
      this.selectedBankId = null;
    } else if (this.paymentMode === 'BANK') {
      // future: fetch from bank reco
    }
  }

  onBankChange(event): void {
    debugger
    const bank = this.bankAccounts.find(x => x.id === event.budgetLineId);
    this.bankAvailableBalance = bank?.availableBalance || 0;
    if (!this.customerId || !this.selectedBankId) {
      return;
    }
  
    // TODO: call API for bank amount
  }

  onAmountReceivedChange(): void {
    this.isAmountManual = true;
    this.recalculateTotals();
  }

  // ==========================
  // MULTI-SELECT (CHECKBOXES)
  // ==========================
  get allSelected(): boolean {
    return this.allocations.length > 0 && this.allocations.every(a => a.selected);
  }

  onHeaderCheckboxChange(checked: boolean): void {
    this.allocations.forEach((a, i) => {
      const inv = this.invoices[i];
      a.selected = checked;

      if (checked) {
        const maxExtra = Number(inv.balance || 0);
        a.allocatedAmount = maxExtra;
      } else {
        a.allocatedAmount = 0;
      }
    });

    this.recalculateTotals();
  }

  onRowCheckboxChange(index: number, checked: boolean): void {
    const inv = this.invoices[index];
    const alloc = this.allocations[index];
    if (!inv || !alloc) return;

    alloc.selected = checked;

    if (checked) {
      const maxExtra = Number(inv.balance || 0);
      alloc.allocatedAmount = maxExtra;
    } else {
      alloc.allocatedAmount = 0;
    }

    this.recalculateTotals();
  }

  // ==========================
  // ALLOCATE EVENTS
  // ==========================
  onAllocateChange(index: number): void {
    const inv = this.invoices[index];
    const alloc = this.allocations[index];
    if (!inv || !alloc) {
      this.recalculateTotals();
      return;
    }

    const maxExtra = Number(inv.balance || 0);
    let val = Number(alloc.allocatedAmount || 0);

    if (val < 0) val = 0;
    if (val > maxExtra) val = maxExtra;

    alloc.allocatedAmount = val;
    alloc.selected = val > 0; // manual typing also controls checkbox

    this.recalculateTotals();
  }

  rowPaid(inv: any, index: number): number {
    const base = Number(inv.amount || 0) - Number(inv.balance || 0);
    const extra = Number(this.allocations[index]?.allocatedAmount || 0);
    return +(base + extra).toFixed(2);
  }

  rowBalance(inv: any, index: number): number {
    const openBal = Number(inv.balance || 0);
    const extra = Number(this.allocations[index]?.allocatedAmount || 0);
    const bal = openBal - extra;
    return bal < 0 ? 0 : +bal.toFixed(2);
  }

  // ==========================
  // TOTALS
  // ==========================
  get totalAllocated(): number {
    return this.allocations.reduce((s, a) => s + (a.allocatedAmount || 0), 0);
  }

  get unallocatedAmount(): number {
    return (this.amountReceived || 0) - this.totalAllocated;
  }

  recalculateTotals(): void {
    // getters do the work – kept for future logic if needed
      if (!this.isAmountManual) {
    this.amountReceived = this.totalAllocated;
  }
  }

  // ==========================
  // SAVE
  // ==========================
  canSave(): boolean {
    return !!this.customerId &&
      this.totalAllocated > 0 &&
      this.amountReceived >= this.totalAllocated &&
      !this.isSaving;
  }

  save(): void {
    if (!this.canSave()) return;

    const payload: any = {
      id: this.isEdit ? this.receiptId : null,
      customerId: this.customerId!,
      receiptDate: this.receiptDate,
      paymentMode: this.paymentMode,
      bankId: this.paymentMode === 'BANK' ? this.selectedBankId : null,
      amountReceived: this.amountReceived,
      allocations: this.allocations.filter(a => a.allocatedAmount > 0)
    };

    this.isSaving = true;

    const obs = this.isEdit && this.receiptId
      ? this.receiptService.updateReceipt(this.receiptId, payload)
      : this.receiptService.insertReceipt(payload);

    obs.subscribe({
      next: () => {
        this.isSaving = false;
        this.router.navigate(['/financial/AR'], { queryParams: { tab: 'receipts' } });
      },
      error: () => {
        this.isSaving = false;
      }
    });
  }

  cancel(): void {
    this.router.navigate(['/financial/AR'], { queryParams: { tab: 'receipts' } });
  }
}
