// src/app/main/financial/accounts-payable/accounts-payable.component.ts

import {
  Component,
  OnInit,
  AfterViewInit,
  ViewEncapsulation
} from '@angular/core';
import { forkJoin } from 'rxjs';
import Swal from 'sweetalert2';
import * as feather from 'feather-icons';

import { AccountsPayableService } from './accounts-payable.service';
import { SupplierService } from 'app/main/businessPartners/supplier/supplier.service';
import { Router } from '@angular/router';

// ==== Tabs (added 'advances') ====
type ApTab = 'invoices' | 'payments' | 'aging' | 'advances' | 'match';

type SupplierInvoiceGroup = {
  supplierId: number;
  supplierName: string;
  totalGrandTotal: number;
  totalPaid: number;
  totalDebitNote: number;
  totalOutstanding: number;
  invoices: any[];
};

// OPTIONAL: strongly-typed advance row
interface SupplierAdvanceRow {
  id: number;
  advanceNo: string;
  supplierId: number;
  supplierName: string;
  advanceDate: string | Date;
  originalAmount: number;
  utilisedAmount: number;
  balanceAmount: number;
}


@Component({
  selector: 'app-accounts-payable',
  templateUrl: './accounts-payable.component.html',
  styleUrls: ['./accounts-payable.component.scss'],
  encapsulation: ViewEncapsulation.None
})
export class AccountsPayableComponent implements OnInit, AfterViewInit {

  // ---------------- TAB CONTROL ----------------
  activeTab: ApTab = 'invoices';

  // ---------------- EMAIL MODAL ----------------
  showEmailModal = false;
  selectedInvoiceForEmail: any = null;

  // ---------------- SUPPLIERS ----------------
  suppliers: Array<{ id: number; name: string }> = [];

  // ---------------- BANK ACCOUNTS ----------------
  bankAccounts: any[] = [];
  selectedBankId: number | null = null;
  bankAvailableBalance: number | null = null;
  bankBalanceAfterPayment: number | null = null;

  // ---------------- INVOICES TAB ----------------
  invoices: any[] = [];
  private allInvoices: any[] = [];
  invoiceSearch = '';

  totalInvAmount = 0;
  totalInvPaid = 0;
  totalInvOutstanding = 0;
  totalInvDebitNote = 0;

  supplierGroups: SupplierInvoiceGroup[] = [];
  expandedSupplierIds = new Set<number>();

  // Pagination for supplier summary
  invPage = 1;
  invPageSize = 10;

  // ---------------- PAYMENTS TAB ----------------
  payments: any[] = [];
  showPaymentForm = false;

  // Payments list pagination
  payListPage = 1;
  payListPageSize = 10;

  paySupplierId: number | null = null;
  supplierInvoicesAll: any[] = [];

  // Open invoices pagination
  payInvPage = 1;
  payInvPageSize = 10;

  payDate: string;
  payMethodId = 2;   // default Bank Transfer
  payReference = '';
  payAmount = 0;
  payNotes = '';
  payInvSelectAll = false;
  amountEditedManually = false;

  supTotalInvoice = 0;
  supTotalPaid = 0;
  supTotalDebitNote = 0;
  supTotalNetOutstanding = 0;

  // ---------------- ADVANCES TAB ----------------
  supplierAdvances: SupplierAdvanceRow[] = [];
  pagedSupplierAdvances: SupplierAdvanceRow[] = [];
  advPage = 1;
  advPageSize = 10;

  totalAdvanceAmount = 0;
  totalAdvanceUtilised = 0;
  totalAdvanceBalance = 0;

  // ---------------- MATCH TAB ----------------
  matchRows: any[] = [];

  matchPage = 1;
  matchPageSize = 10;

  // Period lock
  isPeriodLocked = false;
  currentPeriodName = '';

  constructor(
    private apSvc: AccountsPayableService,
    private supplierSvc: SupplierService,
    private router: Router
  ) {
    const today = new Date();
    this.payDate = today.toISOString().substring(0, 10);
  }

  // =====================================================
  //  LIFECYCLE
  // =====================================================
  ngOnInit(): void {
    this.checkPeriodLockForDate(this.payDate);
    this.loadSuppliers();
    this.loadBankAccounts();
    this.setTab('invoices');
  }

  ngAfterViewInit(): void {
    feather.replace();
  }

  // =====================================================
  //  TABS
  // =====================================================
  setTab(tab: ApTab): void {
    this.activeTab = tab;

    if (tab === 'invoices') {
      this.loadInvoices();
    } else if (tab === 'payments') {
      this.showPaymentForm = false;
      this.loadPayments();
      this.cancelPayment();
    } else if (tab === 'match') {
      this.loadMatch();
    } else if (tab === 'advances') {
      this.loadAdvances();
    }
    // 'aging' → no extra TS logic here, <app-ap-aging> loads itself
  }

  // =====================================================
  //  EMAIL MODAL (app-invoice-email)
  // =====================================================
  openEmailModal(inv: any): void {
    this.selectedInvoiceForEmail = inv;
    this.showEmailModal = true;
  }

  closeEmailModal(): void {
    this.showEmailModal = false;
    this.selectedInvoiceForEmail = null;
  }

  onEmailModalBackdropClick(event: MouseEvent): void {
    this.closeEmailModal();
  }

  // =====================================================
  //  SUPPLIERS
  // =====================================================
  loadSuppliers(): void {
    this.supplierSvc.GetAllSupplier().subscribe({
      next: (res: any) => {
        const raw = res?.data || res || [];
        this.suppliers = (raw || []).map((s: any) => ({
          id: s.id || s.Id,
          name: s.name || s.supplierName || s.SupplierName
        }));
      },
      error: () => Swal.fire('Error', 'Failed to load suppliers', 'error')
    });
  }

  // =====================================================
  //  BANK ACCOUNTS
  // =====================================================
  loadBankAccounts(): void {
    this.apSvc.getBankAccounts().subscribe({
      next: (res: any) => {
        // Expecting: { id, headName, availableBalance, ... }
        this.bankAccounts = res?.data || res || [];
      },
      error: () => Swal.fire('Error', 'Failed to load bank accounts', 'error')
    });
  }

  onBankChange(): void {
    debugger
    const bank = this.bankAccounts.find((x: any) => x.id === this.selectedBankId);
    this.bankAvailableBalance = bank?.availableBalance || 0;
    this.recalcBankBalanceAfterPayment();
  }

  onMethodChange(): void {
    if (this.payMethodId === 2 || this.payMethodId === 3) {
      this.onBankChange();
    } else {
      this.selectedBankId = null;
      this.bankAvailableBalance = null;
      this.bankBalanceAfterPayment = null;
    }
  }

  recalcBankBalanceAfterPayment(): void {
    if (this.bankAvailableBalance == null) {
      this.bankBalanceAfterPayment = null;
      return;
    }
    const amt = Number(this.payAmount || 0);
    this.bankBalanceAfterPayment = this.bankAvailableBalance - amt;
  }

  onAmountInputChange(): void {
    this.amountEditedManually = true;
    this.recalcBankBalanceAfterPayment();
  }

  recalcSelectedAmount(): void {
    if (this.amountEditedManually) return;

    let total = 0;
    this.supplierInvoicesAll.forEach(x => {
      if (x.isSelected) {
        total += Number(x.outstandingAmount || 0);
      }
    });

    this.payAmount = total;
    this.recalcBankBalanceAfterPayment();
  }

  // =====================================================
  //  INVOICES TAB
  // =====================================================
  loadInvoices(): void {
    this.apSvc.getApInvoices().subscribe({
      next: (res: any) => {
        const rows = res?.data || res || [];
        this.allInvoices = rows;
        this.invoices = [...rows];

        this.calcInvoiceTotals();
        this.buildSupplierGroups();
      },
      error: () => Swal.fire('Error', 'Failed to load AP invoices', 'error')
    });
  }

  calcInvoiceTotals(): void {
    this.totalInvAmount = 0;
    this.totalInvPaid = 0;
    this.totalInvOutstanding = 0;
    this.totalInvDebitNote = 0;

    this.invoices.forEach(i => {
      this.totalInvAmount      += Number(i.grandTotal || 0);
      this.totalInvPaid        += Number(i.paidAmount || 0);
      this.totalInvOutstanding += Number(i.outstandingAmount || 0);
      this.totalInvDebitNote   += Number(i.debitNoteAmount || 0);
    });
  }

  buildSupplierGroups(): void {
    const map = new Map<number, SupplierInvoiceGroup>();

    for (const inv of this.invoices) {
      const supplierId = inv.supplierId || inv.SupplierId;
      if (!supplierId) continue;

      const supplierName = inv.supplierName || inv.SupplierName || '';

      let grp = map.get(supplierId);
      if (!grp) {
        grp = {
          supplierId,
          supplierName,
          totalGrandTotal: 0,
          totalPaid: 0,
          totalDebitNote: 0,
          totalOutstanding: 0,
          invoices: []
        };
        map.set(supplierId, grp);
      }

      grp.totalGrandTotal  += Number(inv.grandTotal || 0);
      grp.totalPaid        += Number(inv.paidAmount || 0);
      grp.totalDebitNote   += Number(inv.debitNoteAmount || 0);
      grp.totalOutstanding += Number(inv.outstandingAmount || 0);
      grp.invoices.push(inv);
    }

    this.supplierGroups = Array.from(map.values()).sort((a, b) =>
      a.supplierName.localeCompare(b.supplierName)
    );

    this.expandedSupplierIds.clear();
    this.invPage = 1;
  }

  filterInvoices(event: any): void {
    const val = event?.target?.value?.toLowerCase() || '';
    this.invoiceSearch = val;

    if (!val) {
      this.invoices = [...this.allInvoices];
      this.calcInvoiceTotals();
      this.buildSupplierGroups();
      return;
    }

    this.invoices = this.allInvoices.filter(i =>
      (i.invoiceNo || '').toLowerCase().includes(val) ||
      (i.supplierName || '').toLowerCase().includes(val)
    );

    this.calcInvoiceTotals();
    this.buildSupplierGroups();
  }

  toggleSupplierExpand(id: number): void {
    if (this.expandedSupplierIds.has(id)) this.expandedSupplierIds.delete(id);
    else this.expandedSupplierIds.add(id);
  }

  isSupplierExpanded(id: number): boolean {
    return this.expandedSupplierIds.has(id);
  }

  getInvoiceStatusTextByAmounts(row: any): string {
    const paid = Number(row.paidAmount || 0);
    const dn   = Number(row.debitNoteAmount || 0);
    const os   = Number(row.outstandingAmount || 0);

    if (os <= 0 && (paid > 0 || dn > 0)) return 'Paid';
    if ((paid > 0 || dn > 0) && os > 0)  return 'Partial';
    return 'Unpaid';
  }

  getInvoiceStatusClassByAmounts(row: any): string {
    const txt = this.getInvoiceStatusTextByAmounts(row);
    if (txt === 'Paid') return 'badge-success';
    if (txt === 'Partial') return 'badge-warning';
    return 'badge-danger';
  }

  // Pagination (Suppliers)
  get invTotalPages(): number {
    return Math.max(1, Math.ceil((this.supplierGroups.length || 0) / this.invPageSize));
  }

  get pagedSupplierGroups(): SupplierInvoiceGroup[] {
    const start = (this.invPage - 1) * this.invPageSize;
    return this.supplierGroups.slice(start, start + this.invPageSize);
  }

  invGoToPage(p: number): void {
    if (p < 1 || p > this.invTotalPages) return;
    this.invPage = p;
  }

  // =====================================================
  //  PAYMENTS TAB
  // =====================================================
  loadPayments(): void {
    this.apSvc.getPayments().subscribe({
      next: (res: any) => {
        this.payments = res?.data || res || [];
        this.payListPage = 1;
      },
      error: () => Swal.fire('Error', 'Failed to load payments', 'error')
    });
  }

  openNewPayment(): void {
    this.showPaymentForm = true;
    this.cancelPayment();
  }

  backToPaymentList(): void {
    this.showPaymentForm = false;
    this.cancelPayment();
  }

  cancelPaymentForm(): void {
    this.cancelPayment();
  }

  cancelPayment(): void {
    this.resetPaymentForm();
    this.paySupplierId = null;
    this.supplierInvoicesAll = [];
    this.supTotalInvoice = 0;
    this.supTotalPaid = 0;
    this.supTotalDebitNote = 0;
    this.supTotalNetOutstanding = 0;
    this.payInvSelectAll = false;
    this.amountEditedManually = false;
    this.payInvPage = 1;
  }

  onPaySupplierChange(): void {
    this.payAmount = 0;
    this.amountEditedManually = false;
    this.supplierInvoicesAll = [];
    this.supTotalInvoice = 0;
    this.supTotalPaid = 0;
    this.supTotalDebitNote = 0;
    this.supTotalNetOutstanding = 0;
    this.payInvSelectAll = false;
    this.payInvPage = 1;

    if (!this.paySupplierId) return;

    this.apSvc.getApInvoicesBySupplier(this.paySupplierId).subscribe({
      next: (res: any) => {
        const raw = res?.data || res || [];

        const rows = raw
          .filter((x: any) => Number(x.outstandingAmount || 0) > 0)
          .map((x: any) => ({ ...x, isSelected: false }));

        this.supplierInvoicesAll = rows;

        rows.forEach(x => {
          this.supTotalInvoice        += Number(x.grandTotal || 0);
          this.supTotalPaid           += Number(x.paidAmount || 0);
          this.supTotalDebitNote      += Number(x.debitNoteAmount || 0);
          this.supTotalNetOutstanding += Number(x.outstandingAmount || 0);
        });

        this.payAmount = 0;
        this.recalcBankBalanceAfterPayment();
      },
      error: () => Swal.fire('Error', 'Failed to load supplier invoices', 'error')
    });
  }

  onSelectAllInvoicesChange(checked: boolean): void {
    this.payInvSelectAll = checked;
    this.supplierInvoicesAll.forEach(x => x.isSelected = checked);
    this.amountEditedManually = false;
    this.recalcSelectedAmount();
  }

  onInvoiceCheckboxChange(inv: any, checked: boolean): void {
    inv.isSelected = checked;
    this.payInvSelectAll = this.supplierInvoicesAll.every(x => x.isSelected);
    this.recalcSelectedAmount();
  }

  getPaymentMethodName(id?: number): string {
    switch (id) {
      case 1: return 'Cash';
      case 2: return 'Bank Transfer';
      case 3: return 'Cheque';
      case 4: return 'Other';
      default: return 'Other';
    }
  }

  postPayment(): void {
    debugger
    if (!this.paySupplierId) {
      Swal.fire('Warning', 'Select supplier', 'warning');
      return;
    }

    const selected = this.supplierInvoicesAll.filter(x => x.isSelected);
    if (selected.length === 0) {
      Swal.fire('Warning', 'Select at least one invoice', 'warning');
      return;
    }

    if (!this.payAmount || this.payAmount <= 0) {
      Swal.fire('Warning', 'Amount is zero', 'warning');
      return;
    }

    if ((this.payMethodId === 2 || this.payMethodId === 3) && !this.selectedBankId) {
      Swal.fire('Warning', 'Select Bank Account', 'warning');
      return;
    }

    let requests: any[] = [];

    if (selected.length === 1) {
      const inv = selected[0];
      const payload = {
        supplierInvoiceId: inv.id,
        supplierId: this.paySupplierId,
        paymentDate: this.payDate,
        paymentMethodId: this.payMethodId,
        referenceNo: this.payReference,
        amount: this.payAmount,
        notes: this.payNotes,
        bankAccountId: this.selectedBankId,
        bankId: this.selectedBankId,
        createdBy: 1
      };
      requests = [this.apSvc.createPayment(payload)];
    } else {
      requests = selected
        .map(inv => ({
          supplierInvoiceId: inv.id,
          supplierId: this.paySupplierId,
          paymentDate: this.payDate,
          paymentMethodId: this.payMethodId,
          referenceNo: this.payReference,
          amount: inv.outstandingAmount,
          notes: this.payNotes,
          bankAccountId: this.selectedBankId,
          bankId: this.selectedBankId,
          createdBy: 1
        }))
        .map(payload => this.apSvc.createPayment(payload));
    }

    forkJoin(requests).subscribe({
      next: (results: any[]) => {
        const allOk = results.every(r => r?.isSuccess !== false);

        if (allOk) {
          Swal.fire('Success', 'Payment(s) posted', 'success');

          if (this.selectedBankId && this.bankBalanceAfterPayment != null) {
            const payload = {
              bankHeadId: this.selectedBankId,
              newBalance: this.bankBalanceAfterPayment
            };
            this.apSvc.updateBankBalance(payload).subscribe({
              error: () => {
                // optional – ignore or show warning
              }
            });
            this.loadBankAccounts();
          }

        } else {
          const err = results.find(r => r?.isSuccess === false);
          Swal.fire('Warning', err?.message || 'Some payments failed', 'warning');
        }

        this.loadPayments();
        this.loadInvoices();
        this.backToPaymentList();
      },
      error: err => {
        const msg = err?.error?.message || err?.message || 'Payment failed';

        if (msg.toLowerCase().includes('locked')) {
          Swal.fire('Period Locked', msg, 'error');
          this.checkPeriodLockForDate(this.payDate);
        } else {
          Swal.fire('Error', msg, 'error');
        }
      }
    });
  }

  resetPaymentForm(): void {
    const today = new Date().toISOString().substring(0, 10);
    this.payDate = today;
    this.payMethodId = 2;
    this.payReference = '';
    this.payAmount = 0;
    this.payNotes = '';
    this.amountEditedManually = false;
    this.selectedBankId = null;
    this.bankAvailableBalance = null;
    this.bankBalanceAfterPayment = null;
  }

  get payListTotalPages(): number {
    return Math.max(1, Math.ceil((this.payments.length || 0) / this.payListPageSize));
  }

  get pagedPayments(): any[] {
    const start = (this.payListPage - 1) * this.payListPageSize;
    return this.payments.slice(start, start + this.payListPageSize);
  }

  payListGoToPage(p: number): void {
    if (p < 1 || p > this.payListTotalPages) return;
    this.payListPage = p;
  }

  get payInvTotalPages(): number {
    return Math.max(1, Math.ceil((this.supplierInvoicesAll.length || 0) / this.payInvPageSize));
  }

  get pagedSupplierInvoices(): any[] {
    const start = (this.payInvPage - 1) * this.payInvPageSize;
    return this.supplierInvoicesAll.slice(start, start + this.payInvPageSize);
  }

  payInvGoToPage(p: number): void {
    if (p < 1 || p > this.payInvTotalPages) return;
    this.payInvPage = p;
  }

  // =====================================================
  //  ADVANCES TAB
  // =====================================================
  loadAdvances(): void {
    // Expecting API something like: getSupplierAdvances()
    this.apSvc.getSupplierAdvances().subscribe({
      next: (res: any) => {
        const rows = (res?.data || res || []) as SupplierAdvanceRow[];

        this.supplierAdvances = rows;
        this.advPage = 1;

        // Totals
        this.totalAdvanceAmount = 0;
        this.totalAdvanceUtilised = 0;
        this.totalAdvanceBalance = 0;

        rows.forEach(a => {
          this.totalAdvanceAmount  += Number(a.originalAmount || 0);
          this.totalAdvanceUtilised += Number(a.utilisedAmount || 0);
          this.totalAdvanceBalance += Number(a.balanceAmount || 0);
        });

        this.updatePagedAdvances();
      },
      error: () => Swal.fire('Error', 'Failed to load supplier advances', 'error')
    });
  }

  updatePagedAdvances(): void {
    const start = (this.advPage - 1) * this.advPageSize;
    this.pagedSupplierAdvances = this.supplierAdvances.slice(start, start + this.advPageSize);
  }

  get advTotalPages(): number {
    return Math.max(1, Math.ceil((this.supplierAdvances.length || 0) / this.advPageSize));
  }

  advGoToPage(p: number): void {
    if (p < 1 || p > this.advTotalPages) return;
    this.advPage = p;
    this.updatePagedAdvances();
  }

  openNewAdvance(): void {
    // You can change this to navigate to your Advance create screen
    // this.router.navigate(['/ap/advance-create']);
    Swal.fire('Info', 'Advance create screen not wired yet.', 'info');
  }

  // =====================================================
  //  MATCH TAB
  // =====================================================
  loadMatch(): void {
    this.apSvc.getMatchList().subscribe({
      next: (res: any) => {
        this.matchRows = res?.data || res || [];
        this.matchPage = 1;
      },
      error: () => Swal.fire('Error', 'Failed to load match list', 'error')
    });
  }

  matchStatusClass(status: string): string {
    if (!status) return 'badge-secondary';
    if (status.toLowerCase() === 'matched') return 'badge-success';
    if (status.toLowerCase() === 'warning') return 'badge-warning';
    return 'badge-danger';
  }

  get matchTotalPages(): number {
    return Math.max(1, Math.ceil((this.matchRows.length || 0) / this.matchPageSize));
  }

  get pagedMatchRows(): any[] {
    const start = (this.matchPage - 1) * this.matchPageSize;
    return this.matchRows.slice(start, start + this.matchPageSize);
  }

  matchGoToPage(p: number): void {
    if (p < 1 || p > this.matchTotalPages) return;
    this.matchPage = p;
  }

  // =====================================================
  //  PERIOD LOCK
  // =====================================================
  checkPeriodLockForDate(dateStr: string): void {
    if (!dateStr) return;

    this.apSvc.getPeriodStatus(dateStr).subscribe({
      next: (res: any) => {
        this.isPeriodLocked = !!res.isLocked;
        this.currentPeriodName = res.periodName || '';
      },
      error: () => {
        this.isPeriodLocked = false;
        this.currentPeriodName = '';
      }
    });
  }

  onPayDateChange(): void {
    this.checkPeriodLockForDate(this.payDate);
  }

  onPayListPageSizeChange(size: number): void {
    this.payListPageSize = +size;
    this.payListPage = 1;
  }
}
