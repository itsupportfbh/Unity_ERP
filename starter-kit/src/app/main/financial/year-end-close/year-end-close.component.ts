// year-end-close.component.ts
import { Component, OnInit } from '@angular/core';
import { YearEndCloseService, YearEndClosePreviewRow, YearEndCloseStatus, YearEndCloseResult } from './year-end-close.service';
import { FunctionPermission, PermissionService } from 'app/shared/permission.service';
import Swal from 'sweetalert2';

@Component({
  selector: 'app-year-end-close',
  templateUrl: './year-end-close.component.html',
  styleUrls: ['./year-end-close.component.scss']
})
export class YearEndCloseComponent implements OnInit {

  userId = 0;
  functionId = 'year-end';
  permission: FunctionPermission;
  isPermissionLoaded = false;

  fyStartYear: number | null = null;
  fyEndYear: number | null = null;
  closeDate = '';

  fyYears: { label: string; startYear: number; endYear: number }[] = [];

  status: YearEndCloseStatus | null = null;
  isLoadingStatus = false;

  previewRows: YearEndClosePreviewRow[] = [];
  isLoadingPreview = false;
  showPreview = false;

  isRunning = false;
  result: YearEndCloseResult | null = null;

  constructor(
    private yearEndService: YearEndCloseService,
    private permissionService: PermissionService
  ) {
    this.userId = Number(localStorage.getItem('id') || 0);
    this.permission = this.permissionService.getEmptyPermission(this.functionId);
  }

  ngOnInit(): void {
    this.buildFyYears();
    this.loadPermission();
  }

  buildFyYears(): void {
    const currentYear = new Date().getFullYear();
    for (let y = currentYear; y >= currentYear - 5; y--) {
      this.fyYears.push({
        label: `FY ${y}-${y + 1}`,
        startYear: y,
        endYear: y + 1
      });
    }
  }

  loadPermission(): void {
    if (!this.userId) {
      this.isPermissionLoaded = true;
      return;
    }
    this.permissionService.getFunctionPermission(this.userId, this.functionId).subscribe({
      next: (res) => {
        this.permission = res || this.permissionService.getEmptyPermission(this.functionId);
        this.isPermissionLoaded = true;
      },
      error: () => { this.isPermissionLoaded = true; }
    });
  }

  canView(): boolean { return this.permissionService.hasView(this.permission); }
  canPost(): boolean {
    return this.permissionService.hasPost
      ? this.permissionService.hasPost(this.permission)
      : !!(this.permission as any)?.post;
  }

  // ✅ Fix: separate method instead of inline template expression
  onFyYearSelect(startYear: number | null): void {
    if (!startYear) {
      this.fyStartYear = null;
      this.fyEndYear = null;
      this.closeDate = '';
      this.status = null;
      this.showPreview = false;
      this.previewRows = [];
      this.result = null;
      return;
    }

    const found = this.fyYears.find(y => y.startYear === startYear);
    this.fyStartYear = startYear;
    this.fyEndYear = found?.endYear || startYear + 1;
    this.closeDate = `${this.fyEndYear}-03-31`;
    this.showPreview = false;
    this.previewRows = [];
    this.result = null;
    this.loadStatus();
  }

  onFyChange(): void {
    if (!this.fyStartYear || !this.fyEndYear) return;
    this.closeDate = `${this.fyEndYear}-03-31`;
    this.showPreview = false;
    this.previewRows = [];
    this.result = null;
    this.loadStatus();
  }

  loadStatus(): void {
    if (!this.fyStartYear) return;
    this.isLoadingStatus = true;

    this.yearEndService.getStatus(this.fyStartYear).subscribe({
      next: (s) => {
        this.status = s;
        this.isLoadingStatus = false;
      },
      error: () => { this.isLoadingStatus = false; }
    });
  }

  loadPreview(): void {
    if (!this.fyStartYear || !this.closeDate) return;
    this.isLoadingPreview = true;
    this.showPreview = true;

    this.yearEndService.getPreview(this.fyStartYear, this.closeDate).subscribe({
      next: (rows) => {
        this.previewRows = rows || [];
        this.isLoadingPreview = false;
      },
      error: () => { this.isLoadingPreview = false; }
    });
  }

  get incomeRows(): YearEndClosePreviewRow[] {
    return this.previewRows.filter(r => r.headType === 'I');
  }

  get expenseRows(): YearEndClosePreviewRow[] {
    return this.previewRows.filter(r => r.headType === 'E');
  }

  get totalIncome(): number {
    return this.incomeRows.reduce((s, r) => s + r.netBalance, 0);
  }

  get totalExpense(): number {
    return this.expenseRows.reduce((s, r) => s + r.netBalance, 0);
  }

  get netPL(): number {
    return this.totalIncome - this.totalExpense;
  }

  runYearEndClose(): void {
    if (!this.fyStartYear || !this.fyEndYear || !this.closeDate) {
      Swal.fire('Missing Data', 'Please select Financial Year and Close Date.', 'warning');
      return;
    }

    if (!this.canPost()) {
      Swal.fire('Access Denied', 'You do not have Year End Close permission.', 'warning');
      return;
    }

    if (this.status?.isClosed) {
      Swal.fire('Already Closed', `FY ${this.fyStartYear}-${this.fyEndYear} already closed.`, 'info');
      return;
    }

    Swal.fire({
      title: 'Run Year End Close?',
      html: `
        <div style="text-align:left;font-size:13px;">
          <p><strong>FY:</strong> ${this.fyStartYear}-${this.fyEndYear}</p>
          <p><strong>Close Date:</strong> ${this.closeDate}</p>
          <p><strong>Net P&amp;L:</strong> ${this.netPL.toFixed(2)}</p>
          <hr/>
          <p>This will:</p>
          <ul>
            <li>Close all Income &amp; Expense accounts to zero</li>
            <li>Transfer Net P&amp;L to Retained Earnings</li>
            <li>Set Opening Balance for next year</li>
          </ul>
          <p class="text-danger"><strong>This cannot be undone!</strong></p>
        </div>
      `,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Yes, Run Year End Close',
      cancelButtonText: 'Cancel',
      confirmButtonColor: '#2E5F73'
    }).then(res => {
      if (!res.isConfirmed) return;

      this.isRunning = true;

      this.yearEndService.run({
        fyStartYear: this.fyStartYear!,
        fyEndYear: this.fyEndYear!,
        closeDate: this.closeDate
      }).subscribe({
        next: (result) => {
          this.result = result;
          this.isRunning = false;
          this.loadStatus();

          Swal.fire({
            icon: 'success',
            title: 'Year End Close Completed!',
            html: `
              <div style="text-align:left;font-size:13px;">
                <p><strong>Journal No:</strong> ${result.journalNo}</p>
                <p><strong>Total Income:</strong> ${result.totalIncome.toFixed(2)}</p>
                <p><strong>Total Expense:</strong> ${result.totalExpense.toFixed(2)}</p>
                <p><strong>Net P&amp;L:</strong> ${result.netProfitLoss.toFixed(2)}</p>
              </div>
            `,
            confirmButtonColor: '#2E5F73'
          });
        },
        error: (err) => {
          this.isRunning = false;
          const msg = err?.error?.message || 'Year End Close failed.';
          Swal.fire('Failed', msg, 'error');
        }
      });
    });
  }
}