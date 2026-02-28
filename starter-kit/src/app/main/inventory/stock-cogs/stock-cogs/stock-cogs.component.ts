import { Component, OnInit } from '@angular/core';
import { CogsItemRow, CogsReport } from './cogs-report.model';
import { CogsReportService } from '../stock-cogs-service';

type TabKey = 'table' | 'chart' | 'formula';

@Component({
  selector: 'app-stock-cogs',
  templateUrl: './stock-cogs.component.html',
  styleUrls: ['./stock-cogs.component.scss']
})
export class StockCogsComponent implements OnInit {

   loading = false;

  // UI state
  activeTab: TabKey = 'table';
  search = '';

  // Inputs
  fromDate = this.toISODate(new Date(new Date().getFullYear(), new Date().getMonth(), 1));
  toDate = this.toISODate(new Date());
  warehouseId?: number;
  binId?: number;

  // Data
  report?: CogsReport;

  constructor(private api: CogsReportService) {}

  ngOnInit(): void {
    this.load();
  }

 load(): void {
  this.loading = true;

  this.api.getCogs(this.fromDate, this.toDate, this.warehouseId, this.binId).subscribe({
    next: (res: any) => {
      // ✅ unwrap API payload
      this.report = res?.data;

      // (optional) remove dummy itemId 0 row
      if (this.report?.items?.length) {
        this.report.items = this.report.items.filter(x => (x?.itemId ?? 0) > 0);
      }

      this.loading = false;
    },
    error: (err) => {
      console.error(err);
      this.loading = false;
    }
  });
}
  setTab(t: TabKey) {
    this.activeTab = t;
  }

  get rows(): CogsItemRow[] {
    const items = this.report?.items ?? [];
    const q = (this.search || '').trim().toLowerCase();
    if (!q) return items;

    return items.filter(x =>
      (x.itemName || '').toLowerCase().includes(q) ||
      String(x.itemId).includes(q)
    );
  }

  money(n?: number) {
    const v = Number(n ?? 0);
    return v.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }

  private toISODate(d: Date) {
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
  }

}





