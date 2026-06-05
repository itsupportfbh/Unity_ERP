import {
  Component,
  OnInit,
  AfterViewInit,
  ViewEncapsulation
} from '@angular/core';
import { forkJoin } from 'rxjs';
import Swal from 'sweetalert2';
import * as feather from 'feather-icons';
import * as XLSX from 'xlsx';

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
  currencyName: string;
  fxRate: number;
  amountBase: number;
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

  totalInvAmount      = 0;
  totalInvPaid        = 0;
  totalInvDebitNote   = 0;
  totalInvAdvance     = 0;
  totalInvOutstanding = 0;

  supplierGroups: SupplierInvoiceGroup[] = [];
  expandedSupplierIds = new Set<number>();

  invPage     = 1;
  invPageSize = 10;

  payments: any[]  = [];
  showPaymentForm  = false;
  payListPage      = 1;
  payListPageSize  = 10;

  paySupplierId: number | null = null;
  supplierInvoicesAll: any[]   = [];
  payInvPage     = 1;
  payInvPageSize = 10;

  payDate      = '';
  payMethodId  = 2;
  payReference = '';
  payAmount    = 0;
  payNotes     = '';
  payInvSelectAll      = false;
  amountEditedManually = false;

  supTotalInvoice        = 0;
  supTotalPaid           = 0;
  supTotalDebitNote      = 0;
  supTotalAdvance        = 0;
  supTotalNetOutstanding = 0;
  supTotalPayable        = 0;

  // ✅ Payment Currency + FxRate
  payFxRate:           number  = 1;
  payAmountBase:       number  = 0;
  payExchangeGainLoss: number  = 0;
  payCurrencyName:     string  = '';
  paymentCurrencyId:   number  = 0;
  paymentCurrencyName: string  = 'SGD';
  availableCurrencies: any[]   = [];
  fxRateLoading:       boolean = false;

  // Invoice currency (reference only)
  invoiceCurrencyId:   number = 0;
  invoiceCurrencyName: string = '';
  invoiceFxRate:       number = 1;

  supplierAdvances:      SupplierAdvanceRow[] = [];
  pagedSupplierAdvances: SupplierAdvanceRow[] = [];
  advPage     = 1;
  advPageSize = 10;

  totalAdvanceAmount   = 0;
  totalAdvanceUtilised = 0;
  totalAdvanceBalance  = 0;

  matchRows: any[] = [];
  matchPage        = 1;
  matchPageSize    = 10;

  isPeriodLocked    = false;
  currentPeriodName = '';
  userId: any;
  Math = Math;

  functionId         = 'ap';
  permission:        FunctionPermission;
  isPermissionLoaded = false;
  isPageLoading      = false;
  periodName         = '';

  // =====================================================
// ✅ AP AGING PROPERTIES
// =====================================================
agingRows:         any[] = [];
agingFilteredRows: any[] = [];
agingDetailRows:   any[] = [];

agingFromDate = '';
agingToDate   = '';

agingIsLoading    = false;
agingIsDetailOpen = false;
agingSelectedSupplierName  = '';
agingSelectedSupplierId:   number | null = null;
agingSelectedSupplierFilter: number | null = null;

// SGD totals
agingTotalBase   = 0;
aging0_30Base    = 0;
aging31_60Base   = 0;
aging61_90Base   = 0;
aging90PlusBase  = 0;

// Detail totals
agingDetailOriginal    = 0;
agingDetailPaid        = 0;
agingDetailBalance     = 0;
agingDetailBalanceBase = 0;
  constructor(
    private apSvc: AccountsPayableService,
    private supplierSvc: SupplierService,
    public router: Router,
    private permissionService: PermissionService
  ) {
    this.payDate    = new Date().toISOString().substring(0, 10);
    this.userId     = Number(localStorage.getItem('id'));
    this.permission = this.permissionService.getEmptyPermission(this.functionId);
  }

 ngOnInit(): void {
  // ✅ Aging dates init
  const today        = new Date();
  this.agingToDate   = today.toISOString().substring(0, 10);
  const first        = new Date(today.getFullYear(), today.getMonth(), 1);
  this.agingFromDate = first.toISOString().substring(0, 10);

  // existing...
  this.checkPeriodLockForDate(this.payDate);
  this.loadSuppliers();
  this.loadBankAccounts();
  this.loadPermission();
  this.loadCurrencies();
}

  ngAfterViewInit(): void {
    feather.replace();
  }

  getBaseCurrencyId(): number {
    return Number(localStorage.getItem('companyCurrencyId') || 0);
  }

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
    const baseCurrId = this.getBaseCurrencyId();
    const base = this.availableCurrencies.find(
      c => Number(c.id || c.Id) === baseCurrId
    );
    this.paymentCurrencyId   = baseCurrId;
    this.paymentCurrencyName = base?.currencyName || base?.CurrencyName || 'SGD';
    this.payCurrencyName     = this.paymentCurrencyName;
    this.payFxRate           = 1;
  }

  onPaymentCurrencyChange(): void {
    const sel = this.availableCurrencies.find(
      c => Number(c.id || c.Id) === Number(this.paymentCurrencyId)
    );
    if (!sel) return;

    this.paymentCurrencyName = sel.currencyName || sel.CurrencyName || '';
    this.payCurrencyName     = this.paymentCurrencyName;

    const baseCurrId = this.getBaseCurrencyId();
    if (Number(this.paymentCurrencyId) === baseCurrId) {
      this.payFxRate = 1;
      // ✅ SGD select → INR amounts re-convert
      this.amountEditedManually = false;
      this.recalcSelectedAmount();
    } else {
      this.fetchPaymentFxRate();
    }
  }

  fetchPaymentFxRate(): void {
    const baseCurrId = this.getBaseCurrencyId();
    if (!baseCurrId || !this.paymentCurrencyId) return;

    this.fxRateLoading = true;
    const today = new Date().toISOString().substring(0, 10);

    this.apSvc.getExchangeRate(
      this.paymentCurrencyId,
      baseCurrId,
      today
    ).subscribe({
      next: (res: any) => {
        this.fxRateLoading = false;
        if (res?.isSuccess && res?.data?.rate) {
          this.payFxRate = Number(res.data.rate);
        } else {
          this.payFxRate = Number(this.invoiceFxRate || 1);
        }
        this.amountEditedManually = false;
        this.recalcSelectedAmount();
      },
      error: () => {
        this.fxRateLoading = false;
        this.payFxRate = Number(this.invoiceFxRate || 1);
        this.recalcSelectedAmount();
      }
    });
  }

  loadPermission(): void {
    if (!this.userId || this.userId <= 0) {
      this.permission         = this.permissionService.getEmptyPermission(this.functionId);
      this.isPermissionLoaded = true;
      Swal.fire({ icon: 'warning', title: 'Access Denied',
        text: 'User not found. Please login again.', confirmButtonColor: '#0e3a4c' });
      return;
    }

    this.isPageLoading = true;
    this.permissionService.getFunctionPermission(this.userId, this.functionId).subscribe({
      next: (res: FunctionPermission) => {
        this.permission         = res || this.permissionService.getEmptyPermission(this.functionId);
        this.isPermissionLoaded = true;
        this.isPageLoading      = false;
        if (!this.canView()) {
          this.invoices = []; this.allInvoices = []; this.supplierGroups = [];
          Swal.fire('Access Denied', 'You do not have view permission.', 'warning');
          return;
        }
        this.setTab('invoices');
      },
      error: () => {
        this.permission         = this.permissionService.getEmptyPermission(this.functionId);
        this.isPermissionLoaded = true;
        this.isPageLoading      = false;
        Swal.fire('Error', 'Unable to load permission.', 'error');
      }
    });
  }

  canView():    boolean { return this.permissionService.hasView(this.permission); }
  canCreate():  boolean { return this.permissionService.hasCreate(this.permission); }
  canEdit():    boolean { return this.permissionService.hasEdit(this.permission); }
  canDelete():  boolean { return this.permissionService.hasDelete(this.permission); }
  canApprove(): boolean { return this.permissionService.hasApprove(this.permission); }

setTab(tab: ApTab): void {
  this.activeTab = tab;
  if (tab === 'invoices') this.loadInvoices();
  if (tab === 'payments') {
    this.showPaymentForm = false;
    this.loadPayments();
    this.cancelPayment();
  }
  if (tab === 'match')    this.loadMatch();
  if (tab === 'advances') this.loadAdvances();
  // ✅ add
  if (tab === 'aging')    this.loadAgingSummary();
}
// =====================================================
// ✅ AP AGING METHODS
// =====================================================
loadAgingSummary(): void {
  this.agingIsLoading = true;

  this.apSvc.getApAgingSummary(this.agingFromDate, this.agingToDate).subscribe({
    next: (res: any) => {
      this.agingRows      = Array.isArray(res) ? res : (res?.data || []);
      this.agingIsLoading = false;
      this.applyAgingFilter();
    },
    error: () => {
      this.agingIsLoading   = false;
      this.agingRows        = [];
      this.agingFilteredRows = [];
      this.recalcAgingTotals();
    }
  });
}

applyAgingFilter(): void {
  this.agingFilteredRows = this.agingSelectedSupplierFilter == null
    ? this.agingRows
    : this.agingRows.filter(r => r.supplierId === this.agingSelectedSupplierFilter);
  this.recalcAgingTotals();
}

recalcAgingTotals(): void {
  const src = this.agingFilteredRows || [];
  this.agingTotalBase  = src.reduce((s,r) => s + (r.totalOutstandingBase ?? 0), 0);
  this.aging0_30Base   = src.reduce((s,r) => s + (r.bucket0_30Base       ?? 0), 0);
  this.aging31_60Base  = src.reduce((s,r) => s + (r.bucket31_60Base      ?? 0), 0);
  this.aging61_90Base  = src.reduce((s,r) => s + (r.bucket61_90Base      ?? 0), 0);
  this.aging90PlusBase = src.reduce((s,r) => s + (r.bucket90PlusBase     ?? 0), 0);
}

onAgingFilterChange(): void {
  this.loadAgingSummary();
  this.agingIsDetailOpen = false;
  this.agingDetailRows   = [];
}

onAgingSupplierFilterChange(): void {
  this.applyAgingFilter();
  this.agingIsDetailOpen = false;
  this.agingDetailRows   = [];
}

openAgingDetail(row: any): void {
  this.agingSelectedSupplierName = row.supplierName;
  this.agingSelectedSupplierId   = row.supplierId;
  this.agingIsDetailOpen         = true;

  this.apSvc.getApAgingDetail(
    row.supplierId,
    this.agingFromDate,
    this.agingToDate
  ).subscribe({
    next: (res: any) => {
      this.agingDetailRows = Array.isArray(res) ? res : (res?.data || []);
      this.recalcAgingDetailTotals();
    },
    error: () => { this.agingDetailRows = []; }
  });
}

closeAgingDetail(): void {
  this.agingIsDetailOpen         = false;
  this.agingDetailRows           = [];
  this.agingSelectedSupplierId   = null;
  this.agingDetailOriginal       = 0;
  this.agingDetailPaid           = 0;
  this.agingDetailBalance        = 0;
  this.agingDetailBalanceBase    = 0;
}

recalcAgingDetailTotals(): void {
  const src = this.agingDetailRows || [];
  this.agingDetailOriginal    = src.reduce((s,d) => s + (d.originalAmount ?? 0), 0);
  this.agingDetailPaid        = src.reduce((s,d) => s + (d.paidAmount     ?? 0), 0);
  this.agingDetailBalance     = src.reduce((s,d) => s + (d.balance        ?? 0), 0);
  this.agingDetailBalanceBase = src.reduce((s,d) => s + (d.balanceBase    ?? 0), 0);
}

exportAgingToExcel(): void {
  const data = (this.agingFilteredRows || []).map((r, i) => ({
    'Sl.No':       i + 1,
    'Supplier':    r.supplierName,
    '0-30 (SGD)':  +(r.bucket0_30Base   ?? 0).toFixed(2),
    '31-60 (SGD)': +(r.bucket31_60Base  ?? 0).toFixed(2),
    '61-90 (SGD)': +(r.bucket61_90Base  ?? 0).toFixed(2),
    '90+ (SGD)':   +(r.bucket90PlusBase ?? 0).toFixed(2),
    'Total (SGD)': +(r.totalOutstandingBase ?? 0).toFixed(2)
  }));
  if (!data.length) return;

  const ws = XLSX.utils.json_to_sheet(data);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'AP Aging');
  XLSX.writeFile(wb, `AP-Aging-${this.agingFromDate}-to-${this.agingToDate}.xlsx`);
}

  loadSuppliers(): void {
    this.supplierSvc.GetAllSupplier().subscribe({
      next: (res: any) => {
        const raw = res?.data || res || [];
        this.suppliers = raw.map((s: any) => ({
          id:   Number(s.id || s.Id || 0),
          name: s.name || s.supplierName || s.SupplierName || s.Name || ''
        }));
      },
      error: () => Swal.fire('Error', 'Failed to load suppliers', 'error')
    });
  }

  loadBankAccounts(): void {
    this.apSvc.getBankAccounts().subscribe({
      next: (res: any) => { this.bankAccounts = res?.data || res || []; },
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
          const sid      = Number(a.supplierId || a.SupplierId || 0);
          const original = Number(a.originalAmount || a.OriginalAmount || 0);
          const utilised = Number(a.utilisedAmount || a.UtilisedAmount || 0);
          const balance  = Number(a.balanceAmount  || a.BalanceAmount  || 0);
          const applied  = utilised > 0 ? utilised : Math.max(original - balance, 0);
          if (sid > 0 && applied > 0) {
            utilisedAdvanceMap.set(sid,
              Number(((utilisedAdvanceMap.get(sid) || 0) + applied).toFixed(2)));
          }
        });

        this.allInvoices = invoiceRows
          .map((x: any) => this.mapInvoiceRow(x))
          .sort((a: any, b: any) =>
            new Date(a.invoiceDate).getTime() - new Date(b.invoiceDate).getTime());

        this.applyUtilisedAdvanceToInvoices(utilisedAdvanceMap);
        this.invoices = [...this.allInvoices];
        this.calcInvoiceTotals();
        this.buildSupplierGroups();
      },
      error: () => Swal.fire('Error', 'Failed to load AP invoices', 'error')
    });
  }

  private mapInvoiceRow(x: any): any {
    const grandTotal      = Number(x.grandTotal || x.GrandTotal || x.amount || x.Amount || 0);
    const paidAmount      = Number(x.paidAmount || x.PaidAmount || 0);
    const debitNoteAmount = Number(x.debitNoteAmount || x.DebitNoteAmount || 0);
    const advanceAmount   = Number(x.advanceAmount || x.AdvanceAmount ||
      x.advanceAppliedAmount || x.AdvanceAppliedAmount || 0);
    const beforeAdvance   = Math.max(grandTotal - paidAmount - debitNoteAmount, 0);
    const outstanding     = Math.max(beforeAdvance - advanceAmount, 0);

    return {
      ...x,
      id:                       Number(x.id || x.Id || 0),
      supplierId:               Number(x.supplierId || x.SupplierId || 0),
      supplierName:             x.supplierName || x.SupplierName || '',
      invoiceNo:                x.invoiceNo    || x.InvoiceNo    || '',
      invoiceDate:              x.invoiceDate  || x.InvoiceDate,
      dueDate:                  x.dueDate      || x.DueDate,
      grandTotal:               Number(grandTotal.toFixed(2)),
      paidAmount:               Number(paidAmount.toFixed(2)),
      debitNoteAmount:          Number(debitNoteAmount.toFixed(2)),
      advanceAmount:            Number(advanceAmount.toFixed(2)),
      outstandingBeforeAdvance: Number(beforeAdvance.toFixed(2)),
      outstandingAmount:        Number(outstanding.toFixed(2)),
      payableAfterAdvance:      Number(outstanding.toFixed(2)),
      debitNoteNo:              x.debitNoteNo   || x.DebitNoteNo  || '',
      debitNoteDate:            x.debitNoteDate || x.DebitNoteDate,
      status:                   x.status        || x.Status,
      fxRate:       Number(x.fxRate       ?? x.FxRate       ?? 1),
      currencyId:   Number(x.currencyId   ?? x.CurrencyId   ?? 0),
      currencyName: x.currencyName        ?? x.CurrencyName  ?? '',
      amountBase:   Number(x.amountBase   ?? x.AmountBase   ?? 0),
      isSelected: false
    };
  }

  private applyUtilisedAdvanceToInvoices(utilisedAdvanceMap: Map<number, number>): void {
    const grouped = new Map<number, any[]>();
    this.allInvoices.forEach(inv => {
      const sid = Number(inv.supplierId || 0);
      if (!grouped.has(sid)) grouped.set(sid, []);
      grouped.get(sid)!.push(inv);
    });

    grouped.forEach((list) => {
      list.forEach(inv => {
        const sid            = Number(inv.supplierId || 0);
        const remaining      = Number(utilisedAdvanceMap.get(sid) || 0);
        const alreadyAdvance = Number(inv.advanceAmount || 0);

        if (alreadyAdvance > 0) {
          utilisedAdvanceMap.set(sid,
            Number(Math.max(remaining - alreadyAdvance, 0).toFixed(2)));
          return;
        }

        const before  = Number(inv.outstandingBeforeAdvance || 0);
        const applied = Math.min(before, remaining);
        inv.advanceAmount       = Number(applied.toFixed(2));
        inv.outstandingAmount   = Number(Math.max(before - applied, 0).toFixed(2));
        inv.payableAfterAdvance = inv.outstandingAmount;
        utilisedAdvanceMap.set(sid,
          Number(Math.max(remaining - applied, 0).toFixed(2)));
      });
    });
  }

  calcInvoiceTotals(): void {
    this.totalInvAmount = this.totalInvPaid = this.totalInvDebitNote =
    this.totalInvAdvance = this.totalInvOutstanding = 0;

    this.invoices.forEach(i => {
      this.totalInvAmount      += Number(i.grandTotal          || 0);
      this.totalInvPaid        += Number(i.paidAmount          || 0);
      this.totalInvDebitNote   += Number(i.debitNoteAmount     || 0);
      this.totalInvAdvance     += Number(i.advanceAmount       || 0);
      this.totalInvOutstanding += Number(i.payableAfterAdvance || 0);
    });

    this.totalInvAmount      = Number(this.totalInvAmount.toFixed(2));
    this.totalInvPaid        = Number(this.totalInvPaid.toFixed(2));
    this.totalInvDebitNote   = Number(this.totalInvDebitNote.toFixed(2));
    this.totalInvAdvance     = Number(this.totalInvAdvance.toFixed(2));
    this.totalInvOutstanding = Number(this.totalInvOutstanding.toFixed(2));
  }

  buildSupplierGroups(): void {
    const map = new Map<number, SupplierInvoiceGroup>();

    this.invoices.forEach(inv => {
      const sid = Number(inv.supplierId || 0);
      if (!sid) return;
      if (!map.has(sid)) {
        map.set(sid, { supplierId: sid, supplierName: inv.supplierName || '',
          totalGrandTotal: 0, totalPaid: 0, totalDebitNote: 0,
          totalAdvance: 0, totalPayable: 0, invoices: [] });
      }
      const g = map.get(sid)!;
      g.totalGrandTotal += Number(inv.grandTotal          || 0);
      g.totalPaid       += Number(inv.paidAmount          || 0);
      g.totalDebitNote  += Number(inv.debitNoteAmount     || 0);
      g.totalAdvance    += Number(inv.advanceAmount       || 0);
      g.totalPayable    += Number(inv.payableAfterAdvance || 0);
      g.invoices.push(inv);
    });

    this.supplierGroups = Array.from(map.values()).map(g => ({
      ...g,
      totalGrandTotal: Number(g.totalGrandTotal.toFixed(2)),
      totalPaid:       Number(g.totalPaid.toFixed(2)),
      totalDebitNote:  Number(g.totalDebitNote.toFixed(2)),
      totalAdvance:    Number(g.totalAdvance.toFixed(2)),
      totalPayable:    Number(g.totalPayable.toFixed(2))
    }));

    this.supplierGroups.sort((a, b) => a.supplierName.localeCompare(b.supplierName));
    this.expandedSupplierIds.clear();
    this.invPage = 1;
  }

  filterInvoices(event: any): void {
    const val = event?.target?.value?.toLowerCase() || '';
    this.invoiceSearch = val;
    this.invoices = !val ? [...this.allInvoices]
      : this.allInvoices.filter(i =>
          (i.invoiceNo || '').toLowerCase().includes(val) ||
          (i.supplierName || '').toLowerCase().includes(val));
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
    const paid = Number(row.paidAmount          || 0);
    const dn   = Number(row.debitNoteAmount     || 0);
    const adv  = Number(row.advanceAmount       || 0);
    const os   = Number(row.payableAfterAdvance || 0);
    if (os <= 0 && (paid > 0 || dn > 0 || adv > 0)) return 'Paid';
    if ((paid > 0 || dn > 0 || adv > 0) && os > 0)  return 'Partial';
    return 'Unpaid';
  }

  getInvoiceStatusClassByAmounts(row: any): string {
    const t = this.getInvoiceStatusTextByAmounts(row);
    if (t === 'Paid')    return 'badge-success';
    if (t === 'Partial') return 'badge-warning';
    return 'badge-danger';
  }

  get invTotalPages(): number {
    return Math.max(1, Math.ceil(this.supplierGroups.length / this.invPageSize));
  }

  get pagedSupplierGroups(): SupplierInvoiceGroup[] {
    const s = (this.invPage - 1) * this.invPageSize;
    return this.supplierGroups.slice(s, s + this.invPageSize);
  }

  invGoToPage(p: number): void {
    if (p < 1 || p > this.invTotalPages) return;
    this.invPage = p;
  }

  loadPayments(): void {
    this.apSvc.getPayments().subscribe({
      next: (res: any) => { this.payments = res?.data || res || []; this.payListPage = 1; },
      error: () => Swal.fire('Error', 'Failed to load payments', 'error')
    });
  }

  openNewPayment(): void { this.showPaymentForm = true; this.cancelPayment(); }
  backToPaymentList(): void { this.showPaymentForm = false; this.cancelPayment(); }
  cancelPaymentForm(): void { this.cancelPayment(); }

  cancelPayment(): void {
    this.resetPaymentForm();
    this.paySupplierId          = null;
    this.supplierInvoicesAll    = [];
    this.supTotalInvoice        = 0;
    this.supTotalPaid           = 0;
    this.supTotalDebitNote      = 0;
    this.supTotalAdvance        = 0;
    this.supTotalNetOutstanding = 0;
    this.supTotalPayable        = 0;
    this.payInvSelectAll        = false;
    this.amountEditedManually   = false;
    this.payInvPage             = 1;
    this.invoiceCurrencyId      = 0;
    this.invoiceCurrencyName    = '';
    this.invoiceFxRate          = 1;
  }

  onPaySupplierChange(): void {
    this.payAmount              = 0;
    this.amountEditedManually   = false;
    this.supplierInvoicesAll    = [];
    this.payInvSelectAll        = false;
    this.payInvPage             = 1;
    this.supTotalInvoice        = 0;
    this.supTotalPaid           = 0;
    this.supTotalDebitNote      = 0;
    this.supTotalAdvance        = 0;
    this.supTotalNetOutstanding = 0;
    this.supTotalPayable        = 0;
    this.invoiceCurrencyId      = 0;
    this.invoiceCurrencyName    = '';
    this.invoiceFxRate          = 1;

    this.setDefaultPaymentCurrency();
    if (!this.paySupplierId) return;

    forkJoin({
      invoices: this.apSvc.getApInvoicesBySupplier(this.paySupplierId),
      advances: this.apSvc.getSupplierAdvances()
    }).subscribe({
      next: (res: any) => {
        const invoiceRows = res.invoices?.data || res.invoices || [];
        const advanceRows = res.advances?.data || res.advances || [];

        const openAdvanceBalance = advanceRows
          .filter((a: any) =>
            Number(a.supplierId || a.SupplierId || 0) === Number(this.paySupplierId))
          .reduce((sum: number, a: any) =>
            sum + Number(a.balanceAmount || a.BalanceAmount || 0), 0);

        let remainingAdvance = Number(openAdvanceBalance || 0);

        this.supplierInvoicesAll = invoiceRows
          .map((x: any) => this.mapInvoiceRow(x))
          .sort((a: any, b: any) =>
            new Date(a.invoiceDate).getTime() - new Date(b.invoiceDate).getTime())
          .map((inv: any) => {
            const before   = Number(inv.outstandingBeforeAdvance || 0);
            const existing = Number(inv.advanceAmount || 0);
            const extra    = existing > 0 ? 0 : Math.min(before, remainingAdvance);
            inv.advanceAmount       = Number((existing + extra).toFixed(2));
            inv.outstandingAmount   = Number(Math.max(before - inv.advanceAmount, 0).toFixed(2));
            inv.payableAfterAdvance = inv.outstandingAmount;
            remainingAdvance        = Number(Math.max(remainingAdvance - extra, 0).toFixed(2));
            return inv;
          })
          .filter((x: any) => Number(x.outstandingBeforeAdvance || 0) > 0);

        this.supplierInvoicesAll.forEach(x => {
          this.supTotalInvoice        += Number(x.grandTotal          || 0);
          this.supTotalPaid           += Number(x.paidAmount          || 0);
          this.supTotalDebitNote      += Number(x.debitNoteAmount     || 0);
          this.supTotalAdvance        += Number(x.advanceAmount       || 0);
          this.supTotalNetOutstanding += Number(x.outstandingAmount   || 0);
          this.supTotalPayable        += Number(x.payableAfterAdvance || 0);
        });

        this.supTotalInvoice        = Number(this.supTotalInvoice.toFixed(2));
        this.supTotalPaid           = Number(this.supTotalPaid.toFixed(2));
        this.supTotalDebitNote      = Number(this.supTotalDebitNote.toFixed(2));
        this.supTotalAdvance        = Number(this.supTotalAdvance.toFixed(2));
        this.supTotalNetOutstanding = Number(this.supTotalNetOutstanding.toFixed(2));
        this.supTotalPayable        = Number(this.supTotalPayable.toFixed(2));

        // ✅ Invoice currency store
        const first              = this.supplierInvoicesAll[0];
        this.invoiceCurrencyId   = Number(first?.currencyId   || 0);
        this.invoiceCurrencyName = first?.currencyName        || '';
        this.invoiceFxRate       = Number(first?.fxRate       || 1);

        // ✅ Default SGD payment
        this.setDefaultPaymentCurrency();
        this.recalcPaymentBase();
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
    this.payInvSelectAll = this.supplierInvoicesAll.length > 0 &&
      this.supplierInvoicesAll.every(x => x.isSelected);
    this.amountEditedManually = false;
    this.recalcSelectedAmount();
  }

  // ✅ KEY FIX: INR → SGD convert பண்ணு
  recalcSelectedAmount(): void {
    if (this.amountEditedManually) return;

    const baseCurrId  = this.getBaseCurrencyId();
    const isBaseCurr  = Number(this.paymentCurrencyId) === baseCurrId;

    let totalSGD = 0;
    let totalINR = 0;

    this.supplierInvoicesAll.forEach(x => {
      if (!x.isSelected) return;
      const payable = Number(x.payableAfterAdvance || 0);
      const fx      = Number(x.fxRate || this.invoiceFxRate || 1);

      if (isBaseCurr) {
        // ✅ SGD pay → INR amount × fxRate = SGD
        totalSGD += payable * fx;
      } else {
        // ✅ INR pay → INR amount as-is
        totalINR += payable;
      }
    });

    this.payAmount = isBaseCurr
      ? Number(totalSGD.toFixed(2))
      : Number(totalINR.toFixed(2));

    this.recalcBankBalanceAfterPayment();
    this.recalcPaymentBase();
  }

  onBankChange(): void {
    const bank = this.bankAccounts.find((x: any) =>
      Number(x.id || x.bankId || x.BankId) === Number(this.selectedBankId));
    this.bankAvailableBalance = Number(bank?.availableBalance || bank?.AvailableBalance || 0);
    this.recalcBankBalanceAfterPayment();
  }

  onMethodChange(): void {
    if (this.payMethodId === 2 || this.payMethodId === 3) {
      this.onBankChange();
    } else {
      this.selectedBankId          = null;
      this.bankAvailableBalance    = null;
      this.bankBalanceAfterPayment = null;
    }
  }

  onAmountInputChange(): void {
    this.amountEditedManually = true;
    this.recalcBankBalanceAfterPayment();
    this.recalcPaymentBase();
  }

  recalcBankBalanceAfterPayment(): void {
    if (this.bankAvailableBalance == null) {
      this.bankBalanceAfterPayment = null; return;
    }
    this.bankBalanceAfterPayment =
      Number(this.bankAvailableBalance || 0) - Number(this.payAmount || 0);
  }

  recalcPaymentBase(): void {
    const fx  = Number(this.payFxRate || 1);
    const amt = Number(this.payAmount || 0);
    const baseCurrId = this.getBaseCurrencyId();

    if (Number(this.paymentCurrencyId) === baseCurrId) {
      // SGD pay → base = amount (1:1)
      this.payAmountBase       = amt;
      this.payExchangeGainLoss = 0;
      return;
    }

    // Foreign currency
    this.payAmountBase = +(amt * fx).toFixed(2);

    const invFx = Number(this.invoiceFxRate || 1);
    if (
      this.invoiceCurrencyId === Number(this.paymentCurrencyId) &&
      Math.abs(invFx - fx) > 0.000001 &&
      amt > 0
    ) {
      this.payExchangeGainLoss = +(amt * fx - amt * invFx).toFixed(2);
    } else {
      this.payExchangeGainLoss = 0;
    }
  }

  postPayment(): void {
    if (!this.paySupplierId) {
      Swal.fire('Warning', 'Select supplier', 'warning'); return;
    }

    const selected = this.supplierInvoicesAll.filter(x => x.isSelected);
    if (selected.length === 0) {
      Swal.fire('Warning', 'Select at least one invoice', 'warning'); return;
    }

    const selectedAdvanceTotal = selected.reduce(
      (sum, x) => sum + Number(x.advanceAmount || 0), 0);

    if ((!this.payAmount || this.payAmount <= 0) && selectedAdvanceTotal <= 0) {
      Swal.fire('Warning', 'Amount is zero', 'warning'); return;
    }

    if (Number(this.payAmount || 0) > 0 &&
        (this.payMethodId === 2 || this.payMethodId === 3) && !this.selectedBankId) {
      Swal.fire('Warning', 'Select Bank Account', 'warning'); return;
    }

    const baseCurrId = this.getBaseCurrencyId();
    const isBaseCurr = Number(this.paymentCurrencyId) === baseCurrId;

    // ✅ Multi invoice → each invoice SGD amount calculate
    const buildPayload = (inv: any, amountInPayCurr: number) => {
      const invFx    = Number(inv.fxRate || this.invoiceFxRate || 1);
      const base     = isBaseCurr
        ? amountInPayCurr                          // SGD pay → base = same
        : +(amountInPayCurr * this.payFxRate).toFixed(2); // INR pay → × fxRate

      return {
        supplierInvoiceId:    inv.id,
        supplierId:           this.paySupplierId,
        paymentDate:          this.payDate,
        paymentMethodId:      this.payMethodId,
        referenceNo:          this.payReference,
        amount:               amountInPayCurr,
        advanceAppliedAmount: Number(inv.advanceAmount || 0),
        notes:                this.payNotes,
        bankAccountId:        this.selectedBankId,
        bankId:               this.selectedBankId,
        createdBy:            this.userId,
        countryId:            Number(localStorage.getItem('countryId') || 1),
        fxRate:               isBaseCurr ? invFx : this.payFxRate,
        amountBase:           base,
        currencyName:         this.paymentCurrencyName,
        currencyId:           this.paymentCurrencyId,
        companyCurrencyId:    baseCurrId
      };
    };

    let requests: any[];

    if (selected.length === 1) {
      requests = [this.apSvc.createPayment(
        buildPayload(selected[0], Number(this.payAmount || 0))
      )];
    } else {
      // ✅ Multi: each invoice → SGD or INR amount calculate
      requests = selected.map(inv => {
        const payable = Number(inv.payableAfterAdvance || 0);
        const invFx   = Number(inv.fxRate || this.invoiceFxRate || 1);
        const amount  = isBaseCurr
          ? Number((payable * invFx).toFixed(2))  // INR → SGD
          : payable;                               // INR as-is
        return this.apSvc.createPayment(buildPayload(inv, amount));
      });
    }

    forkJoin(requests).subscribe({
      next: (results: any[]) => {
        const allOk = results.every(r => r?.isSuccess !== false);
        if (!allOk) {
          const err = results.find(r => r?.isSuccess === false);
          Swal.fire('Warning', err?.message || 'Some payments failed', 'warning'); return;
        }

        const cashPaid             = Number(this.payAmount || 0);
        const selectedPayableTotal = selected.reduce(
          (sum, x) => sum + Number(x.payableAfterAdvance || 0), 0);

        const exchangeMsg = this.payExchangeGainLoss !== 0
          ? `<hr/><p style="color:${this.payExchangeGainLoss > 0 ? '#dc3545' : '#28a745'}">
               Exchange ${this.payExchangeGainLoss > 0 ? 'Loss' : 'Gain'}:
               <b>${Math.abs(this.payExchangeGainLoss).toFixed(2)} SGD</b>
             </p>` : '';

        Swal.fire({
          icon: 'success', title: 'Payment Posted',
          html: `
            <div style="text-align:left;font-size:14px;line-height:1.7">
              <p>Payment posted successfully.</p><hr/>
              <p>Advance: <b>${selectedAdvanceTotal.toFixed(2)}</b></p>
              <p>Paid: <b>${cashPaid.toFixed(2)} ${this.paymentCurrencyName}</b></p>
              ${!isBaseCurr ? `
                <p>FX Rate: <b>${this.payFxRate}</b></p>
                <p>Base (SGD): <b>${this.payAmountBase.toFixed(2)} SGD</b></p>` : ''}
              <p>Balance: <b>${Math.max(selectedPayableTotal - cashPaid, 0).toFixed(2)}</b></p>
              ${exchangeMsg}
            </div>`
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
    this.payDate                 = new Date().toISOString().substring(0, 10);
    this.payMethodId             = 2;
    this.payReference            = '';
    this.payAmount               = 0;
    this.payNotes                = '';
    this.amountEditedManually    = false;
    this.selectedBankId          = null;
    this.bankAvailableBalance    = null;
    this.bankBalanceAfterPayment = null;
    this.payFxRate               = 1;
    this.payAmountBase           = 0;
    this.payExchangeGainLoss     = 0;
    this.invoiceCurrencyId       = 0;
    this.invoiceCurrencyName     = '';
    this.invoiceFxRate           = 1;
    this.setDefaultPaymentCurrency();
  }

  getPaymentMethodName(id?: number): string {
    switch (Number(id || 0)) {
      case 1: return 'Cash';
      case 2: return 'Bank Transfer';
      case 3: return 'Cheque';
      default: return 'Other';
    }
  }

  get payListTotalPages(): number {
    return Math.max(1, Math.ceil(this.payments.length / this.payListPageSize));
  }

  get pagedPayments(): any[] {
    const s = (this.payListPage - 1) * this.payListPageSize;
    return this.payments.slice(s, s + this.payListPageSize);
  }

  payListGoToPage(p: number): void {
    if (p < 1 || p > this.payListTotalPages) return;
    this.payListPage = p;
  }

  get payInvTotalPages(): number {
    return Math.max(1, Math.ceil(this.supplierInvoicesAll.length / this.payInvPageSize));
  }

  get pagedSupplierInvoices(): any[] {
    const s = (this.payInvPage - 1) * this.payInvPageSize;
    return this.supplierInvoicesAll.slice(s, s + this.payInvPageSize);
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
          id:             Number(a.id            || a.Id            || 0),
          advanceNo:      a.advanceNo            || a.AdvanceNo     || '',
          supplierId:     Number(a.supplierId    || a.SupplierId    || 0),
          supplierName:   a.supplierName         || a.SupplierName  || '',
          advanceDate:    a.advanceDate          || a.AdvanceDate,
          originalAmount: Number(a.originalAmount || a.OriginalAmount || 0),
          utilisedAmount: Number(a.utilisedAmount || a.UtilisedAmount || 0),
          balanceAmount:  Number(a.balanceAmount  || a.BalanceAmount  || 0),
          currencyName:   a.currencyName         || a.CurrencyName   || 'SGD',
          fxRate:         Number(a.fxRate        || a.FxRate         || 1),
          amountBase:     Number(a.amountBase    || a.AmountBase     || 0)
        }));

        this.advPage = 1;
        this.totalAdvanceAmount = this.totalAdvanceUtilised = this.totalAdvanceBalance = 0;
        this.supplierAdvances.forEach(a => {
          this.totalAdvanceAmount   += Number(a.originalAmount || 0);
          this.totalAdvanceUtilised += Number(a.utilisedAmount || 0);
          this.totalAdvanceBalance  += Number(a.balanceAmount  || 0);
        });
        this.updatePagedAdvances();
      },
      error: () => Swal.fire('Error', 'Failed to load supplier advances', 'error')
    });
  }

  updatePagedAdvances(): void {
    const s = (this.advPage - 1) * this.advPageSize;
    this.pagedSupplierAdvances = this.supplierAdvances.slice(s, s + this.advPageSize);
  }

  get advTotalPages(): number {
    return Math.max(1, Math.ceil(this.supplierAdvances.length / this.advPageSize));
  }

  advGoToPage(p: number): void {
    if (p < 1 || p > this.advTotalPages) return;
    this.advPage = p;
    this.updatePagedAdvances();
  }

  openNewAdvance(): void { this.router.navigate(['/financial/ap-advance']); }

  loadMatch(): void {
    this.apSvc.getMatchList().subscribe({
      next: (res: any) => {
        const rows = res?.data || res || [];
        this.matchRows = rows.map((x: any) => {
          const poAmt  = Number(x.poAmount      || x.PoAmount      || 0);
          const invAmt = Number(x.invoiceAmount || x.InvoiceAmount || 0);
          const status = Math.abs(poAmt - invAmt) <= 0.01 && poAmt > 0
            ? 'Matched' : x.status || x.Status || 'Mismatch';
          return {
            ...x,
            poNo:         x.poNo         || x.PoNo         || '',
            grnNo:        x.grnNo        || x.GrnNo        || '',
            invoiceNo:    x.invoiceNo    || x.InvoiceNo    || '',
            supplierName: x.supplierName || x.SupplierName || '',
            poAmount: poAmt, invoiceAmount: invAmt, status
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
    return Math.max(1, Math.ceil(this.matchRows.length / this.matchPageSize));
  }

  get pagedMatchRows(): any[] {
    const s = (this.matchPage - 1) * this.matchPageSize;
    return this.matchRows.slice(s, s + this.matchPageSize);
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

  onEmailModalBackdropClick(event: MouseEvent): void { this.closeEmailModal(); }

  checkPeriodLockForDate(dateStr: string): void {
    if (!dateStr) return;
    this.apSvc.getPeriodStatus(dateStr).subscribe({
      next: (res: any) => {
        this.isPeriodLocked    = !!res.isLocked;
        this.currentPeriodName = res.periodName || '';
      },
      error: () => { this.isPeriodLocked = false; this.currentPeriodName = ''; }
    });
  }

  onPayDateChange(): void {
    this.checkPeriodLockForDate(this.payDate);
    if (Number(this.paymentCurrencyId) !== this.getBaseCurrencyId()) {
      this.fetchPaymentFxRate();
    }
  }
}