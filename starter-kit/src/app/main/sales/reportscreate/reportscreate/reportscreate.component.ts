import { Component, OnInit, AfterViewInit } from '@angular/core';
import feather from 'feather-icons';
import { ReportsService } from '../reports.service';
import { Router } from '@angular/router';

@Component({
  selector: 'app-reportscreate',
  templateUrl: './reportscreate.component.html',
  styleUrls: ['./reportscreate.component.scss']
})
export class ReportscreateComponent implements OnInit, AfterViewInit {

  // ✅ added daybook
  activeReport: 'sales' | 'margin' | 'delivery'  | null = null;

  totalQuantitySold = 0;
  averageMarginPct  = 0;
  onTimeDeliveryPct = 0;

  constructor(private _reportsService: ReportsService,  private router: Router,) {}

  ngOnInit(): void {
    this.loadSummaryMetrics();
  }

  ngAfterViewInit(): void {
    setTimeout(() => feather.replace(), 0);
  }

  openReport(type: 'sales' | 'margin' | 'delivery' ): void {
    this.activeReport = this.activeReport === type ? null : type;
    setTimeout(() => feather.replace(), 0);
  }

  private loadSummaryMetrics(): void {
    this._reportsService.GetSalesByItemAsync().subscribe((res: any) => {
      if (res && res.isSuccess && Array.isArray(res.data)) {
        const rows = res.data;
        this.totalQuantitySold = rows.reduce((sum: number, r: any) => sum + (Number(r.quantity) || 0), 0);
      }
    });

    this._reportsService.GetSalesMarginAsync().subscribe((res: any) => {
      if (res && res.isSuccess && Array.isArray(res.data) && res.data.length > 0) {
        const rows = res.data;
        const totalMargin = rows.reduce((sum: number, r: any) => sum + (Number(r.marginPct) || 0), 0);
        this.averageMarginPct = totalMargin / rows.length;
      } else {
        this.averageMarginPct = 0;
      }
    });

    // delivery on-time % later
  }

   goToDeliveryNoteSummary() { this.router.navigate(['/Sales/Delivery-Note-list']); }
}