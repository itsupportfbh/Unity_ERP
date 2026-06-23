import { Component, OnInit } from '@angular/core';
import {
  DashboardService,
  StockAlert
} from '../dashboard.service';

@Component({
  selector: 'app-stock-alerts',
  templateUrl: './stock-alerts.component.html',
  styleUrls: ['./stock-alerts.component.scss']
})
export class StockAlertsComponent implements OnInit {

  companyId = Number(localStorage.getItem('companyId')) || 0;

  stockAlerts: any[] = [];

  constructor(private dashboardService: DashboardService) {}

  ngOnInit(): void {
    this.loadStockAlerts();
  }

  loadStockAlerts(): void {
    this.dashboardService.getStockAlerts(this.companyId).subscribe({
      next: (res: StockAlert[]) => {
        this.stockAlerts = (res || []).map(x => ({
          sku: x.sku,
          issue: x.issue,
          qty: x.qty,
          class: this.getBadgeClass(x.issue)
        }));

        console.log('Stock Alerts:', this.stockAlerts);
      },
      error: (err) => {
        console.error('Stock Alerts error:', err);
      }
    });
  }

  getBadgeClass(issue: string): string {
    if (issue === 'Negative') return 'badge-danger';
    if (issue === 'Slow Mv.') return 'badge-warning';
    if (issue === 'Below Min') return 'badge-warning';
    return 'badge-warning';
  }
}