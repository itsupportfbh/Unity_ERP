import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import {
  GstReturnsService,
  GstFinancialYearOption,
  GstPeriodOption,
  GstReturnDto,
  GstAdjustment,
  GstDocRow
} from './gst-returns.service';
import { FunctionPermission, PermissionService } from 'app/shared/permission.service';
import Swal from 'sweetalert2';
import { PeriodCloseService } from '../../period-close-fx/period-close-fx.service';

@Component({
  selector: 'app-finance-gstreturns',
  templateUrl: './finance-gstreturns.component.html',
  styleUrls: ['./finance-gstreturns.component.scss']
})
export class FinanceGstreturnsComponent implements OnInit {
  isLoading = false;
  isSaving = false;

  years: GstFinancialYearOption[] = [];
  selectedYear: number | null = null;

  periods: GstPeriodOption[] = [];
  selectedPeriodId: number | null = null;

  model: GstReturnDto | null = null;

  adjustments: GstAdjustment[] = [];
  showAdjModal = false;
  editAdj: GstAdjustment | null = null;

  salesDocs: GstDocRow[] = [];
  supplierDocs: GstDocRow[] = [];
  docsTab: 'SALES' | 'SUPPLIER' = 'SALES';

  userId: number = 0;
  functionId = 'tax';

  permission: FunctionPermission;
  isPermissionLoaded = false;
  isPageLoading = false;
 isPeriodLocked = false;
  periodName = '';
  constructor(
    private gstService: GstReturnsService,
    private router: Router,
    private permissionService: PermissionService,
       private periodLock: PeriodCloseService
  ) {
    this.userId = Number(localStorage.getItem('id') || 0);
    this.permission = this.permissionService.getEmptyPermission(this.functionId);
  }

  ngOnInit(): void {
    this.loadPermission();
   // this.checkPeriodLockForToday();
  }

  loadPermission(): void {
    if (!this.userId || this.userId <= 0) {
      this.permission = this.permissionService.getEmptyPermission(this.functionId);
      this.isPermissionLoaded = true;
      Swal.fire('Access Denied', 'User not found. Please login again.', 'warning');
      return;
    }

    this.isPageLoading = true;

    this.permissionService.getFunctionPermission(this.userId, this.functionId).subscribe({
      next: (res: FunctionPermission) => {
        this.permission = res || this.permissionService.getEmptyPermission(this.functionId);
        this.isPermissionLoaded = true;
        this.isPageLoading = false;

        if (this.canView()) {
          this.loadYears();
        }
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

  canExport(): boolean {
    return this.permissionService.hasExport(this.permission);
  }

  canPost(): boolean {
    return this.permissionService.hasPost
      ? this.permissionService.hasPost(this.permission)
      : !!(this.permission as any)?.post;
  }

get statusNo(): number {
  if ((this.model as any)?.glPosted === true) return 3;
  const s = String((this.model as any)?.status ?? '').trim().toUpperCase();
  if (s === 'GLPOSTED') return 3;
  if (s === 'FILED' || s === '2') return 2;
  if (s === 'LOCKED' || s === '1') return 1;
  return 0;
}

get isLocked(): boolean {
  return this.statusNo === 1 || this.statusNo === 2 || this.statusNo === 3;
}

get isStatusLocked(): boolean {
  return this.statusNo === 1;
}

get isStatusFiled(): boolean {
  return this.statusNo === 2;
}

get isStatusGlPosted(): boolean {
  return this.statusNo === 3;
}

get canShowApplyLock(): boolean {
  return !!this.model && this.statusNo === 0 && this.canPost();
}

  get f5Net(): number {
    if (!this.model) return 0;
    return this.round(Number(this.model.box6OutputTax || 0) - Number(this.model.box7InputTax || 0));
  }

  get systemAmountDue(): number {
    return this.round(Number(this.model?.systemSummary?.amountDue || 0));
  }

  get isMatched(): boolean {
    return this.round(this.f5Net) === this.round(this.systemAmountDue);
  }

  get diff(): number {
    return this.round(this.f5Net - this.systemAmountDue);
  }

  private loadYears(): void {
    this.isLoading = true;

    this.gstService.getYears().subscribe({
      next: (res) => {
        this.years = res || [];

        if (!this.years.length) {
          this.selectedYear = null;
          this.periods = [];
          this.selectedPeriodId = null;
          this.model = null;
          this.isLoading = false;
          return;
        }

        const today = new Date();
        const currentFyStart = today.getMonth() + 1 >= 4 ? today.getFullYear() : today.getFullYear() - 1;
        const currentYear = this.years.find(y => y.fyStartYear === currentFyStart) || this.years[0];

        this.selectedYear = currentYear.fyStartYear;
        this.loadPeriodsForYear(this.selectedYear);
      },
      error: (err) => {
        console.error('Error loading GST financial years', err);
        this.years = [];
        this.selectedYear = null;
        this.periods = [];
        this.selectedPeriodId = null;
        this.model = null;
        this.isLoading = false;
      }
    });
  }

  onYearChange(fyStartYear: number | null): void {
    if (!fyStartYear) {
      this.selectedYear = null;
      this.periods = [];
      this.selectedPeriodId = null;
      this.model = null;
      return;
    }

    this.selectedYear = fyStartYear;
    this.loadPeriodsForYear(fyStartYear);
  }

  private loadPeriodsForYear(fyStartYear: number): void {
    this.isLoading = true;
    this.periods = [];
    this.selectedPeriodId = null;
    this.model = null;

    this.gstService.getPeriodsByYear(fyStartYear).subscribe({
      next: (res) => {
        this.periods = res || [];

        if (!this.periods.length) {
          this.model = null;
          this.isLoading = false;
          return;
        }

        const today = new Date();
        const current = this.periods.find(p => {
          const start = new Date(p.startDate);
          const end = new Date(p.endDate);
          return start <= today && today <= end;
        });

        const periodToSelect = current || this.periods[0];

        this.selectedPeriodId = periodToSelect.id;
        this.loadPeriodReturn(this.selectedPeriodId);
        this.checkPeriodLock(this.selectedPeriodId);
      },
      error: (err) => {
        console.error('Error loading GST periods for year', err);
        this.periods = [];
        this.selectedPeriodId = null;
        this.model = null;
        this.isLoading = false;
      }
    });
  }

  onPeriodChange(periodId: number | null): void {
    if (!periodId) {
      this.selectedPeriodId = null;
      this.model = null;
      return;
    }

    this.selectedPeriodId = periodId;
    this.loadPeriodReturn(periodId);
    this.checkPeriodLock(periodId);
  }

  private loadPeriodReturn(periodId: number): void {
    this.isLoading = true;
    this.model = null;

    this.gstService.getReturnForPeriod(periodId).subscribe({
      next: (dto) => {
        this.model = dto || null;

        if (this.model) {
          this.model.box8NetPayable = this.f5Net;
        }

        this.isLoading = false;
      },
      error: (err) => {
        console.error('Error loading GST return for period', err);
        this.model = null;
        this.isLoading = false;
      }
    });
  }

  matchWithSystem(): void {
    if (!this.model || this.isLocked) return;

    if (!this.canEdit()) {
      Swal.fire('Access Denied', 'You do not have edit permission.', 'warning');
      return;
    }

    const sys = this.model.systemSummary;
    this.model.box6OutputTax = this.round(Number(sys.collectedOnSales || 0));
    this.model.box7InputTax = this.round(Number(sys.paidOnPurchases || 0));
    this.model.box8NetPayable = this.f5Net;
  }

  applyAndLock(): void {
    if (!this.model || this.isLocked) return;

    if (!this.canPost()) {
      Swal.fire('Access Denied', 'You do not have post/lock permission.', 'warning');
      return;
    }

    this.model.box8NetPayable = this.f5Net;
    this.isSaving = true;

    const payload = {
      periodId: this.model.periodId,
      box6OutputTax: this.round(Number(this.model.box6OutputTax || 0)),
      box7InputTax: this.round(Number(this.model.box7InputTax || 0))
    };

    this.gstService.applyAndLock(payload).subscribe({
    next: (updated) => {
  this.model = updated || this.model;

  if (this.model) {
   (this.model as any).status = 'LOCKED';
    this.model.box8NetPayable = this.f5Net;
  }

  this.isSaving = false;
},
      error: (err) => {
        console.error('Error applying & locking GST return', err);
        this.isSaving = false;
      }
    });
  }

  reopenReturn(): void {
    if (!this.model || !this.isLocked || this.isSaving) return;

    if (!this.canPost()) {
      Swal.fire('Access Denied', 'You do not have reopen permission.', 'warning');
      return;
    }

    this.isSaving = true;

    this.gstService.reopenReturn(this.model.id).subscribe({
     next: (updated) => {
  this.model = updated || this.model;

  if (this.model) {
   (this.model as any).status = 'OPEN';
    this.model.box8NetPayable = this.f5Net;
  }

  this.isSaving = false;
},
      error: (err) => {
        console.error('Error reopening GST return', err);
        this.isSaving = false;
      }
    });
  }

  openAdjustments(): void {
    if (!this.selectedPeriodId) return;

    this.showAdjModal = true;
    this.adjustments = [];
    this.salesDocs = [];
    this.supplierDocs = [];
    this.docsTab = 'SALES';
    this.editAdj = null;

    this.loadAdjustments();
    this.loadDocsForPeriod();
  }

  private loadAdjustments(): void {
    if (!this.selectedPeriodId) return;

    this.gstService.getAdjustments(this.selectedPeriodId).subscribe({
      next: (list) => this.adjustments = list || [],
      error: (err) => {
        console.error('Error loading GST adjustments', err);
        this.adjustments = [];
      }
    });
  }

  private loadDocsForPeriod(): void {
    if (!this.selectedPeriodId) return;

    this.gstService.getDocsForPeriod(this.selectedPeriodId).subscribe({
      next: (docs) => {
        const rows = docs || [];
        this.salesDocs = rows.filter(d => d.docType === 'SI');
        this.supplierDocs = rows.filter(d => d.docType === 'PIN');
      },
      error: (err) => {
        console.error('Error loading GST docs for period', err);
        this.salesDocs = [];
        this.supplierDocs = [];
      }
    });
  }

  closeAdjustments(): void {
    this.showAdjModal = false;
    this.editAdj = null;

    if (this.selectedPeriodId) {
      this.loadPeriodReturn(this.selectedPeriodId);
      this.checkPeriodLock(this.selectedPeriodId);
    }
  }

  newAdjustment(): void {
    if (!this.selectedPeriodId || this.isLocked) return;

    if (!this.canCreate()) {
      Swal.fire('Access Denied', 'You do not have create adjustment permission.', 'warning');
      return;
    }

    this.editAdj = {
      id: 0,
      periodId: this.selectedPeriodId,
      lineType: 1,
      amount: 0,
      description: ''
    };
  }

  editAdjustment(row: GstAdjustment): void {
    if (this.isLocked) return;

    if (!this.canEdit()) {
      Swal.fire('Access Denied', 'You do not have edit adjustment permission.', 'warning');
      return;
    }

    this.editAdj = { ...row };
  }

  saveAdjustment(): void {
    if (!this.editAdj || !this.selectedPeriodId || this.isLocked) return;

    if (this.editAdj.id > 0 && !this.canEdit()) {
      Swal.fire('Access Denied', 'You do not have edit adjustment permission.', 'warning');
      return;
    }

    if ((!this.editAdj.id || this.editAdj.id === 0) && !this.canCreate()) {
      Swal.fire('Access Denied', 'You do not have create adjustment permission.', 'warning');
      return;
    }

    if (!this.editAdj.amount || Number(this.editAdj.amount) <= 0) return;

    this.editAdj.periodId = this.selectedPeriodId;
    this.editAdj.amount = this.round(Number(this.editAdj.amount || 0));

    this.gstService.saveAdjustment(this.editAdj).subscribe({
      next: (saved) => {
        const idx = this.adjustments.findIndex(a => a.id === saved.id);

        if (idx >= 0) {
          this.adjustments[idx] = saved;
        } else {
          this.adjustments.push(saved);
        }

        this.editAdj = null;
        this.loadAdjustments();
        this.loadPeriodReturn(this.selectedPeriodId!);
        this.checkPeriodLock(this.selectedPeriodId!); 
      },
      error: (err) => console.error('Error saving GST adjustment', err)
    });
  }

  deleteAdjustment(row: GstAdjustment): void {
    if (!row.id || !this.selectedPeriodId || this.isLocked) return;

    if (!this.canDelete()) {
      Swal.fire('Access Denied', 'You do not have delete adjustment permission.', 'warning');
      return;
    }

    this.gstService.deleteAdjustment(row.id).subscribe({
      next: () => {
        this.adjustments = this.adjustments.filter(a => a.id !== row.id);

        if (this.editAdj && this.editAdj.id === row.id) {
          this.editAdj = null;
        }

        this.loadAdjustments();
        this.loadPeriodReturn(this.selectedPeriodId!);
        this.checkPeriodLock(this.selectedPeriodId!);
      },
      error: (err) => console.error('Error deleting GST adjustment', err)
    });
  }

  openDocument(row: GstDocRow): void {
    this.showAdjModal = false;

    if (row.docType === 'SI') {
      this.router.navigate(['/Sales/sales-invoice/edit', row.docId]);
      return;
    }

    if (row.docType === 'PIN') {
      this.router.navigate(['/purchase/Edit-SupplierInvoice', row.docId]);
    }
  }

  exportExcel(): void {
    if (!this.selectedPeriodId) return;

    if (!this.canExport()) {
      Swal.fire('Access Denied', 'You do not have export permission.', 'warning');
      return;
    }

    this.gstService.exportExcel(this.selectedPeriodId).subscribe({
      next: (blob: Blob) => {
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');

        a.href = url;
        a.download = `GST-F5-Return-${this.selectedPeriodId}.xlsx`;
        a.click();

        window.URL.revokeObjectURL(url);
      },
      error: (err) => console.error('Error exporting GST Excel', err)
    });
  }

  printReturn(): void {
    if (!this.canExport()) {
      Swal.fire('Access Denied', 'You do not have print/export permission.', 'warning');
      return;
    }

    window.print();
  }

  getAdjustmentTypeText(lineType: number): string {
    switch (lineType) {
      case 1: return 'Increase Output';
      case 2: return 'Decrease Output';
      case 3: return 'Increase Input';
      case 4: return 'Decrease Input';
      default: return '-';
    }
  }

  private round(value: number): number {
    return Math.round((Number(value) || 0) * 100) / 100;
  }
markAsFiled(): void {
  if (!this.model) {
    return;
  }

  if (this.statusNo !== 1) {
    Swal.fire(
      'Warning',
      'Only LOCKED GST return can be marked as filed.',
      'warning'
    );
    return;
  }

  if (!this.canPost()) {
    Swal.fire(
      'Access Denied',
      'You do not have permission to mark GST return as filed.',
      'warning'
    );
    return;
  }

  Swal.fire({
    title: 'Confirm GST Filing',
    html: `
      <div style="text-align:left;font-size:13px;">
        <p>
          Use this only after the GST F5 return is submitted in IRAS / GST portal.
        </p>
        <p>
          Enter the submission / acknowledgement number for audit reference.
        </p>
      </div>
    `,
    input: 'text',
    inputLabel: 'IRAS Submission / Acknowledgement No',
    inputPlaceholder: 'Example: GST-F5-2026-Q1-0001',
    showCancelButton: true,
    confirmButtonText: 'Confirm Filed',
    cancelButtonText: 'Cancel',
    confirmButtonColor: '#2E5F73',
    inputValidator: (value) => {
      if (!value || !value.trim()) {
        return 'Submission / acknowledgement no is required';
      }

      if (value.trim().length < 3) {
        return 'Please enter a valid submission no';
      }

      return null;
    }
  }).then(result => {
    if (!result.isConfirmed) {
      return;
    }

    const filingNo = String(result.value || '').trim();

    this.isSaving = true;

    this.gstService.markFiled(this.model!.id, filingNo).subscribe({
      next: (updated) => {
        this.model = updated || this.model;

        if (this.model) {
          (this.model as any).status = 'FILED';
          (this.model as any).filingNo = filingNo;
          this.model.box8NetPayable = this.f5Net;
        }

        this.isSaving = false;

        Swal.fire(
          'Filed',
          'GST return marked as filed successfully.',
          'success'
        );
      },
      error: (err) => {
        this.isSaving = false;

        Swal.fire(
          'Failed',
          err?.error?.message || 'Unable to mark GST return as filed.',
          'error'
        );
      }
    });
  });
}
postToGl(): void {
if (!this.model || this.statusNo !== 2) {
  Swal.fire('Warning', 'Only FILED GST return can be posted to GL.', 'warning');
  return;
}

  if ((this.model as any).glPosted) {
    Swal.fire('Info', 'GST return already posted to GL.', 'info');
    return;
  }

  if (!this.canPost()) {
    Swal.fire('Access Denied', 'You do not have post permission.', 'warning');
    return;
  }

  Swal.fire({
    title: 'Post GST to GL?',
    text: 'This will create GST accounting journal entry.',
    icon: 'question',
    showCancelButton: true,
    confirmButtonText: 'Yes, Post',
    confirmButtonColor: '#2E5F73'
  }).then(result => {
    if (!result.isConfirmed) {
      return;
    }

    this.isSaving = true;

    this.gstService.postToGl(this.model!.id).subscribe({
      next: (updated) => {
        this.model = updated || null;

        if (this.model) {
          this.model.box8NetPayable = this.f5Net;
        }

        this.isSaving = false;

        Swal.fire('Posted', 'GST return posted to GL successfully.', 'success');
      },
      error: (err) => {
        this.isSaving = false;

        Swal.fire(
          'Failed',
          err?.error?.message || 'Unable to post GST to GL.',
          'error'
        );
      }
    });
  });
}
//  private checkPeriodLockForToday(): void {
//   const today = new Date().toISOString().substring(0, 10); // yyyy-MM-dd

//   this.periodLock.getStatusForDateWithName(today).subscribe({
//     next: status => {
//       this.isPeriodLocked = !!status?.isLocked;
//       this.periodName = status?.periodName || '';
//     },
//     error: () => {
//       this.isPeriodLocked = false;
//       this.periodName = '';
//     }
//   });
// }
private checkPeriodLock(periodId: number): void {
  const selected = this.periods.find(p => p.id === periodId);
  if (!selected) return;
  
  // Use period's start date instead of today
  this.periodLock.getStatusForDateWithName(selected.startDate).subscribe({
    next: status => {
      this.isPeriodLocked = !!status?.isLocked;
      this.periodName = status?.periodName || '';
    },
    error: () => { this.isPeriodLocked = false; }
  });
}
}