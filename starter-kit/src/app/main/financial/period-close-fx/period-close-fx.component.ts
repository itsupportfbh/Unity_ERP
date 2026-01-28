import { Component, OnInit } from '@angular/core';
import { PeriodCloseService, PeriodOption, PeriodStatus } from '../period-close-fx/period-close-fx.service';
import Swal from 'sweetalert2';

@Component({
  selector: 'app-period-close-fx',
  templateUrl: './period-close-fx.component.html',
  styleUrls: ['./period-close-fx.component.scss']
})
export class PeriodCloseFxComponent implements OnInit {

  periods: PeriodOption[] = [];
  selectedPeriodId: number | null = null;

  fxRevalDate: string = '';
  isLocking = false;
  isRunningFx = false;
  status: PeriodStatus | null = null;

  get isLocked(): boolean {
    return !!this.status?.isLocked;
  }

  // normally from auth service
  isAdmin = true;

  constructor(private periodService: PeriodCloseService) { }

  ngOnInit(): void {
    this.loadPeriods();
  }

loadPeriods(): void {
  this.periodService.getPeriods().subscribe({
    next: (list) => {
      this.periods = list || [];

      if (this.periods.length) {
        const today = new Date();

        // Find period that includes today's date
        const currentPeriod = this.periods.find(p => {
          const start = new Date(p.startDate);
          const end = new Date(p.endDate);
          return today >= start && today <= end;
        });

        if (currentPeriod) {
          this.selectedPeriodId = currentPeriod.id;
        } else {
          // fallback: pick the closest past period
          const pastPeriods = this.periods.filter(p => new Date(p.endDate) < today);

          if (pastPeriods.length > 0) {
            const lastPast = pastPeriods[pastPeriods.length - 1];
            this.selectedPeriodId = lastPast.id;
          } else {
            // fallback: first in list
            this.selectedPeriodId = this.periods[0].id;
          }
        }

        this.onPeriodChange(this.selectedPeriodId);
      }
    },
    error: err => {
      console.error('Error loading periods', err);
      Swal.fire('Error', 'Failed to load periods.', 'error');
    }
  });
}

  onPeriodChange(id: number | null): void {
    if (!id) {
      this.selectedPeriodId = null;
      this.status = null;
      return;
    }

    this.selectedPeriodId = id;

    this.periodService.getStatus(id).subscribe({
      next: s => {
        this.status = s;
        if (s && s.periodEndDate) {
          this.fxRevalDate = s.periodEndDate.substring(0, 10);
        }
      },
      error: err => {
        console.error('Error loading period status', err);
        Swal.fire('Error', 'Failed to load period status.', 'error');
      }
    });
  }

  onToggleLock(): void {
    if (!this.selectedPeriodId || !this.isAdmin || !this.status) {
      return;
    }

    const targetLock = !this.status.isLocked;
    const title = targetLock ? 'Lock this period?' : 'Unlock this period?';
    const text  = targetLock
      ? 'After locking, posting in this period will be blocked.'
      : 'After unlocking, users can post in this period again.';

    Swal.fire({
      title,
      text,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: targetLock ? 'Yes, lock it' : 'Yes, unlock it',
      cancelButtonText: 'Cancel',
      confirmButtonColor: '#d33',
      cancelButtonColor: '#6b7280',
      reverseButtons: true
    }).then(result => {
      if (!result.isConfirmed) { return; }

      this.isLocking = true;

      this.periodService.setLock(this.selectedPeriodId!, targetLock).subscribe({
        next: s => {
          this.status = s;
          this.isLocking = false;

          Swal.fire({
            icon: 'success',
            title: targetLock ? 'Period locked' : 'Period unlocked',
            text: s.periodLabel
              ? `Period "${s.periodLabel}" has been ${targetLock ? 'locked' : 'unlocked'}.`
              : `Period has been ${targetLock ? 'locked' : 'unlocked'}.`
          });
        },
        error: err => {
          console.error('Error changing lock', err);
          this.isLocking = false;
          Swal.fire('Error', 'Failed to change period lock status.', 'error');
        }
      });
    });
  }

  runFxRevaluation(): void {
    if (!this.selectedPeriodId || !this.fxRevalDate) {
      Swal.fire('Missing data', 'Please choose a period and FX revaluation date.', 'warning');
      return;
    }

    Swal.fire({
      title: 'Run FX revaluation?',
      text: 'This may take some time and will revalue foreign currency balances.',
      icon: 'question',
      showCancelButton: true,
      confirmButtonText: 'Yes, run',
      cancelButtonText: 'Cancel',
      confirmButtonColor: '#2E5F73',
      cancelButtonColor: '#6b7280',
      reverseButtons: true
    }).then(result => {
      if (!result.isConfirmed) { return; }

      this.isRunningFx = true;

      this.periodService.runFxReval({
        periodId: this.selectedPeriodId!,
        fxDate: this.fxRevalDate
      }).subscribe({
        next: _ => {
          this.isRunningFx = false;
          Swal.fire('Done', 'FX Revaluation completed successfully.', 'success');
        },
        error: err => {
          console.error('Error running FX revaluation', err);
          this.isRunningFx = false;
          Swal.fire('Error', 'Error occurred while running FX revaluation.', 'error');
        }
      });
    });
  }

  openTrialBalance(): void {
    if (!this.selectedPeriodId) {
      Swal.fire('No period selected', 'Please select a period first.', 'info');
      return;
    }
    window.open(`/reports/trial-balance?periodId=${this.selectedPeriodId}`, '_blank');
  }
}
