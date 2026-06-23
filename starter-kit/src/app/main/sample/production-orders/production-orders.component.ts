import { Component, OnInit } from '@angular/core';
import {
  DashboardService,
  ProductionOrderList
} from '../dashboard.service';

@Component({
  selector: 'app-production-orders',
  templateUrl: './production-orders.component.html',
  styleUrls: ['./production-orders.component.scss']
})
export class ProductionOrdersComponent implements OnInit {

  companyId = Number(localStorage.getItem('companyId')) || 0;

  productionOrders: any[] = [];

  constructor(private dashboardService: DashboardService) {}

  ngOnInit(): void {
    this.loadProductionOrders();
  }

  loadProductionOrders(): void {
    this.dashboardService.getProductionOrders(this.companyId).subscribe({
      next: (res: ProductionOrderList[]) => {
        this.productionOrders = (res || []).map(x => ({
          order: x.orderNo,
          recipe: x.recipe,
          status: x.status,
          qty: x.qty,
          class: this.getStatusClass(x.status)
        }));

        console.log('Production Orders:', this.productionOrders);
      },
      error: (err) => {
        console.error('Production Orders error:', err);
      }
    });
  }

  getStatusClass(status: string): string {
    const value = (status || '').toLowerCase();

    if (value === 'done') return 'done';
    if (value === 'in progress') return 'progress';
    if (value === 'pending') return 'pending';
    if (value === 'overdue') return 'overdue';

    return 'pending';
  }
}