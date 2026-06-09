import { Component, OnInit } from '@angular/core';
import {
  PeriodCloseService,
  PeriodOption,
  PeriodStatus
} from '../period-close-fx/period-close-fx.service';
import { FunctionPermission, PermissionService } from 'app/shared/permission.service';
import Swal from 'sweetalert2';

@Component({
  selector: 'app-period-close-fx',
  templateUrl: './period-close-fx.component.html',
  styleUrls: ['./period-close-fx.component.scss']
})
export class PeriodCloseFxComponent implements OnInit {
  periods: PeriodOption[] = [];
  selectedPeriodId: number | null = null;

  fxRevalDate = '';
  isLocking = false;
  isRunningFx = false;
  status: PeriodStatus | null = null;

  userId: number = 0;

  // DB/Menu function code exact ah match aaganum
  functionId = 'period';

  permission: FunctionPermission;
  isPermissionLoaded = false;
  isPageLoading = false;
  lastRunResult: {
  runId:     number;
  fxDate:    string;
  totalGain: number;
  totalLoss: number;
  net:       number;
} | null = null;

  constructor(
    private periodService: PeriodCloseService,
    private permissionService: PermissionService
  ) {
    this.userId = Number(localStorage.getItem('id') || 0);
    this.permission = this.permissionService.getEmptyPermission(this.functionId);
  }

  ngOnInit(): void {
    this.loadPermission();
  }

  get isLocked(): boolean {
    return !!this.status?.isLocked;
  }

  loadPermission(): void {
    if (!this.userId || this.userId <= 0) {
      this.permission = this.permissionService.getEmptyPermission(this.functionId);
      this.isPermissionLoaded = true;

      Swal.fire('Access denied', 'User not found. Please login again.', 'warning');
      return;
    }

    this.isPageLoading = true;

    this.permissionService.getFunctionPermission(this.userId, this.functionId).subscribe({
      next: (res: FunctionPermission) => {
        this.permission = res || this.permissionService.getEmptyPermission(this.functionId);
        this.isPermissionLoaded = true;
        this.isPageLoading = false;

        if (this.canView()) {
          this.loadPeriods();
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

  canPost(): boolean {
    return this.permissionService.hasPost
      ? this.permissionService.hasPost(this.permission)
      : !!(this.permission as any)?.post;
  }

  loadPeriods(): void {
    this.periodService.getPeriods().subscribe({
      next: (list) => {
        this.periods = list || [];

        if (!this.periods.length) {
          this.selectedPeriodId = null;
          this.status = null;
          this.fxRevalDate = '';
          return;
        }

        const today = new Date();

        const currentPeriod = this.periods.find(p => {
          const start = new Date(p.startDate);
          const end = new Date(p.endDate);
          return today >= start && today <= end;
        });

        if (currentPeriod) {
          this.selectedPeriodId = currentPeriod.id;
        } else {
          const pastPeriods = this.periods
            .filter(p => new Date(p.endDate) < today)
            .sort((a, b) =>
              new Date(b.endDate).getTime() - new Date(a.endDate).getTime()
            );

          this.selectedPeriodId = pastPeriods.length ? pastPeriods[0].id : this.periods[0].id;
        }

        this.onPeriodChange(this.selectedPeriodId);
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
      this.fxRevalDate = '';
      return;
    }

    this.selectedPeriodId = id;

    this.periodService.getStatus(id).subscribe({
      next: s => {
        this.status = s;

        if (s?.periodEndDate) {
          this.fxRevalDate = s.periodEndDate.substring(0, 10);
        } else {
          const selected = this.periods.find(x => x.id === id);
          this.fxRevalDate = selected?.endDate ? selected.endDate.substring(0, 10) : '';
        }
      },
      error: err => {
        console.error('Error loading period status', err);
        Swal.fire('Error', 'Failed to load period status.', 'error');
      }
    });
  }

  onToggleLock(): void {
    if (!this.selectedPeriodId) {
      Swal.fire('No period selected', 'Please select a period first.', 'info');
      return;
    }

    if (!this.canPost()) {
      Swal.fire('Access denied', 'You do not have lock / unlock permission.', 'warning');
      return;
    }

    if (!this.status) {
      Swal.fire('Missing status', 'Please reload the selected period status.', 'warning');
      return;
    }

    const targetLock = !this.status.isLocked;

    Swal.fire({
      title: targetLock ? 'Lock this period?' : 'Unlock this period?',
      text: targetLock
        ? 'After locking, users cannot create, edit, delete, cancel, or post transactions in this period.'
        : 'After unlocking, users can modify transactions in this period again.',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: targetLock ? 'Yes, lock it' : 'Yes, unlock it',
      cancelButtonText: 'Cancel',
      confirmButtonColor: targetLock ? '#d33' : '#2E5F73',
      cancelButtonColor: '#6b7280',
      reverseButtons: true
    }).then(result => {
      if (!result.isConfirmed) return;

      this.isLocking = true;

      this.periodService.setLock(this.selectedPeriodId!, targetLock).subscribe({
        next: s => {
          this.status = s;
          this.isLocking = false;

          Swal.fire({
            icon: 'success',
            title: targetLock ? 'Period locked' : 'Period unlocked',
            text: s?.periodLabel
              ? `Period "${s.periodLabel}" has been ${targetLock ? 'locked' : 'unlocked'}.`
              : `Period has been ${targetLock ? 'locked' : 'unlocked'}.`
          });
        },
        error: err => {
          console.error('Error changing lock', err);
          this.isLocking = false;

          const msg = err?.error?.message || 'Failed to change period lock status.';
          Swal.fire('Error', msg, 'error');
        }
      });
    });
  }

runFxRevaluation(): void {
  if (!this.canCreate() && !this.canPost()) {
    Swal.fire('Access denied',
      'You do not have run permission.', 'warning');
    return;
  }

  if (!this.selectedPeriodId || !this.fxRevalDate) {
    Swal.fire('Missing data',
      'Please choose a period and FX revaluation date.', 'warning');
    return;
  }

  Swal.fire({
    title: 'Run FX Revaluation?',
    html: `
      <div style="text-align:left;font-size:14px;line-height:1.8;">
        <p>This will:</p>
        <ul>
          <li>Revalue all open AR/AP foreign currency balances</li>
          <li>Calculate Unrealized Gain / Loss</li>
          <li>Post GL Journal automatically</li>
        </ul>
      </div>`,
    icon: 'question',
    showCancelButton:   true,
    confirmButtonText:  'Yes, Run',
    cancelButtonText:   'Cancel',
    confirmButtonColor: '#2E5F73',
    cancelButtonColor:  '#6b7280',
    reverseButtons:     true
  }).then(result => {
    if (!result.isConfirmed) return;

    this.isRunningFx = true;

    this.periodService.runFxReval({
      periodId: this.selectedPeriodId!,
      fxDate:   this.fxRevalDate
    }).subscribe({
     next: (res: any) => {
  this.isRunningFx = false;

  const data      = res?.data ?? res ?? {};
  const runId     = Number(data.runId     ?? 0);
  const totalGain = Number(data.totalGain ?? 0);
  const totalLoss = Number(data.totalLoss ?? 0);
  const net       = totalGain - totalLoss;

  this.lastRunResult = {
    runId, fxDate: this.fxRevalDate,
    totalGain, totalLoss, net
  };

  const gainHtml = totalGain > 0
    ? `<p style="color:#28a745;margin:4px 0;">
         FX Gain: <strong>${totalGain.toFixed(2)} SGD</strong>
       </p>` : '';

  const lossHtml = totalLoss > 0
    ? `<p style="color:#dc3545;margin:4px 0;">
         FX Loss: <strong>${totalLoss.toFixed(2)} SGD</strong>
       </p>` : '';

  const netHtml = (totalGain > 0 || totalLoss > 0)
    ? `<p style="border-top:1px solid #eee;padding-top:8px;margin-top:8px;">
         Net: <strong style="color:${net >= 0 ? '#28a745' : '#dc3545'}">
           ${net >= 0 ? '+' : ''}${net.toFixed(2)} SGD
         </strong>
       </p>` : '';

  const glHtml = runId > 0
    ? `<p style="font-size:0.82rem;color:#6b7280;margin-top:6px;">
         GL Journal:
         <strong>FXR-${this.fxRevalDate?.replace(/-/g,'')}-${runId}</strong>
         posted ✅
       </p>` : '';

  const noChangeHtml = (totalGain === 0 && totalLoss === 0)
    ? `<p style="color:#6b7280;">
         No FX differences found. No GL journal posted.
       </p>` : '';

  Swal.fire({
    icon:  totalLoss > totalGain ? 'warning'
         : totalGain > 0        ? 'success'
         : 'info',
    title: 'FX Revaluation Complete',
    html: `
      <div style="text-align:left;font-size:14px;line-height:1.8;">
        ${gainHtml}
        ${lossHtml}
        ${netHtml}
        ${glHtml}
        ${noChangeHtml}
      </div>`
  });
},

      error: (err: any) => {
        this.isRunningFx = false;

        const msg = (
          err?.error?.message ||
          err?.error?.title   ||
          err?.error          ||
          err?.message        ||
          'Error occurred while running FX revaluation.'
        ).toString();

        if (msg.toLowerCase().includes('already completed')) {
          Swal.fire({
            icon:               'warning',
            title:              'Already Completed',
            text:               'FX Revaluation already completed for this period and date. You can run it only once.',
            confirmButtonColor: '#2E5F73'
          });
          return;
        }

        Swal.fire('Error', msg, 'error');
      }
    });
  });
}
  openTrialBalance(): void {
    if (!this.canView()) {
      Swal.fire('Access denied', 'You do not have view permission.', 'warning');
      return;
    }

    if (!this.selectedPeriodId) {
      Swal.fire('No period selected', 'Please select a period first.', 'info');
      return;
    }

    window.open(`/reports/trial-balance?periodId=${this.selectedPeriodId}`, '_blank');
  }
}