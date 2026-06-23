import { Component, OnInit } from '@angular/core';
import {
  DashboardService,
  PlanningOrder
} from '../dashboard.service';

@Component({
  selector: 'app-planning-orders',
  templateUrl: './planning-orders.component.html',
  styleUrls: ['./planning-orders.component.scss']
})
export class PlanningOrdersComponent implements OnInit {

  companyId = Number(localStorage.getItem('companyId')) || 0;

  planningOrders: any[] = [];

  constructor(private dashboardService: DashboardService) {}

  ngOnInit(): void {
    this.loadPlanningOrders();
  }

  loadPlanningOrders(): void {
    this.dashboardService.getPlanningOrders(this.companyId).subscribe({
      next: (res: PlanningOrder[]) => {
        this.planningOrders = (res || []).map(x => ({
          orderNo: x.orderNo,
          product: x.product,
          qty: x.qty,
          status: x.status,
          date: this.formatDate(x.date),
          class: this.getStatusClass(x.status)
        }));

        console.log('Planning Orders:', this.planningOrders);
      },
      error: (err) => {
        console.error('Planning Orders error:', err);
      }
    });
  }

  getStatusClass(status: string): string {
    if (status === 'In Progress') return 'in-progress';
    if (status === 'Completed') return 'completed';
    if (status === 'Delayed') return 'delayed';
    return 'planned';
  }

  formatDate(value: string | null): string {
    if (!value) return '-';

    return new Date(value).toLocaleDateString('en-GB', {
      day: '2-digit',
      month: 'short'
    });
  }
}