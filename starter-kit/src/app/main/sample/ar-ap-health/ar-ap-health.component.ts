import { Component, OnInit } from '@angular/core';
import {
  DashboardService,
  FinanceArApHealth
} from '../dashboard.service';

@Component({
  selector: 'app-ar-ap-health',
  templateUrl: './ar-ap-health.component.html',
  styleUrls: ['./ar-ap-health.component.scss']
})
export class ArApHealthComponent implements OnInit {

  companyId = Number(localStorage.getItem('companyId')) || 0;

  receivableChart: any;
  payableChart: any;

  constructor(private dashboardService: DashboardService) {}

  ngOnInit(): void {
    this.initCharts(0, 0);
    this.loadArApHealth();
  }

  loadArApHealth(): void {
    this.dashboardService.getFinanceArApHealth(this.companyId).subscribe({
      next: (res: FinanceArApHealth) => {
        const receivablePercent = Number(res.receivablesCollectedPercent || 0);
        const payablePercent = Number(res.payablesPaidPercent || 0);

        this.initCharts(receivablePercent, payablePercent);

        console.log('AR AP Health:', res);
      },
      error: (err) => {
        console.error('AR AP Health error:', err);
      }
    });
  }

  initCharts(receivablePercent: number, payablePercent: number): void {
    this.receivableChart = this.createChart(
      receivablePercent,
      '#4E7A8F',
      'Collected'
    );

    this.payableChart = this.createChart(
      payablePercent,
      '#F5A623',
      'Paid'
    );
  }

  createChart(value: number, color: string, label: string): any {
    return {
      series: [Math.round(value)],

      chart: {
        type: 'radialBar',
        height: 220
      },

      colors: [color],

      labels: [label],

      stroke: {
        lineCap: 'round'
      },

      fill: {
        type: 'solid'
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
              show: true,
              offsetY: 20,
              fontSize: '14px',
              color: '#8d99ae'
            },

            value: {
              show: true,
              fontSize: '32px',
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