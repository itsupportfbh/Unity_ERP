import {
  Component,
  ElementRef,
  OnInit,
  ViewChild,
  AfterViewInit
} from '@angular/core';
import { colors } from 'app/colors.const';
import feather from 'feather-icons';
import { DashboardService, SalesExecutiveData } from '../dashboard.service';

@Component({
  selector: 'app-sales-executive',
  templateUrl: './sales-executive.component.html',
  styleUrls: ['./sales-executive.component.scss']
})
export class SalesExecutiveComponent implements OnInit, AfterViewInit {

  @ViewChild('statisticsLineRef') statisticsLineRef!: ElementRef;

  salesExecutiveData: SalesExecutiveData = {
    quotation: 0,
    salesOrders: 0,
    deliveries: 0,
    invoices: 0
  };
  

  loading = false;

  statisticsLine: any;
  private $trackBgColor = '#EBEBEB';

  constructor(
    private salesexecutiveService: DashboardService
  ) {

    this.statisticsLine = {
      chart: {
        height: 50,
        width: 280,
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
    this.getSalesExecutive();
  }

  ngAfterViewInit(): void {
    if (this.statisticsLineRef) {
      this.statisticsLine.chart.width =
        this.statisticsLineRef.nativeElement.offsetWidth;
    }
  }

 getSalesExecutive(): void {

  const companyId = Number(localStorage.getItem('companyId')) || 0;

  this.salesexecutiveService.getSalesExecutive(companyId)
    .subscribe({
      next: (res: any) => {

        console.log('Sales Executive Response =>', res);

        this.salesExecutiveData = {
          quotation: res?.quotation || 0,
          salesOrders: res?.salesOrders || 0,
          deliveries: res?.deliveries || 0,
          invoices: res?.invoices || 0
        };
      },
      error: (err) => {
        console.error(err);
      }
    });

 }


}