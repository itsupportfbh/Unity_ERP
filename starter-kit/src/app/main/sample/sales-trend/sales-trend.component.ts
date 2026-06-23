import { Component, OnInit } from '@angular/core';

@Component({
  selector: 'app-sales-trend',
  templateUrl: './sales-trend.component.html',
  styleUrls: ['./sales-trend.component.scss']
})
export class SalesTrendComponent implements OnInit {

  revenue = '18.4L';
  avgDay = '61.3K';
  invoices = 27;

  apexLineAreaChart: any;

  constructor() {

    this.apexLineAreaChart = {
      series: [
        {
          name: 'Sales',
          data: [20, 45, 35, 70, 60, 85, 75, 105, 95, 120, 110]
        }
      ],

      chart: {
  height: 180,
  type: 'area',
  toolbar: {
    show: false
  }
},

      colors: ['#2c5f7c'],

      dataLabels: {
        enabled: false
      },

      stroke: {
        curve: 'smooth',
        width: 3
      },

      fill: {
        type: 'gradient',
        gradient: {
          shadeIntensity: 1,
          opacityFrom: 0.35,
          opacityTo: 0.05
        }
      },

      grid: {
        borderColor: '#e9ecef',
        strokeDashArray: 4
      },

      xaxis: {
        categories: [
          '1', '2', '3', '4', '5',
          '6', '7', '8', '9', '10', '11'
        ]
      },

      yaxis: {
        labels: {
          show: false
        }
      },

      tooltip: {
        enabled: true
      }
    };
  }

  ngOnInit(): void {}
}
