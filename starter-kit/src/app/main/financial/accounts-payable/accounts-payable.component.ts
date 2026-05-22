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
import { FunctionPermission, PermissionService } from 'app/shared/permission.service';

type ApTab = 'invoices' | 'payments' | 'aging' | 'advances' | 'match';

type SupplierInvoiceGroup = {
  supplierId: number;
  supplierName: string;
  totalGrandTotal: number;
  totalPaid: number;
  totalDebitNote: number;
  totalAdvance: number;
  totalPayable: number;
  invoices: any[];
};

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
  activeTab: ApTab = 'invoices';

  showEmailModal = false;
  selectedInvoiceForEmail: any = null;

  suppliers: Array<{ id: number; name: string }> = [];

  bankAccounts: any[] = [];
  selectedBankId: number | null = null;
  bankAvailableBalance: number | null = null;
  bankBalanceAfterPayment: number | null = null;

  invoices: any[] = [];
  private allInvoices: any[] = [];
  invoiceSearch = '';

  totalInvAmount = 0;
  totalInvPaid = 0;
  totalInvDebitNote = 0;
  totalInvAdvance = 0;
  totalInvOutstanding = 0;

  supplierGroups: SupplierInvoiceGroup[] = [];
  expandedSupplierIds = new Set<number>();

  invPage = 1;
  invPageSize = 10;

  payments: any[] = [];
  showPaymentForm = false;

  payListPage = 1;
  payListPageSize = 10;

  paySupplierId: number | null = null;
  supplierInvoicesAll: any[] = [];

  payInvPage = 1;
  payInvPageSize = 10;

  payDate = '';
  payMethodId = 2;
  payReference = '';
  payAmount = 0;
  payNotes = '';
  payInvSelectAll = false;
  amountEditedManually = false;

  supTotalInvoice = 0;
  supTotalPaid = 0;
  supTotalDebitNote = 0;
  supTotalAdvance = 0;
  supTotalNetOutstanding = 0;
  supTotalPayable = 0;

  supplierAdvances: SupplierAdvanceRow[] = [];
  pagedSupplierAdvances: SupplierAdvanceRow[] = [];
  advPage = 1;
  advPageSize = 10;

  totalAdvanceAmount = 0;
  totalAdvanceUtilised = 0;
  totalAdvanceBalance = 0;

  matchRows: any[] = [];
  matchPage = 1;
  matchPageSize = 10;

  isPeriodLocked = false;
  currentPeriodName = '';
  userId: any;

  Math = Math;

        functionId = 'ap';
      
        permission: FunctionPermission;
          isPermissionLoaded = false;
          isPageLoading = false;
periodName = '';
  constructor(
    private apSvc: AccountsPayableService,
    private supplierSvc: SupplierService,
    public router: Router,
         private permissionService : PermissionService
  ) {
    this.payDate = new Date().toISOString().substring(0, 10);
    this.userId = Number(localStorage.getItem('id') );
    this.permission = this.permissionService.getEmptyPermission(this.functionId);
  }

  ngOnInit(): void {
    this.checkPeriodLockForDate(this.payDate);
    this.loadSuppliers();
    this.loadBankAccounts();
    this.loadPermission();
  }

  ngAfterViewInit(): void {
    feather.replace();
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

      if (!this.canView()) {
        this.invoices = [];
        this.allInvoices = [];
        this.supplierGroups = [];
        Swal.fire('Access Denied', 'You do not have view permission.', 'warning');
        return;
      }

      this.setTab('invoices');
    },
    error: () => {
      this.permission = this.permissionService.getEmptyPermission(this.functionId);
      this.isPermissionLoaded = true;
      this.isPageLoading = false;
      Swal.fire('Error', 'Unable to load permission.', 'error');
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
  
          canApprove(): boolean{
            return this.permissionService.hasApprove(this.permission);
          }

  setTab(tab: ApTab): void {
    this.activeTab = tab;

    if (tab === 'invoices') {
      this.loadInvoices();
    }

    if (tab === 'payments') {
      this.showPaymentForm = false;
      this.loadPayments();
      this.cancelPayment();
    }

    if (tab === 'match') {
      this.loadMatch();
    }

    if (tab === 'advances') {
      this.loadAdvances();
    }
  }

  loadSuppliers(): void {
    this.supplierSvc.GetAllSupplier().subscribe({
      next: (res: any) => {
        const raw = res?.data || res || [];
        this.suppliers = raw.map((s: any) => ({
          id: Number(s.id || s.Id || 0),
          name: s.name || s.supplierName || s.SupplierName || s.Name || ''
        }));
      },
      error: () => Swal.fire('Error', 'Failed to load suppliers', 'error')
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

  loadInvoices(): void {
    forkJoin({
      invoices: this.apSvc.getApInvoices(),
      advances: this.apSvc.getSupplierAdvances()
    }).subscribe({
      next: (res: any) => {
        const invoiceRows = res.invoices?.data || res.invoices || [];
        const advanceRows = res.advances?.data || res.advances || [];

        const utilisedAdvanceMap = new Map<number, number>();

        advanceRows.forEach((a: any) => {
          const supplierId = Number(a.supplierId || a.SupplierId || 0);
          const original = Number(a.originalAmount || a.OriginalAmount || 0);
          const utilised = Number(a.utilisedAmount || a.UtilisedAmount || 0);
          const balance = Number(a.balanceAmount || a.BalanceAmount || 0);

          const applied = utilised > 0 ? utilised : Math.max(original - balance, 0);

          if (supplierId > 0 && applied > 0) {
            utilisedAdvanceMap.set(
              supplierId,
              Number(((utilisedAdvanceMap.get(supplierId) || 0) + applied).toFixed(2))
            );
          }
        });

        this.allInvoices = invoiceRows
          .map((x: any) => this.mapInvoiceRow(x))
          .sort(
            (a: any, b: any) =>
              new Date(a.invoiceDate).getTime() - new Date(b.invoiceDate).getTime()
          );

        this.applyUtilisedAdvanceToInvoices(utilisedAdvanceMap);

        this.invoices = [...this.allInvoices];
        this.calcInvoiceTotals();
        this.buildSupplierGroups();
      },
      error: () => Swal.fire('Error', 'Failed to load AP invoices', 'error')
    });
  }

  private mapInvoiceRow(x: any): any {
    const grandTotal = Number(x.grandTotal || x.GrandTotal || x.amount || x.Amount || 0);
    const paidAmount = Number(x.paidAmount || x.PaidAmount || 0);
    const debitNoteAmount = Number(x.debitNoteAmount || x.DebitNoteAmount || 0);

    const advanceAmount = Number(
      x.advanceAmount ||
      x.AdvanceAmount ||
      x.advanceAppliedAmount ||
      x.AdvanceAppliedAmount ||
      x.appliedAdvanceAmount ||
      x.AppliedAdvanceAmount ||
      0
    );

    const beforeAdvance = Math.max(grandTotal - paidAmount - debitNoteAmount, 0);
    const outstanding = Math.max(beforeAdvance - advanceAmount, 0);

    return {
      ...x,
      id: Number(x.id || x.Id || 0),
      supplierId: Number(x.supplierId || x.SupplierId || 0),
      supplierName: x.supplierName || x.SupplierName || '',
      invoiceNo: x.invoiceNo || x.InvoiceNo || '',
      invoiceDate: x.invoiceDate || x.InvoiceDate,
      dueDate: x.dueDate || x.DueDate,
      grandTotal: Number(grandTotal.toFixed(2)),
      paidAmount: Number(paidAmount.toFixed(2)),
      debitNoteAmount: Number(debitNoteAmount.toFixed(2)),
      advanceAmount: Number(advanceAmount.toFixed(2)),
      outstandingBeforeAdvance: Number(beforeAdvance.toFixed(2)),
      outstandingAmount: Number(outstanding.toFixed(2)),
      payableAfterAdvance: Number(outstanding.toFixed(2)),
      debitNoteNo: x.debitNoteNo || x.DebitNoteNo || '',
      debitNoteDate: x.debitNoteDate || x.DebitNoteDate,
      status: x.status || x.Status,
      isSelected: false
    };
  }

  private applyUtilisedAdvanceToInvoices(utilisedAdvanceMap: Map<number, number>): void {
    const grouped = new Map<number, any[]>();

    this.allInvoices.forEach(inv => {
      const supplierId = Number(inv.supplierId || 0);
      if (!grouped.has(supplierId)) grouped.set(supplierId, []);
      grouped.get(supplierId)!.push(inv);
    });

    grouped.forEach((list, supplierId) => {
      let remainingAdvance = Number(utilisedAdvanceMap.get(supplierId) || 0);

      list.forEach(inv => {
        const alreadyAdvance = Number(inv.advanceAmount || 0);

        if (alreadyAdvance > 0) {
          remainingAdvance = Number(Math.max(remainingAdvance - alreadyAdvance, 0).toFixed(2));
          return;
        }

        const beforeAdvance = Number(inv.outstandingBeforeAdvance || 0);
        const applied = Math.min(beforeAdvance, remainingAdvance);

        inv.advanceAmount = Number(applied.toFixed(2));
        inv.outstandingAmount = Number(Math.max(beforeAdvance - applied, 0).toFixed(2));
        inv.payableAfterAdvance = inv.outstandingAmount;

        remainingAdvance = Number(Math.max(remainingAdvance - applied, 0).toFixed(2));
      });
    });
  }

  calcInvoiceTotals(): void {
    this.totalInvAmount = 0;
    this.totalInvPaid = 0;
    this.totalInvDebitNote = 0;
    this.totalInvAdvance = 0;
    this.totalInvOutstanding = 0;

    this.invoices.forEach(i => {
      this.totalInvAmount += Number(i.grandTotal || 0);
      this.totalInvPaid += Number(i.paidAmount || 0);
      this.totalInvDebitNote += Number(i.debitNoteAmount || 0);
      this.totalInvAdvance += Number(i.advanceAmount || 0);
      this.totalInvOutstanding += Number(i.payableAfterAdvance || 0);
    });

    this.totalInvAmount = Number(this.totalInvAmount.toFixed(2));
    this.totalInvPaid = Number(this.totalInvPaid.toFixed(2));
    this.totalInvDebitNote = Number(this.totalInvDebitNote.toFixed(2));
    this.totalInvAdvance = Number(this.totalInvAdvance.toFixed(2));
    this.totalInvOutstanding = Number(this.totalInvOutstanding.toFixed(2));
  }

  buildSupplierGroups(): void {
    const map = new Map<number, SupplierInvoiceGroup>();

    this.invoices.forEach(inv => {
      const supplierId = Number(inv.supplierId || 0);
      if (!supplierId) return;

      if (!map.has(supplierId)) {
        map.set(supplierId, {
          supplierId,
          supplierName: inv.supplierName || '',
          totalGrandTotal: 0,
          totalPaid: 0,
          totalDebitNote: 0,
          totalAdvance: 0,
          totalPayable: 0,
          invoices: []
        });
      }

      const grp = map.get(supplierId)!;
      grp.totalGrandTotal += Number(inv.grandTotal || 0);
      grp.totalPaid += Number(inv.paidAmount || 0);
      grp.totalDebitNote += Number(inv.debitNoteAmount || 0);
      grp.totalAdvance += Number(inv.advanceAmount || 0);
      grp.totalPayable += Number(inv.payableAfterAdvance || 0);
      grp.invoices.push(inv);
    });

    this.supplierGroups = Array.from(map.values()).map(g => ({
      ...g,
      totalGrandTotal: Number(g.totalGrandTotal.toFixed(2)),
      totalPaid: Number(g.totalPaid.toFixed(2)),
      totalDebitNote: Number(g.totalDebitNote.toFixed(2)),
      totalAdvance: Number(g.totalAdvance.toFixed(2)),
      totalPayable: Number(g.totalPayable.toFixed(2))
    }));

    this.supplierGroups.sort((a, b) => a.supplierName.localeCompare(b.supplierName));
    this.expandedSupplierIds.clear();
    this.invPage = 1;
  }

  filterInvoices(event: any): void {
    const val = event?.target?.value?.toLowerCase() || '';
    this.invoiceSearch = val;

    this.invoices = !val
      ? [...this.allInvoices]
      : this.allInvoices.filter(i =>
          (i.invoiceNo || '').toLowerCase().includes(val) ||
          (i.supplierName || '').toLowerCase().includes(val)
        );

    this.calcInvoiceTotals();
    this.buildSupplierGroups();
  }

  toggleSupplierExpand(id: number): void {
    this.expandedSupplierIds.has(id)
      ? this.expandedSupplierIds.delete(id)
      : this.expandedSupplierIds.add(id);
  }

  isSupplierExpanded(id: number): boolean {
    return this.expandedSupplierIds.has(id);
  }

  getInvoiceStatusTextByAmounts(row: any): string {
    const paid = Number(row.paidAmount || 0);
    const dn = Number(row.debitNoteAmount || 0);
    const adv = Number(row.advanceAmount || 0);
    const os = Number(row.payableAfterAdvance || 0);

    if (os <= 0 && (paid > 0 || dn > 0 || adv > 0)) return 'Paid';
    if ((paid > 0 || dn > 0 || adv > 0) && os > 0) return 'Partial';
    return 'Unpaid';
  }

  getInvoiceStatusClassByAmounts(row: any): string {
    const txt = this.getInvoiceStatusTextByAmounts(row);
    if (txt === 'Paid') return 'badge-success';
    if (txt === 'Partial') return 'badge-warning';
    return 'badge-danger';
  }

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
    this.supTotalAdvance = 0;
    this.supTotalNetOutstanding = 0;
    this.supTotalPayable = 0;

    this.payInvSelectAll = false;
    this.amountEditedManually = false;
    this.payInvPage = 1;
  }

  onPaySupplierChange(): void {
    this.payAmount = 0;
    this.amountEditedManually = false;
    this.supplierInvoicesAll = [];
    this.payInvSelectAll = false;
    this.payInvPage = 1;

    this.supTotalInvoice = 0;
    this.supTotalPaid = 0;
    this.supTotalDebitNote = 0;
    this.supTotalAdvance = 0;
    this.supTotalNetOutstanding = 0;
    this.supTotalPayable = 0;

    if (!this.paySupplierId) return;

    forkJoin({
      invoices: this.apSvc.getApInvoicesBySupplier(this.paySupplierId),
      advances: this.apSvc.getSupplierAdvances()
    }).subscribe({
      next: (res: any) => {
        const invoiceRows = res.invoices?.data || res.invoices || [];
        const advanceRows = res.advances?.data || res.advances || [];

        const openAdvanceBalance = advanceRows
          .filter((a: any) => Number(a.supplierId || a.SupplierId || 0) === Number(this.paySupplierId))
          .reduce((sum: number, a: any) => sum + Number(a.balanceAmount || a.BalanceAmount || 0), 0);

        let remainingAdvance = Number(openAdvanceBalance || 0);

        this.supplierInvoicesAll = invoiceRows
          .map((x: any) => this.mapInvoiceRow(x))
          .sort(
            (a: any, b: any) =>
              new Date(a.invoiceDate).getTime() - new Date(b.invoiceDate).getTime()
          )
          .map((inv: any) => {
            const beforeAdvance = Number(inv.outstandingBeforeAdvance || 0);
            const existingAdvance = Number(inv.advanceAmount || 0);
            const extraAdvance = existingAdvance > 0 ? 0 : Math.min(beforeAdvance, remainingAdvance);

            inv.advanceAmount = Number((existingAdvance + extraAdvance).toFixed(2));
            inv.outstandingAmount = Number(
              Math.max(beforeAdvance - inv.advanceAmount, 0).toFixed(2)
            );
            inv.payableAfterAdvance = inv.outstandingAmount;

            remainingAdvance = Number(Math.max(remainingAdvance - extraAdvance, 0).toFixed(2));
            return inv;
          })
          .filter((x: any) => Number(x.outstandingBeforeAdvance || 0) > 0);

        this.supplierInvoicesAll.forEach(x => {
          this.supTotalInvoice += Number(x.grandTotal || 0);
          this.supTotalPaid += Number(x.paidAmount || 0);
          this.supTotalDebitNote += Number(x.debitNoteAmount || 0);
          this.supTotalAdvance += Number(x.advanceAmount || 0);
          this.supTotalNetOutstanding += Number(x.outstandingAmount || 0);
          this.supTotalPayable += Number(x.payableAfterAdvance || 0);
        });

        this.supTotalInvoice = Number(this.supTotalInvoice.toFixed(2));
        this.supTotalPaid = Number(this.supTotalPaid.toFixed(2));
        this.supTotalDebitNote = Number(this.supTotalDebitNote.toFixed(2));
        this.supTotalAdvance = Number(this.supTotalAdvance.toFixed(2));
        this.supTotalNetOutstanding = Number(this.supTotalNetOutstanding.toFixed(2));
        this.supTotalPayable = Number(this.supTotalPayable.toFixed(2));

        this.recalcBankBalanceAfterPayment();
      },
      error: () => Swal.fire('Error', 'Failed to load supplier invoices', 'error')
    });
  }

  onSelectAllInvoicesChange(checked: boolean): void {
    this.payInvSelectAll = checked;
    this.supplierInvoicesAll.forEach(x => (x.isSelected = checked));
    this.amountEditedManually = false;
    this.recalcSelectedAmount();
  }

  onInvoiceCheckboxChange(inv: any, checked: boolean): void {
    inv.isSelected = checked;

    this.payInvSelectAll =
      this.supplierInvoicesAll.length > 0 &&
      this.supplierInvoicesAll.every(x => x.isSelected);

    this.amountEditedManually = false;
    this.recalcSelectedAmount();
  }

  recalcSelectedAmount(): void {
    if (this.amountEditedManually) return;

    let total = 0;
    this.supplierInvoicesAll.forEach(x => {
      if (x.isSelected) total += Number(x.payableAfterAdvance || 0);
    });

    this.payAmount = Number(total.toFixed(2));
    this.recalcBankBalanceAfterPayment();
  }

  onBankChange(): void {
    const bank = this.bankAccounts.find((x: any) =>
      Number(x.id || x.bankId || x.BankId) === Number(this.selectedBankId)
    );

    this.bankAvailableBalance = Number(bank?.availableBalance || bank?.AvailableBalance || 0);
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

  onAmountInputChange(): void {
    this.amountEditedManually = true;
    this.recalcBankBalanceAfterPayment();
  }

  recalcBankBalanceAfterPayment(): void {
    if (this.bankAvailableBalance == null) {
      this.bankBalanceAfterPayment = null;
      return;
    }

    this.bankBalanceAfterPayment =
      Number(this.bankAvailableBalance || 0) - Number(this.payAmount || 0);
  }

  postPayment(): void {
    if (!this.paySupplierId) {
      Swal.fire('Warning', 'Select supplier', 'warning');
      return;
    }

    const selected = this.supplierInvoicesAll.filter(x => x.isSelected);

    if (selected.length === 0) {
      Swal.fire('Warning', 'Select at least one invoice', 'warning');
      return;
    }

    const selectedAdvanceTotal = selected.reduce(
      (sum, x) => sum + Number(x.advanceAmount || 0),
      0
    );

    if ((!this.payAmount || this.payAmount <= 0) && selectedAdvanceTotal <= 0) {
      Swal.fire('Warning', 'Amount is zero', 'warning');
      return;
    }

    if (
      Number(this.payAmount || 0) > 0 &&
      (this.payMethodId === 2 || this.payMethodId === 3) &&
      !this.selectedBankId
    ) {
      Swal.fire('Warning', 'Select Bank Account', 'warning');
      return;
    }

    const requests =
      selected.length === 1
        ? [
            this.apSvc.createPayment({
              supplierInvoiceId: selected[0].id,
              supplierId: this.paySupplierId,
              paymentDate: this.payDate,
              paymentMethodId: this.payMethodId,
              referenceNo: this.payReference,
              amount: Number(this.payAmount || 0),
              advanceAppliedAmount: Number(selected[0].advanceAmount || 0),
              notes: this.payNotes,
              bankAccountId: this.selectedBankId,
              bankId: this.selectedBankId,
              createdBy: this.userId,
              countryId: Number(localStorage.getItem('countryId') || 1)
            })
          ]
        : selected.map(inv =>
            this.apSvc.createPayment({
              supplierInvoiceId: inv.id,
              supplierId: this.paySupplierId,
              paymentDate: this.payDate,
              paymentMethodId: this.payMethodId,
              referenceNo: this.payReference,
              amount: Number(inv.payableAfterAdvance || 0),
              advanceAppliedAmount: Number(inv.advanceAmount || 0),
              notes: this.payNotes,
              bankAccountId: this.selectedBankId,
              bankId: this.selectedBankId,
              createdBy: this.userId,
              countryId: Number(localStorage.getItem('countryId') || 1)
            })
          );

    forkJoin(requests).subscribe({
      next: (results: any[]) => {
        const allOk = results.every(r => r?.isSuccess !== false);

        if (!allOk) {
          const err = results.find(r => r?.isSuccess === false);
          Swal.fire('Warning', err?.message || 'Some payments failed', 'warning');
          return;
        }

        const cashPaid = Number(this.payAmount || 0);
        const selectedPayableTotal = selected.reduce(
          (sum, x) => sum + Number(x.payableAfterAdvance || 0),
          0
        );

        Swal.fire({
          icon: 'success',
          title: 'Payment Posted',
          html: `
            <div style="text-align:left;font-size:14px;line-height:1.7">
              <p>Supplier payment posted successfully.</p>
              <hr/>
              <p>Advance Adjusted: <b>${selectedAdvanceTotal.toFixed(2)}</b></p>
              <p>Cash / Bank Paid: <b>${cashPaid.toFixed(2)}</b></p>
              <p>Total Cleared: <b>${(selectedAdvanceTotal + cashPaid).toFixed(2)}</b></p>
              <p>Balance Payable: <b>${Math.max(selectedPayableTotal - cashPaid, 0).toFixed(2)}</b></p>
            </div>
          `
        });

        if (this.selectedBankId && this.bankBalanceAfterPayment != null) {
          this.apSvc.updateBankBalance({
            bankHeadId: this.selectedBankId,
            newBalance: this.bankBalanceAfterPayment
          }).subscribe({ error: () => {} });

          this.loadBankAccounts();
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
    this.payDate = new Date().toISOString().substring(0, 10);
    this.payMethodId = 2;
    this.payReference = '';
    this.payAmount = 0;
    this.payNotes = '';
    this.amountEditedManually = false;
    this.selectedBankId = null;
    this.bankAvailableBalance = null;
    this.bankBalanceAfterPayment = null;
  }

  getPaymentMethodName(id?: number): string {
    switch (Number(id || 0)) {
      case 1:
        return 'Cash';
      case 2:
        return 'Bank Transfer';
      case 3:
        return 'Cheque';
      case 4:
        return 'Other';
      default:
        return 'Other';
    }
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

  loadAdvances(): void {
    this.apSvc.getSupplierAdvances().subscribe({
      next: (res: any) => {
        const rows = res?.data || res || [];

        this.supplierAdvances = rows.map((a: any) => ({
          id: Number(a.id || a.Id || 0),
          advanceNo: a.advanceNo || a.AdvanceNo || '',
          supplierId: Number(a.supplierId || a.SupplierId || 0),
          supplierName: a.supplierName || a.SupplierName || '',
          advanceDate: a.advanceDate || a.AdvanceDate,
          originalAmount: Number(a.originalAmount || a.OriginalAmount || 0),
          utilisedAmount: Number(a.utilisedAmount || a.UtilisedAmount || 0),
          balanceAmount: Number(a.balanceAmount || a.BalanceAmount || 0)
        }));

        this.advPage = 1;
        this.totalAdvanceAmount = 0;
        this.totalAdvanceUtilised = 0;
        this.totalAdvanceBalance = 0;

        this.supplierAdvances.forEach(a => {
          this.totalAdvanceAmount += Number(a.originalAmount || 0);
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
    this.router.navigate(['/financial/ap-advance']);
  }

  loadMatch(): void {
    this.apSvc.getMatchList().subscribe({
      next: (res: any) => {
        const rows = res?.data || res || [];

        this.matchRows = rows.map((x: any) => {
          const poAmount = Number(x.poAmount || x.PoAmount || x.poAmt || x.PoAmt || 0);
          const invoiceAmount = Number(
            x.invoiceAmount || x.InvoiceAmount || x.invoiceAmt || x.InvoiceAmt || 0
          );

          const status =
            Math.abs(poAmount - invoiceAmount) <= 0.01 && poAmount > 0
              ? 'Matched'
              : x.status || x.Status || 'Mismatch';

          return {
            ...x,
            poNo: x.poNo || x.PoNo || x.purchaseOrderNo || x.PurchaseOrderNo || '',
            grnNo: x.grnNo || x.GrnNo || x.goodsReceiptNo || x.GoodsReceiptNo || '',
            invoiceNo: x.invoiceNo || x.InvoiceNo || '',
            supplierName: x.supplierName || x.SupplierName || '',
            poAmount,
            invoiceAmount,
            status
          };
        });

        this.matchPage = 1;
      },
      error: () => Swal.fire('Error', 'Failed to load match list', 'error')
    });
  }

  matchStatusClass(status: string): string {
    if (!status) return 'badge-secondary';
    const s = status.toLowerCase();
    if (s === 'matched') return 'badge-success';
    if (s === 'warning') return 'badge-warning';
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
}