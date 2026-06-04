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
// ✅ FxRate properties
fxRate:           number  = 1;
currencyId:       number  = 0;
currencyName:     string  = 'SGD';
baseCurrencyId:   number  = 0;
baseCurrencyName: string  = 'SGD';
amountBase:       number  = 0;
exchangeGainLoss: number  = 0;
fxRateLoading:    boolean = false;
availableCurrencies: any[] = [];
paymentCurrencyId:   number = 0;
paymentCurrencyName: string = 'SGD';
invoiceFxRate:    number  = 1;
invoiceCurrencyId: number = 0;
invoiceCurrencyName: string = '';
Math = Math;
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
      this.baseCurrencyId   = Number(localStorage.getItem('companyCurrencyId') || 0);
  this.baseCurrencyName = 'SGD';

    this.loadCurrencies();


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
// ✅ Load currencies
loadCurrencies(): void {
  this.apSvc.getCurrencies().subscribe({
    next: (res: any) => {
      this.availableCurrencies = res?.data || res || [];
      this.setDefaultPaymentCurrency();
    },
    error: () => {}
  });
}

private setDefaultPaymentCurrency(): void {
  const base = this.availableCurrencies.find(
    c => Number(c.id || c.Id) === this.baseCurrencyId
  );
  this.paymentCurrencyId   = this.baseCurrencyId;
  this.paymentCurrencyName = base?.currencyName || base?.CurrencyName || 'SGD';
}

onPaymentCurrencyChange(): void {
  const sel = this.availableCurrencies.find(
    c => Number(c.id || c.Id) === Number(this.paymentCurrencyId)
  );
  if (!sel) return;

  this.paymentCurrencyName = sel.currencyName || sel.CurrencyName || '';

  const baseCurrId = this.baseCurrencyId;

  if (Number(this.paymentCurrencyId) === baseCurrId) {
    // SGD → FxRate = 1, recalc
    this.fxRate = 1;
    this.recalcAllocationsForCurrencyChange();
    this.recalcBase();
  } else {
    // Foreign → fetch rate then recalc
    this.fetchPaymentFxRate();
  }
}

fetchPaymentFxRate(): void {
  if (!this.paymentCurrencyId || !this.baseCurrencyId) return;
  this.fxRateLoading = true;
  const today = new Date().toISOString().substring(0, 10);

  this.apSvc.getExchangeRate(
    this.paymentCurrencyId,
    this.baseCurrencyId,
    today
  ).subscribe({
    next: (res: any) => {
      this.fxRateLoading = false;
      this.fxRate = res?.isSuccess && res?.data?.rate
        ? Number(res.data.rate)
        : Number(this.invoiceFxRate || 1);

      this.recalcAllocationsForCurrencyChange();
      this.recalcBase();
    },
    error: () => {
      this.fxRateLoading = false;
      this.fxRate = Number(this.invoiceFxRate || 1);
      this.recalcAllocationsForCurrencyChange();
    }
  });
}

recalcAllocationsForCurrencyChange(): void {
  const baseCurrId = this.baseCurrencyId;
  const isPaySGD   = Number(this.paymentCurrencyId) === baseCurrId;

  this.allocations.forEach((a, i) => {
    if (!a.selected) return;

    const inv     = this.invoices[i];
    if (!inv) return;

    const balance    = Number(inv.balance   || 0);
    const invFx      = Number(inv.fxRate    || 1);
    const invCurrId  = Number(inv.currencyId || 0);

    if (isPaySGD) {
      // ✅ Pay SGD
      if (invCurrId !== baseCurrId) {
        // Foreign invoice (INR) → balance × fxRate = SGD
        a.allocatedAmount = +(balance * invFx).toFixed(2);
      } else {
        // SGD invoice → as-is
        a.allocatedAmount = balance;
      }
    } else {
      // ✅ Pay foreign (INR)
      const payCurrId = Number(this.paymentCurrencyId);
      if (invCurrId === payCurrId) {
        // ✅ Invoice currency = Pay currency → balance as-is
        a.allocatedAmount = balance;
      } else if (invCurrId === baseCurrId) {
        // SGD invoice, paying INR → SGD balance ÷ fxRate = INR
        const payFx = Number(this.fxRate || 1);
        a.allocatedAmount = payFx > 0
          ? +(balance / payFx).toFixed(2)
          : balance;
      } else {
        // Different foreign currencies → as-is
        a.allocatedAmount = balance;
      }
    }
  });

  this.recalculateTotals();
}

recalcBase(): void {
  const fx         = Number(this.fxRate || 1);
  const amt        = Number(this.amountReceived || 0);
  const baseCurrId = this.baseCurrencyId;

  if (Number(this.paymentCurrencyId) === baseCurrId) {
    // ✅ Pay SGD → base = amount
    this.amountBase       = amt;
    this.exchangeGainLoss = 0;
    return;
  }

  // ✅ Foreign currency pay
  this.amountBase = +(amt * fx).toFixed(2);

  // ✅ Exchange Gain/Loss only when:
  // Pay currency = Invoice currency AND FxRate differs from invoice rate
  const selectedInvoices = this.allocations
    .filter(a => a.selected)
    .map((a, i) => this.invoices[i])
    .filter(inv => inv);

  // Same currency invoices மட்டும் gain/loss calculate
  const sameCurrInvoices = selectedInvoices.filter(inv =>
    Number(inv?.currencyId || 0) === Number(this.paymentCurrencyId)
  );

  if (sameCurrInvoices.length === 0) {
    // ✅ No same-currency invoice → no gain/loss
    this.exchangeGainLoss = 0;
    return;
  }

  // ✅ Compare pay FxRate vs invoice FxRate
  const invFx = Number(sameCurrInvoices[0]?.fxRate || 1);
  if (Math.abs(fx - invFx) > 0.000001) {
    this.exchangeGainLoss = +(amt * fx - amt * invFx).toFixed(2);
  } else {
    this.exchangeGainLoss = 0;
  }
}
isForeignCurrency(): boolean {
  return !!(
    this.paymentCurrencyId &&
    this.paymentCurrencyId !== this.baseCurrencyId
  );
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
  this.customerId = event?.customerId ?? event?.id ?? event;
  const selected  = this.customerList.find(
    c => (c.customerId || c.id) === this.customerId
  );
  this.customerName = selected?.customerName || '';
  this.amountReceived  = 0;
  this.isAmountManual  = false;

  // ✅ reset FxRate
  this.fxRate              = 1;
  this.invoiceFxRate       = 1;
  this.invoiceCurrencyId   = 0;
  this.invoiceCurrencyName = '';
  this.amountBase          = 0;
  this.exchangeGainLoss    = 0;
  this.setDefaultPaymentCurrency();

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

    console.log('Raw API response[0]:', src[0]);
    console.log('All keys:', Object.keys(src[0] || {}));

    // ✅ invoices set first
    this.invoices = src
      .filter((i: any) => i.id && i.invoiceNo)
      .map((i: any) => ({
        id:           i.id,
        invoiceNo:    i.invoiceNo,
        invoiceDate:  i.invoiceDate,
        amount:       Number(i.amount    || 0),
        paidBefore:   Number(i.paidAmount || 0),
        balance:      Number(i.balance   || 0),
        fxRate:       Number(i.fxRate    ?? i.FxRate    ?? 1),
        currencyId:   Number(i.currencyId ?? i.CurrencyId ?? 0),
        currencyName: i.currencyName      ?? i.CurrencyName ?? ''
      }));

    // ✅ FxRate from first invoice
    const first = this.invoices[0];
    if (first) {
      this.invoiceFxRate       = Number(first.fxRate    || 1);
      this.invoiceCurrencyId   = Number(first.currencyId || 0);
      this.invoiceCurrencyName = first.currencyName      || '';
    }

    // ✅ allocations — invoices-க்கு match ஆக create
    const existing = new Map<number, number>();
    (this.allocations || []).forEach(a => existing.set(a.invoiceId, a.allocatedAmount));

    // ✅ invoices length-க்கு match ஆக allocations create
    this.allocations = this.invoices.map((i: any) => ({
      invoiceId:       i.id,
      invoiceNo:       i.invoiceNo,
      allocatedAmount: existing.get(i.id) || 0,
      selected:        (existing.get(i.id) || 0) > 0
    }));

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
     this.recalcBase();
  }

  // ==========================
  // MULTI-SELECT (CHECKBOXES)
  // ==========================
  get allSelected(): boolean {
    return this.allocations.length > 0 && this.allocations.every(a => a.selected);
  }


onRowCheckboxChange(index: number, checked: boolean): void {
  const inv    = this.invoices[index];
  const alloc  = this.allocations[index];
    console.log('=== onRowCheckboxChange ===');
  console.log('inv:', inv);
  console.log('inv.balance:', inv?.balance);
  console.log('inv.fxRate:', inv?.fxRate);
  console.log('inv.currencyId:', inv?.currencyId);
  console.log('paymentCurrencyId:', this.paymentCurrencyId);
  console.log('baseCurrencyId:', this.baseCurrencyId);
  console.log('checked:', checked);
  if (!inv || !alloc) return;

  alloc.selected = checked;

  if (checked) {
    const balance    = Number(inv.balance  || 0);
    const invFx      = Number(inv.fxRate   || 1);
    const invCurrId  = Number(inv.currencyId || 0);
    const baseCurrId = this.baseCurrencyId;
    const payCurrId  = Number(this.paymentCurrencyId);

    if (payCurrId === baseCurrId) {
      // ✅ Pay SGD
      if (invCurrId !== baseCurrId && invFx > 0) {
        // INR invoice → SGD amount = INR balance × fxRate
        alloc.allocatedAmount = +(balance * invFx).toFixed(2);
      } else {
        // SGD invoice → as-is
        alloc.allocatedAmount = balance;
      }
    } else if (payCurrId === invCurrId) {
      // ✅ Pay INR, Invoice INR → as-is
      alloc.allocatedAmount = balance;
    } else {
      // ✅ Different foreign currencies
      alloc.allocatedAmount = balance;
    }
  } else {
    alloc.allocatedAmount = 0;
  }

  this.recalculateTotals();
}

onHeaderCheckboxChange(checked: boolean): void {
  const baseCurrId = this.baseCurrencyId;
  const payCurrId  = Number(this.paymentCurrencyId);

  this.allocations.forEach((a, i) => {
    const inv = this.invoices[i];
    a.selected = checked;

    if (checked && inv) {
      const balance   = Number(inv.balance   || 0);
      const invFx     = Number(inv.fxRate    || 1);
      const invCurrId = Number(inv.currencyId || 0);

      if (payCurrId === baseCurrId) {
        // ✅ Pay SGD
        if (invCurrId !== baseCurrId && invFx > 0) {
          // INR invoice → SGD = balance × fxRate
          a.allocatedAmount = +(balance * invFx).toFixed(2);
        } else {
          a.allocatedAmount = balance;
        }
      } else if (payCurrId === invCurrId) {
        // ✅ Pay INR, Invoice INR
        a.allocatedAmount = balance;
      } else {
        a.allocatedAmount = balance;
      }
    } else {
      a.allocatedAmount = 0;
    }
  });

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
  const base      = Number(inv.amount  || 0) - Number(inv.balance || 0);
  const allocSGD  = Number(this.allocations[index]?.allocatedAmount || 0);
  const invFx     = Number(inv.fxRate || 1);
  const baseCurrId = this.baseCurrencyId;

  if (Number(this.paymentCurrencyId) === baseCurrId) {
    // ✅ Pay SGD → convert back to invoice currency
    const allocInInvCurr = invFx > 0 ? +(allocSGD / invFx).toFixed(2) : allocSGD;
    return +(base + allocInInvCurr).toFixed(2);
  } else {
    // ✅ Pay same currency → direct
    return +(base + allocSGD).toFixed(2);
  }
}

rowBalance(inv: any, index: number): number {
  const openBal   = Number(inv.balance || 0);
  const allocSGD  = Number(this.allocations[index]?.allocatedAmount || 0);
  const invFx     = Number(inv.fxRate || 1);
  const baseCurrId = this.baseCurrencyId;

  let deduct: number;

  if (Number(this.paymentCurrencyId) === baseCurrId) {
    // ✅ Pay SGD → convert to invoice currency
    deduct = invFx > 0 ? +(allocSGD / invFx).toFixed(2) : allocSGD;
  } else {
    // ✅ Pay same currency → direct
    deduct = allocSGD;
  }

  const bal = openBal - deduct;
  return bal < 0 ? 0 : +bal.toFixed(2);
}

  // ==========================
  // TOTALS
  // ==========================
// ✅ getter already correct — allocations already in pay currency
get totalAllocated(): number {
  return +this.allocations
    .reduce((s, a) => s + (a.allocatedAmount || 0), 0)
    .toFixed(2);
}

  get unallocatedAmount(): number {
    return (this.amountReceived || 0) - this.totalAllocated;
  }

  recalculateTotals(): void {
    // getters do the work – kept for future logic if needed
      if (!this.isAmountManual) {
    this.amountReceived = this.totalAllocated;
  }
   this.recalcBase();
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
      allocations: this.allocations.filter(a => a.allocatedAmount > 0),
       fxRate:             this.fxRate,
    amountBase:         this.amountBase,
    currencyId:         this.paymentCurrencyId   || 0,
    currencyName:       this.paymentCurrencyName || 'SGD',
    exchangeGainLoss:   this.exchangeGainLoss    || 0,
    companyCurrencyId:  this.baseCurrencyId
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
  // ✅ Safe allocation getter
getAlloc(index: number): AllocationRow | null {
  return this.allocations[index] ?? null;
}

getAllocAmount(index: number): number {
  return this.allocations[index]?.allocatedAmount ?? 0;
}
}
