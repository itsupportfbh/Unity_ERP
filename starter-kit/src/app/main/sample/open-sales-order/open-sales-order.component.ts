import { Component, OnInit } from '@angular/core';
import {
  DashboardService,
  OpenSalesOrder
} from '../dashboard.service';

@Component({
  selector: 'app-open-sales-order',
  templateUrl: './open-sales-order.component.html',
  styleUrls: ['./open-sales-order.component.scss']
})
export class OpenSalesOrderComponent implements OnInit {

  openSalesOrders: OpenSalesOrder[] = [];

  constructor(
    private dashboardService: DashboardService
  ) { }

  ngOnInit(): void {
    this.getOpenSalesOrders();
  }

  getOpenSalesOrders(): void {

    const companyId =
      Number(localStorage.getItem('companyId')) || 0;

    this.dashboardService
      .getOpenSalesOrders(companyId)
      .subscribe({
        next: (res) => {

          console.log('Open Sales Orders =>', res);

          this.openSalesOrders = res;
        },
        error: (err) => {
          console.error(err);
        }
      });
  }

 getStatusText(status: number): string {

  switch (+status) {

    case 1:
      return 'Draft';

    case 2:
      return 'Approved';

    case 3:
      return 'Pending DO';

    case 4:
      return 'DO Created';

    case 5:
      return 'Invoiced';

    default:
      return 'Open';
  }
}

getStatusClass(status: string): string {

  switch (status) {

    case 'Pending DO':
      return 'badge-warning';

    case 'Approved':
      return 'badge-success';

    case 'DO Created':
      return 'badge-info';

    case 'Invoiced':
      return 'badge-primary';

    case 'Overdue':
      return 'badge-danger';

    default:
      return 'badge-secondary';
  }
}
}