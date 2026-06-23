import { Component, OnInit, ViewChild, ElementRef } from '@angular/core';
import { colors } from 'app/colors.const';
import { DashboardService } from '../dashboard.service';

@Component({
  selector: 'app-sales-maneger-dashboard',
  templateUrl: './sales-maneger-dashboard.component.html',
  styleUrls: ['./sales-maneger-dashboard.component.scss']
})
export class SalesManagerDashboardComponent implements OnInit {

  @ViewChild('statisticsLineRef') statisticsLineRef!: ElementRef;

  totalRevenue = 0;
  activeCustomers = 0;
  avgDealSize = 0;
  arOverdue = 0;

  loading = false;

  statisticsLine: any;

  private $trackBgColor = '#EBEBEB';

  constructor(
    private dashboardService: DashboardService
  ) {

    this.statisticsLine = {
      chart: {
        height: 50,
        width: 100,
        type: 'line',
        sparkline: {
          enabled: true
        },
        toolbar: {
          show: false
        }
      },

      grid: {
        borderColor: this.$trackBgColor,
        strokeDashArray: 5,
        xaxis: {
          lines: {
            show: true
          }
        },
        yaxis: {
          lines: {
            show: false
          }
        },
        padding: {
          top: -30,
          bottom: -10
        }
      },

      stroke: {
        width: 3
      },

      colors: [colors.solid.info],

      series: [
        {
          data: [0, 20, 5, 30, 15, 45]
        }
      ],

      markers: {
        size: 2,
        colors: colors.solid.info,
        strokeColors: colors.solid.info,
        strokeWidth: 2,
        strokeOpacity: 1,
        fillOpacity: 1,
        discrete: [
          {
            seriesIndex: 0,
            dataPointIndex: 5,
            fillColor: '#ffffff',
            strokeColor: colors.solid.info,
            size: 5
          }
        ]
      },

      xaxis: {
        labels: {
          show: false
        },
        axisBorder: {
          show: false
        },
        axisTicks: {
          show: false
        }
      },

      yaxis: {
        show: false
      },

      tooltip: {
        x: {
          show: false
        }
      }
    };
  }

  ngOnInit(): void {
    this.loadDashboard();
  }

  ngAfterViewInit(): void {
    if (this.statisticsLineRef) {
      this.statisticsLine.chart.width =
        this.statisticsLineRef.nativeElement.offsetWidth;
    }
  }

  loadDashboard(): void {

  const companyId =
    Number(localStorage.getItem('companyId')) || 1;

  this.loading = true;

  this.dashboardService
    .getSalesManagerDashboard(companyId)
    .subscribe({
      next: (res: any) => {

        console.log('Sales Manager Dashboard Response =>', res);

        this.totalRevenue =
          res.totalRevenue ??
          res.TotalRevenue ??
          0;

        this.activeCustomers =
          res.activeCustomers ??
          res.ActiveCustomers ??
          0;

        this.avgDealSize =
          res.avgDealSize ??
          res.AvgDealSize ??
          0;

        this.arOverdue =
          res.arOverdue ??
          res.ArOverdue ??
          0;

        this.loading = false;
      },
      error: err => {
        console.error('Dashboard Error =>', err);
        this.loading = false;
      }
    });
}

  formatCurrency(value: number): string {

    if (value >= 10000000) {
      return '₹' + (value / 10000000).toFixed(2) + 'Cr';
    }

    if (value >= 100000) {
      return '₹' + (value / 100000).toFixed(1) + 'L';
    }

    if (value >= 1000) {
      return '₹' + (value / 1000).toFixed(1) + 'K';
    }

    return '₹' + value;
  }
}