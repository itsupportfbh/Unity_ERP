import { Component, OnInit } from '@angular/core';
import {
  DashboardService,
  AdminArApHealth
} from '../dashboard.service';

@Component({
  selector: 'app-admin-ar-ap-health',
  templateUrl: './admin-ar-ap-health.component.html',
  styleUrls: ['./admin-ar-ap-health.component.scss']
})
export class AdminARAPHealthComponent implements OnInit {

  companyId = Number(localStorage.getItem('companyId')) || 0;

  receivableChart: any;
  payableChart: any;

  activeUsers = 0;
  pendingApprovals = 0;

  constructor(private dashboardService: DashboardService) {}

  ngOnInit(): void {
    this.initCharts();
    this.loadAdminArApHealth();
  }

  loadAdminArApHealth(): void {
    this.dashboardService.getAdminArApHealth(this.companyId).subscribe({
      next: (res: AdminArApHealth) => {
        const receivablePercent = Math.round(Number(res.receivablePercent || 0));
        const payablePercent = Math.round(Number(res.payablePercent || 0));

        this.activeUsers = res.activeUsers ?? 0;
        this.pendingApprovals = res.pendingApprovals ?? 0;

        this.receivableChart.series = [receivablePercent];
        this.payableChart.series = [payablePercent];

        console.log('Admin AR AP Health:', res);
      },
      error: (err) => {
        console.error('Admin AR AP Health error:', err);
      }
    });
  }

  initCharts(): void {
    this.receivableChart = {
      series: [0],
      chart: {
        type: 'radialBar',
        height: 180
      },
      colors: ['#4E7A8F'],
      labels: ['Collected'],
      stroke: {
        lineCap: 'round'
      },
      plotOptions: {
        radialBar: {
          hollow: {
            size: '68%'
          },
          track: {
            background: '#E9EEF3'
          },
          dataLabels: {
            name: {
              offsetY: 18,
              fontSize: '13px',
              color: '#7a869a'
            },
            value: {
              fontSize: '30px',
              fontWeight: 700,
              offsetY: -10,
              formatter: function (val: string) {
                return val + '%';
              }
            }
          }
        }
      }
    };

    this.payableChart = {
      series: [0],
      chart: {
        type: 'radialBar',
        height: 180
      },
      colors: ['#F5A623'],
      labels: ['Paid'],
      stroke: {
        lineCap: 'round'
      },
      plotOptions: {
        radialBar: {
          hollow: {
            size: '68%'
          },
          track: {
            background: '#E9EEF3'
          },
          dataLabels: {
            name: {
              offsetY: 18,
              fontSize: '13px',
              color: '#7a869a'
            },
            value: {
              fontSize: '30px',
              fontWeight: 700,
              offsetY: -10,
              formatter: function (val: string) {
                return val + '%';
              }
            }
          }
        }
      }
    };
  }
}