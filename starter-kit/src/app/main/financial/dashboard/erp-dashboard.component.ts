import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import {
  ErpDashboard,
  ErpDashboardAction,
  ErpDashboardKpis,
  ErpDashboardModuleStatus,
  ErpDashboardService,
  ErpDashboardTrend
} from './erp-dashboard.service';

@Component({
  selector: 'app-erp-dashboard',
  templateUrl: './erp-dashboard.component.html',
  styleUrls: ['./erp-dashboard.component.scss']
})
export class ErpDashboardComponent implements OnInit {
  fromDate = '';
  toDate = '';
  loading = false;
  error = '';
  dashboard: ErpDashboard | null = null;

  constructor(
    private service: ErpDashboardService,
    private router: Router
  ) {}

  ngOnInit(): void {
    const today = new Date();
    const from = new Date();
    from.setDate(today.getDate() - 29);
    this.fromDate = this.toDateInput(from);
    this.toDate = this.toDateInput(today);
    this.load();
  }

  get kpis(): ErpDashboardKpis | null {
    return this.dashboard?.kpis || null;
  }

  get trends(): ErpDashboardTrend[] {
    return this.dashboard?.salesTrend || [];
  }

  get actions(): ErpDashboardAction[] {
    return this.dashboard?.actions || [];
  }

  get moduleStatus(): ErpDashboardModuleStatus[] {
    return this.dashboard?.moduleStatus || [];
  }

  get maxTrendAmount(): number {
    return Math.max(1, ...this.trends.map(x => Math.max(this.num(x.sales), this.num(x.purchases))));
  }

  load(): void {
    if (!this.fromDate || !this.toDate) {
      this.error = 'From date and To date are required.';
      return;
    }

    this.loading = true;
    this.error = '';
    this.service.getErpDashboard(this.fromDate, this.toDate).subscribe({
      next: data => {
        this.dashboard = data;
        this.loading = false;
      },
      error: err => {
        this.error = err?.error?.message || err?.message || 'Dashboard loading failed.';
        this.loading = false;
      }
    });
  }

  go(action: ErpDashboardAction): void {
    if (action?.route) {
      this.router.navigateByUrl(action.route);
    }
  }

  money(value: number | null | undefined): string {
    return this.num(value).toLocaleString('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    });
  }

  barWidth(value: number | null | undefined): string {
    const pct = Math.round((this.num(value) / this.maxTrendAmount) * 100);
    return `${Math.max(4, Math.min(100, pct))}%`;
  }

  private num(value: number | null | undefined): number {
    return Number(value || 0);
  }

  private toDateInput(date: Date): string {
    return date.toISOString().slice(0, 10);
  }
}
