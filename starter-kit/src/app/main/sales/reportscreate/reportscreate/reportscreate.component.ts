import { Component, OnInit, AfterViewInit } from '@angular/core';
import feather from 'feather-icons';
import { ReportsService } from '../reports.service';

@Component({
  selector: 'app-reportscreate',
  templateUrl: './reportscreate.component.html',
  styleUrls: ['./reportscreate.component.scss']
})
export class ReportscreateComponent implements OnInit, AfterViewInit {

  activeReport: 'sales' | 'margin' | 'delivery' | null = 'sales';

  // 🔢 metric values
  totalQuantitySold = 0;      // sum of quantity from Sales By Item report
  averageMarginPct  = 0;      // average of marginPct from Margin report
  onTimeDeliveryPct = 0;      // placeholder for later (from deliveries)

  constructor(
    private _reportsService: ReportsService
  ) {}

  ngOnInit(): void {
    this.loadSummaryMetrics();
  }

  ngAfterViewInit(): void {
    setTimeout(() => feather.replace(), 0);
  }

  openReport(type: 'sales' | 'margin' | 'delivery'): void {
    this.activeReport = this.activeReport === type ? null : type;
    setTimeout(() => feather.replace(), 0);
  }

  // ===== Load summary metrics =====
  private loadSummaryMetrics(): void {
    // 1) Total quantity sold from Sales By Item
    this._reportsService.GetSalesByItemAsync().subscribe((res: any) => {
      if (res && res.isSuccess && Array.isArray(res.data)) {
        const rows = res.data;
        this.totalQuantitySold = rows.reduce(
          (sum: number, r: any) => sum + (Number(r.quantity) || 0),
          0
        );
      }
    });

    // 2) Average margin % from Sales Margin report
    this._reportsService.GetSalesMarginAsync().subscribe((res: any) => {
      if (res && res.isSuccess && Array.isArray(res.data) && res.data.length > 0) {
        const rows = res.data;
        const totalMargin = rows.reduce(
          (sum: number, r: any) => sum + (Number(r.marginPct) || 0),
          0
        );
        this.averageMarginPct = totalMargin / rows.length;
      } else {
        this.averageMarginPct = 0;
      }
    });

    // 3) On-time delivery % – you can calculate later from DO report
    // this._reportsService.GetDeliveriesReportAsync().subscribe(...)
  }
}
