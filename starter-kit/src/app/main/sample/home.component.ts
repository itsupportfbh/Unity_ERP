import { Component, OnInit, ViewEncapsulation } from '@angular/core';
import { Router } from '@angular/router';

type Severity = 'WARN' | 'HIGH';
type TimelineType = 'ok' | 'warn';

@Component({
  selector: 'app-home',
  templateUrl: './home.component.html',
  styleUrls: ['./home.component.scss'],
  encapsulation:ViewEncapsulation.None
})
export class HomeComponent implements OnInit {
  constructor(private router: Router) {}

  public contentHeader: any;

  today = new Date();
  roleName = 'Admin (prototype)';

  companies = [
    { id: 1, name: 'FBH Main' },
    { id: 2, name: 'FBH Trading' }
  ];

  filters: any = {
    companyId: 1,
    from: '2026-01-31',
    to: '2026-03-02',
    q: ''
  };

  get selectedCompanyName(): string {
    return this.companies.find(x => x.id === this.filters.companyId)?.name || '—';
  }

  // ===== Top KPI strip =====
  kpisTop = [
    {
      key: 'sq',
      label: 'Sales Quotations',
      value: 222,
      hint: 'Draft + Pending + Approved',
      delta: 8.63,
      deltaAbs: 8.63,
      iconClass: 'kpi__icon i2',
      fa: 'fa-file-lines',
      route: '/sales/quotations',
      filter: {},
      //spark: '0,26 12,18 24,20 36,14 48,16 60,10 72,12 84,8 96,10 108,7 120,9'
    },
    {
      key: 'si',
      label: 'Sales Invoices',
      value: 88,
      hint: 'Posted invoices',
      delta: 12.4,
      deltaAbs: 12.4,
      iconClass: 'kpi__icon i3',
      fa: 'fa-file-invoice-dollar',
      route: '/sales/invoices',
      filter: { status: 'Posted' },
      //spark: '0,24 12,22 24,20 36,19 48,16 60,14 72,12 84,11 96,10 108,11 120,9'
    },
    {
      key: 'grn',
      label: 'Goods Receipt Notes',
      value: 53,
      hint: 'GRN created',
      delta: 17.6,
      deltaAbs: 17.6,
      iconClass: 'kpi__icon i4',
      fa: 'fa-box',
      route: '/purchase/grn',
      filter: {},
     // spark: '0,18 12,16 24,14 36,16 48,12 60,14 72,13 84,10 96,11 108,9 120,10'
    },
    {
      key: 'ar',
      label: 'Account Receivable',
      value: 144,
      hint: 'Open invoices',
      delta: -4.0,
      deltaAbs: 4.0,
      iconClass: 'kpi__icon',
      fa: 'fa-hand-holding-dollar',
      route: '/finance/ar-aging',
      filter: {},
     // spark: '0,10 12,11 24,9 36,12 48,11 60,14 72,13 84,16 96,18 108,17 120,20'
    }
  ];

  // right mini stats
  quick = { so: 135, do: 61, cn: 4, customers: 229 };

  salesBars = [
    { label: 'Sales Orders', value: 135, pct: 62, hint: 'Open in range' },
    { label: 'Delivery Orders', value: 61, pct: 44, hint: 'Created' },
    { label: 'Sales Invoices', value: 88, pct: 52, hint: 'Posted' },
    { label: 'Customers', value: 229, pct: 70, hint: 'Active customers' }
  ];

  // ===== Sales Trend chart =====
  salesTrend = [12, 14, 11, 18, 22, 16, 24, 28, 25, 31, 29, 34, 30, 27];
  get salesTrendPoints(): string {
    return this.toPolyline(this.salesTrend, 520, 220, 20);
  }
  get salesTrendArea(): string {
    const pts = this.toPolyline(this.salesTrend, 520, 220, 20);
    return `0,220 ${pts} 520,220`;
  }
  salesSummary = { total: 565400, avg: 438200, count: 152 }; // sample (like preview)

  // ===== Purchase flow =====
  purchaseBars = [
    { label: 'PR', value: 47, pct: 47, hint: 'Requests raised' },
    { label: 'PO', value: 160, pct: 72, hint: 'Orders issued' },
    { label: 'GRN', value: 53, pct: 41, hint: 'Received goods' },
    { label: 'PIN', value: 6, pct: 18, hint: '3-way match ready' }
  ];

  // ===== AR/AP gauges + aging =====
  arGaugePct = 64;
  apGaugePct = 41;

  get arGaugeDash(): string { return this.gaugeDash(this.arGaugePct); }
  get apGaugeDash(): string { return this.gaugeDash(this.apGaugePct); }

  arAging = [
    { bucket: '0–30', amount: 246550 },
    { bucket: '31–60', amount: 82500 },
    { bucket: '61–90', amount: 32100 },
    { bucket: '90+', amount: 12320 }
  ];

  apAging = [
    { bucket: '0–30', amount: 135250 },
    { bucket: '31–60', amount: 44200 },
    { bucket: '61–90', amount: 18100 },
    { bucket: '90+', amount: 6300 }
  ];

  // ===== Inventory =====
  inv = {
    newItems: 32,
    skuCount: 645,
    belowMin: 18,
    topItems: [
      { sku: 'RICE-001', name: 'Basmati Rice 25kg', qty: 42 },
      { sku: 'SPICE-014', name: 'Briyani Masala', qty: 27 },
      { sku: 'MEAT-005', name: 'Chicken (Frozen)', qty: 19 },
      { sku: 'OIL-002', name: 'Sunflower Oil', qty: 16 }
    ]
  };

  // ===== Production + timeline =====
  prod = {
    openOrders: 98,
    nextDate: new Date('2026-03-04'),
    costAlerts: 21
  };

  timeline: { type: TimelineType; title: string; sub: string; when: string }[] = [
    { type: 'ok', title: 'Sales invoice posted', sub: 'SI-000882 • Customer: FBH Retail', when: '12m ago' },
    { type: 'warn', title: 'GST code missing', sub: 'PIN-000104 • Supplier: ABC Foods', when: '45m ago' },
    { type: 'ok', title: 'GRN created', sub: 'GRN-000053 • PO-000160', when: '2h ago' },
    { type: 'warn', title: '3-way match pending', sub: 'PIN-000106 • waiting GRN mapping', when: '3h ago' }
  ];

  exceptions: { sev: Severity; type: string; doc: string; party: string; impact: string; route: string; filter: any }[] = [
    { sev: 'WARN', type: 'GST Missing', doc: 'SI-000881', party: 'FBH Retail', impact: 'Tax', route: '/finance/gst', filter: { pending: true } },
    { sev: 'HIGH', type: '3-Way Pending', doc: 'PIN-000106', party: 'ABC Foods', impact: 'AP', route: '/purchase/3way-match', filter: { pin: 'PIN-000106' } },
    { sev: 'WARN', type: 'Negative Stock', doc: 'SKU RICE-001', party: 'WH: Main', impact: 'Inv', route: '/inventory/stock', filter: { negative: true } }
  ];

  ngOnInit() {
    this.contentHeader = {
      headerTitle: 'Home',
      actionButton: true,
      breadcrumb: {
        type: '',
        links: [
          { name: 'Home', isLink: true, link: '/' },
          { name: 'Dashboard', isLink: false }
        ]
      }
    };

    this.refresh();
  }

  refresh() {
    // future: call API
  }

  clear() {
    this.filters.q = '';
  }

  open(route: string, filter: any) {
    // ✅ real navigation
    this.router.navigate([route], {
      queryParams: {
        companyId: this.filters.companyId,
        from: this.filters.from,
        to: this.filters.to,
        q: this.filters.q || null,
        ...filter
      }
    });
  }

  money(v: number) {
    try {
      return new Intl.NumberFormat('en-SG', { style: 'currency', currency: 'SGD' }).format(v || 0);
    } catch {
      return (v || 0).toFixed(2);
    }
  }

  // ===== helpers =====
  private toPolyline(values: number[], w: number, h: number, pad: number) {
    const min = Math.min(...values);
    const max = Math.max(...values);
    const span = (max - min) || 1;

    return values.map((v, i) => {
      const x = (i * (w / (values.length - 1)));
      const y = (h - pad) - ((v - min) / span) * (h - pad * 2);
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    }).join(' ');
  }

  private gaugeDash(pct: number) {
    const C = 2 * Math.PI * 48;
    const on = (Math.max(0, Math.min(100, pct)) / 100) * C;
    const off = C - on;
    return `${on.toFixed(1)} ${off.toFixed(1)}`;
  }
}