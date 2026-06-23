import { Component, OnInit } from '@angular/core';
import {
  DashboardService,
  ProductionOutput
} from '../dashboard.service';

@Component({
  selector: 'app-production-output',
  templateUrl: './production-output.component.html',
  styleUrls: ['./production-output.component.scss']
})
export class ProductionOutputComponent implements OnInit {

  companyId = Number(localStorage.getItem('companyId')) || 0;

  productionChart: any;

  constructor(private dashboardService: DashboardService) {}

  ngOnInit(): void {
    this.initChart();
    this.loadProductionOutput();
  }

  loadProductionOutput(): void {
    this.dashboardService.getProductionOutput(this.companyId).subscribe({
      next: (res: ProductionOutput[]) => {
        const labels = (res || []).map(x => x.dayName);
        const values = (res || []).map(x => Number(x.outputQty || 0));

        this.productionChart.series = [
          {
            name: 'Production',
            data: values
          }
        ];

        this.productionChart.xaxis = {
          ...this.productionChart.xaxis,
          categories: labels
        };

        console.log('Production Output:', res);
      },
      error: (err) => {
        console.error('Production Output error:', err);
      }
    });
  }

  initChart(): void {
    this.productionChart = {
      series: [
        {
          name: 'Production',
          data: []
        }
      ],
      chart: {
        type: 'area',
        height: 300,
        toolbar: { show: false },
        zoom: { enabled: false }
      },
      colors: ['#1f5fae'],
      stroke: {
        curve: 'smooth',
        width: 2
      },
      markers: {
        size: 4,
        colors: ['#1f5fae'],
        strokeColors: '#1f5fae'
      },
      fill: {
        type: 'solid',
        opacity: 0.12
      },
      dataLabels: { enabled: false },
      grid: {
        borderColor: '#e5e7eb',
        strokeDashArray: 0
      },
      xaxis: {
        categories: []
      },
      yaxis: {
        min: 0,
        tickAmount: 6
      },
      legend: { show: false },
      tooltip: { enabled: true }
    };
  }
}