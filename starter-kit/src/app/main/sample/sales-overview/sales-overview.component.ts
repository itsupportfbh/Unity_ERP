import { Component, OnInit } from '@angular/core';
import {
  ApexAxisChartSeries,
  ApexChart,
  ApexDataLabels,
  ApexGrid,
  ApexPlotOptions,
  ApexXAxis
} from 'ng-apexcharts';

import {
  DashboardService,
  SalesOverviewData
} from '../dashboard.service';

export type ChartOptions = {
  series: ApexAxisChartSeries;
  chart: ApexChart;
  plotOptions: ApexPlotOptions;
  dataLabels: ApexDataLabels;
  xaxis: ApexXAxis;
  colors: string[];
  grid: ApexGrid;
};

@Component({
  selector: 'app-sales-overview',
  templateUrl: './sales-overview.component.html',
  styleUrls: ['./sales-overview.component.scss']
})
export class SalesOverviewComponent implements OnInit {

  public apexBarChart: Partial<ChartOptions> | undefined;

  salesOverviewData: SalesOverviewData = {
    quotation: 0,
    salesOrders: 0,
    deliveries: 0,
    invoices: 0
  };

  constructor(
    private salesOverviewService: DashboardService
  ) {}

  ngOnInit(): void {

    this.apexBarChart = {
      series: [
        {
          name: 'Count',
          data: [0, 0, 0, 0]
        }
      ],
      chart: {
        type: 'bar',
        height: 180,
        toolbar: {
          show: false
        }
      },
      plotOptions: {
        bar: {
          horizontal: true,
          barHeight: '45%'
        }
      },
      colors: ['#6B8A99'],
      dataLabels: {
        enabled: true
      },
      xaxis: {
        categories: [
          'Quotations',
          'Sales Orders',
          'Deliveries',
          'Invoices'
        ]
      },
      grid: {
        show: false
      }
    };

    this.getSalesOverview();
  }

  getSalesOverview(): void {

    const companyId =
      Number(localStorage.getItem('companyId')) || 0;

    this.salesOverviewService
      .getSalesOverview(companyId)
      .subscribe({
        next: (res: any) => {

          console.log('Sales Overview Response =>', res);

          this.salesOverviewData = {
            quotation: res?.quotation || 0,
            salesOrders: res?.salesOrders || 0,
            deliveries: res?.deliveries || 0,
            invoices: res?.invoices || 0
          };

          this.apexBarChart = {
            ...this.apexBarChart,
            series: [
              {
                name: 'Count',
                data: [
                  this.salesOverviewData.quotation,
                  this.salesOverviewData.salesOrders,
                  this.salesOverviewData.deliveries,
                  this.salesOverviewData.invoices
                ]
              }
            ]
          };
        },
        error: err => {
          console.error(err);
        }
      });
  }
}