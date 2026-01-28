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

@Component({
  selector: 'app-finance-gstreturns',
  templateUrl: './finance-gstreturns.component.html',
  styleUrls: ['./finance-gstreturns.component.scss']
})
export class FinanceGstreturnsComponent implements OnInit {

  isLoading = false;
  isSaving  = false;

  years: GstFinancialYearOption[] = [];
  selectedYear: number | null = null;

  periods: GstPeriodOption[] = [];
  selectedPeriodId: number | null = null;

  model: GstReturnDto | null = null;

  adjustments: GstAdjustment[] = [];
  showAdjModal = false;
  editAdj: GstAdjustment | null = null;

  // Docs split by type
  salesDocs: GstDocRow[] = [];
  supplierDocs: GstDocRow[] = [];

  // Which tab is active in modal: 'SALES' | 'SUPPLIER'
  docsTab: 'SALES' | 'SUPPLIER' = 'SALES';

  constructor(
    private gstService: GstReturnsService,
    private router: Router
  ) {}

  /* ----------- Computed helpers ----------- */

  get isLocked(): boolean {
    return this.model?.status === 'LOCKED';
  }

  get f5Net(): number {
    if (!this.model) { return 0; }
    return this.round(this.model.box6OutputTax - this.model.box7InputTax);
  }

  get systemAmountDue(): number {
    return this.round(this.model?.systemSummary.amountDue || 0);
  }

  get isMatched(): boolean {
    return this.round(this.f5Net) === this.systemAmountDue;
  }

  get diff(): number {
    return this.round(this.f5Net - this.systemAmountDue);
  }

  /* ----------- Lifecycle ----------- */

  ngOnInit(): void {
    this.loadYears();
  }

  /* ----------- Load Years & Periods ----------- */

  private loadYears(): void {
    this.isLoading = true;

    this.gstService.getYears().subscribe({
      next: (res) => {
        this.years = res || [];

        if (this.years.length > 0) {
          const today = new Date();
          const currentFyStart =
            today.getMonth() + 1 >= 4 ? today.getFullYear() : today.getFullYear() - 1;

          const currentYear =
            this.years.find(y => y.fyStartYear === currentFyStart) || this.years[0];

          this.selectedYear = currentYear.fyStartYear;
          this.loadPeriodsForYear(this.selectedYear);
        } else {
          this.selectedYear = null;
          this.periods = [];
          this.selectedPeriodId = null;
          this.model = null;
          this.isLoading = false;
        }
      },
      error: (err) => {
        console.error('Error loading GST financial years', err);
        this.years = [];
        this.selectedYear = null;
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

        if (this.periods.length > 0) {
          const today = new Date();

          const current = this.periods.find(p => {
            const s = new Date(p.startDate);
            const e = new Date(p.endDate);
            return s <= today && today <= e;
          });

          const periodToSelect = current || this.periods[0];

          this.selectedPeriodId = periodToSelect.id;
          this.loadPeriodReturn(this.selectedPeriodId);
        } else {
          this.model = null;
          this.isLoading = false;
        }
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
  }

  private loadPeriodReturn(periodId: number): void {
    this.isLoading = true;
    this.model = null;

    this.gstService.getReturnForPeriod(periodId).subscribe({
      next: (dto) => {
        if (!dto) {
          this.model = null;
        } else {
          // dto.Box6/Box7 already come from DB (0 for new period)
          this.model = dto;
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

  /* ----------- Actions ----------- */

  // User helper button – copies SYSTEM → F5 (only when they click)
  matchWithSystem(): void {
    if (!this.model || this.isLocked) { return; }

    const sys = this.model.systemSummary;

    this.model.box6OutputTax  = this.round(sys.collectedOnSales);
    this.model.box7InputTax   = this.round(sys.paidOnPurchases);
    this.model.box8NetPayable = this.f5Net;
  }

  applyAndLock(): void {
    if (!this.model || this.isLocked) { return; }

    this.isSaving = true;

    const payload = {
      periodId: this.model.periodId,
      box6OutputTax: this.model.box6OutputTax,
      box7InputTax: this.model.box7InputTax
    };

    this.gstService.applyAndLock(payload).subscribe({
      next: (updated) => {
        this.model = updated;
        if (this.model) {
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

  /* ----------- Adjustments + Docs Tabs ----------- */

  openAdjustments(): void {
    if (!this.selectedPeriodId) { return; }

    this.showAdjModal = true;
    this.adjustments = [];
    this.salesDocs = [];
    this.supplierDocs = [];
    this.docsTab = 'SALES';
    this.editAdj = null;

    // Adjustments
    this.gstService.getAdjustments(this.selectedPeriodId).subscribe({
      next: (list) => {
        this.adjustments = list || [];
      },
      error: (err) => {
        console.error('Error loading GST adjustments', err);
      }
    });

    // Docs for this period
    this.gstService.getDocsForPeriod(this.selectedPeriodId).subscribe({
      next: (docs) => {
        docs = docs || [];
        this.salesDocs = docs.filter(d => d.docType === 'SI');
        this.supplierDocs = docs.filter(d => d.docType === 'PIN');
      },
      error: (err) => {
        console.error('Error loading GST docs for period', err);
      }
    });
  }

  closeAdjustments(): void {
    this.showAdjModal = false;
    this.editAdj = null;
  }

  newAdjustment(): void {
    if (!this.selectedPeriodId) { return; }

    this.editAdj = {
      id: 0,
      periodId: this.selectedPeriodId,
      lineType: 1,
      amount: 0,
      description: ''
    };
  }

  editAdjustment(row: GstAdjustment): void {
    this.editAdj = { ...row };
  }

  saveAdjustment(): void {
    if (!this.editAdj || !this.selectedPeriodId) { return; }

    this.editAdj.periodId = this.selectedPeriodId;

    this.gstService.saveAdjustment(this.editAdj).subscribe({
      next: (saved) => {
        const idx = this.adjustments.findIndex(a => a.id === saved.id);
        if (idx >= 0) {
          this.adjustments[idx] = saved;
        } else {
          this.adjustments.push(saved);
        }
        this.editAdj = null;
      },
      error: (err) => console.error('Error saving adjustment', err)
    });
  }

  deleteAdjustment(row: GstAdjustment): void {
    if (!row.id) { return; }

    this.gstService.deleteAdjustment(row.id).subscribe({
      next: () => {
        this.adjustments = this.adjustments.filter(a => a.id !== row.id);
        if (this.editAdj && this.editAdj.id === row.id) {
          this.editAdj = null;
        }
      },
      error: (err) => console.error('Error deleting adjustment', err)
    });
  }

  openDocument(row: GstDocRow): void {
    this.showAdjModal = false;

    if (row.docType === 'SI') {
      this.router.navigate(['/Sales/sales-invoice/edit', row.docId]);
    } else if (row.docType === 'PIN') {
      this.router.navigate(['/purchase/Edit-SupplierInvoice', row.docId]);
    }
  }

  /* ----------- Helper ----------- */

  private round(v: number): number {
    return Math.round((v || 0) * 100) / 100;
  }
}
