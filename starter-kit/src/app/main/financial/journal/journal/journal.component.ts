import { AfterViewInit, Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { JournalService } from '../journalservice/journal.service';
import Swal from 'sweetalert2';
import { PeriodCloseService } from '../../period-close-fx/period-close-fx.service';
import * as feather from 'feather-icons';

type JournalRow = {
  id: number;
  journalNo: string;
  journalDate: string;
  description: string;
  debitAmount: number;      // total debit
  creditAmount: number;     // total credit
  isRecurring: boolean;
  recurringFrequency?: string | null;
  isPosted?: boolean;
};

export interface PeriodStatusDto {
  isLocked: boolean;
  periodName?: string;
  periodCode?: string;
  startDate?: string;
  endDate?: string;
}

@Component({
  selector: 'app-journal',
  templateUrl: './journal.component.html',
  styleUrls: ['./journal.component.scss']
})
export class JournalComponent implements OnInit,AfterViewInit {

  // Filters / header (you can wire to backend later if needed)
  journalDate: string | null = null;
  reference: string = '';
  selectedType: string | null = null;

  journalTypes = [
    { text: 'Standard',   value: 'Standard'  },
    { text: 'Accrual',    value: 'Accrual'   },
    { text: 'Adjustment', value: 'Adjustment'}
  ];

  // Data
  journalList: JournalRow[] = [];

  // Header info badges (top summary)
  entryTypeLabel: string = '-';          // Recurring / One-time payment
  recurringFrequencyLabel: string = '-'; // Daily / Monthly / -

  // Totals
  totalDebit: number = 0;
  totalCredit: number = 0;

  isLoading = false;

  // Period lock
  isPeriodLocked = false;
  currentPeriodName = '';

  constructor(
    private router: Router,
    private journalService: JournalService,
    private periodService: PeriodCloseService
  ) { }

  ngOnInit(): void {
    const today = new Date().toISOString().substring(0, 10);
    this.checkPeriodLockForDate(today);
    this.loadJournals();
  }

  private checkPeriodLockForDate(dateStr: string): void {
    if (!dateStr) { return; }

    this.periodService.getStatusForDateWithName(dateStr).subscribe({
      next: (res: PeriodStatusDto | null) => {
        this.isPeriodLocked = !!res?.isLocked;
        this.currentPeriodName = res?.periodName || '';
      },
      error: () => {
        // if fails, UI side don’t hard-lock; backend will still protect
        this.isPeriodLocked = false;
        this.currentPeriodName = '';
      }
    });
  }

  private showPeriodLockedSwal(action: string): void {
    Swal.fire(
      'Period Locked',
      this.currentPeriodName
        ? `Period "${this.currentPeriodName}" is locked. You cannot ${action} in this period.`
        : `Selected accounting period is locked. You cannot ${action}.`,
      'warning'
    );
  }

  reload(): void {
    this.loadJournals();
  }

    ngAfterViewInit(): void {
    feather.replace();
  }
  loadJournals(): void {
    this.isLoading = true;

    this.journalService.GetAllJournals().subscribe({
      next: (res: any) => {
        this.isLoading = false;

        const rows = res?.data || [];
        // API returns: id, journalNo, journalDate, debitAmount, creditAmount,
        // isRecurring, recurringFrequency, isPosted, description
        this.journalList = rows as JournalRow[];

        this.updateHeaderRecurringInfo();
        this.recalcTotals();
         setTimeout(() => feather.replace(), 0);
      },
      error: err => {
        console.error(err);
        this.isLoading = false;
        this.journalList = [];
        this.entryTypeLabel = '-';
        this.recurringFrequencyLabel = '-';
        this.totalDebit = 0;
        this.totalCredit = 0;
      }
    });
  }

  private updateHeaderRecurringInfo(): void {
    if (!this.journalList || this.journalList.length === 0) {
      this.entryTypeLabel = '-';
      this.recurringFrequencyLabel = '-';
      return;
    }

    const recurringRow = this.journalList.find(r => r.isRecurring);

    if (recurringRow) {
      this.entryTypeLabel = 'Recurring';
      this.recurringFrequencyLabel = this.getFrequencyLabel(recurringRow.recurringFrequency);
    } else {
      this.entryTypeLabel = 'One-time payment';
      this.recurringFrequencyLabel = '-';
    }
  }

  getFrequencyLabel(freq?: string | null): string {
    switch (freq) {
      case 'Daily':        return 'Daily';
      case 'Weekly':       return 'Weekly';
      case 'Monthly':      return 'Monthly';
      case 'Quarterly':    return 'Quarterly';
      case 'Yearly':       return 'Yearly';
      case 'EveryMinute':  return 'Every minute (Test)';
      case 'TenMin':       return 'Every 10 minutes (Test)';
      default:             return '-';
    }
  }

  recalcTotals(): void {
    let debit = 0;
    let credit = 0;

    for (const r of this.journalList || []) {
      debit  += Number(r.debitAmount)   || 0;
      credit += Number(r.creditAmount)  || 0;
    }

    this.totalDebit = debit;
    this.totalCredit = credit;
  }

  newJournal(): void {
    if (this.isPeriodLocked) {
      this.showPeriodLockedSwal('create a journal');
      return;
    }
    this.router.navigate(['financial/create-journal']);
  }

  submit(): void {
    // Post batch to GL
    if (this.isPeriodLocked) {
      this.showPeriodLockedSwal('post journals');
      return;
    }

    if (!this.journalList || this.journalList.length === 0) {
      return;
    }

    const ids = this.journalList
      .map(r => r.id)
      .filter(id => !!id);

    if (!ids.length) {
      return;
    }

    this.isLoading = true;

    this.journalService.postBatch(ids).subscribe({
      next: res => {
        this.isLoading = false;
        Swal.fire('Success', 'Journals posted to General Ledger successfully.', 'success');
        this.loadJournals();
      },
      error: err => {
        this.isLoading = false;
        console.error('Error posting journals', err);
      }
    });
  }
}
