import { Component, OnInit, ViewEncapsulation } from '@angular/core';
import { Router } from '@angular/router';
import { DashboardService, DashboardData, SalesTrend } from './dashboard.service';
import { CompanyService } from '../master/company/company-service';

type Severity = 'WARN' | 'HIGH';
type TimelineType = 'ok' | 'warn';

interface CompanyOption {
  id: number;
  name: string;
}

@Component({
  selector: 'app-home',
  templateUrl: './home.component.html',
  styleUrls: ['./home.component.scss'],
  encapsulation: ViewEncapsulation.None
})
export class HomeComponent implements OnInit {
  salesExecutive: any;

  constructor(
    private router: Router,
    private dashSvc: DashboardService,
    private companySvc: CompanyService
  ) {}

  contentHeader: any;
  today = new Date();
  roleName = 'Admin';
  loading = false;
  error = '';

  companies: CompanyOption[] = [];
  companyOptions: CompanyOption[] = [];
  allCompaniesOpt: CompanyOption = { id: 0, name: 'All Companies' };

  filters: any = {
    companyIds: [],
    from: this.toDateStr(this.addMonths(new Date(), -1)),
    to: this.toDateStr(new Date()),
    q: ''
  };

  private data: DashboardData | null = null;

  kpisTop: any[] = [];
  salesSummary = { total: 0, ordersTotal: 0, count: 0 };
  salesTrendRaw: SalesTrend[] = [];
  salesBars: any[] = [];
  quick = { so: 0, do: 0 };

  purchaseBars: any[] = [];

  arGaugePct = 0;
  apGaugePct = 0;

  arAging: { bucket: string; amount: number }[] = [];
  apAging: { bucket: string; amount: number }[] = [];

  inv = {
    newItems: 0,
    skuCount: 0,
    belowMin: 0,
    topItems: [] as { sku: string; name: string; qty: number }[]
  };

  prod = {
    openOrders: 0,
    nextDate: null as Date | null,
    costAlerts: 0
  };

  timeline: { type: TimelineType; title: string; sub: string; when: string }[] = [];

  exceptions: {
    sev: Severity;
    type: string;
    doc: string;
    party: string;
    impact: string;
    route: string;
    filter: any;
  }[] = [];

  get selectedCompanyName(): string {
    if (!this.filters.companyIds || this.filters.companyIds.length === 0) {
      return 'All Companies';
    }

    return this.companies
      .filter(c => this.filters.companyIds.includes(c.id))
      .map(c => c.name)
      .join(', ') || 'All Companies';
  }

private get resolvedCompanyId(): number {
  if (!this.filters.companyIds || this.filters.companyIds.length === 0) {
    return 0;
  }

  if (this.filters.companyIds.length === this.companies.length) {
    return 0;
  }

  if (this.filters.companyIds.length === 1) {
    return Number(this.filters.companyIds[0]);
  }

  return 0;
}
  get salesTrendPoints(): string {
    return this.toPolyline(
      this.salesTrendRaw.map(x => x.dailySalesTotal),
      520,
      220,
      20
    );
  }

  get salesTrendArea(): string {
    const pts = this.toPolyline(
      this.salesTrendRaw.map(x => x.dailySalesTotal),
      520,
      220,
      20
    );

    if (!pts) {
      return '';
    }

    return '0,220 ' + pts + ' 520,220';
  }

  get arGaugeDash(): string {
    return this.gaugeDash(this.arGaugePct);
  }

  get apGaugeDash(): string {
    return this.gaugeDash(this.apGaugePct);
  }

  ngOnInit(): void {
    // this.contentHeader = {
    //   headerTitle: 'Home',
    //   actionButton: true,
    //   breadcrumb: {
    //     type: '',
    //     links: [
    //       { name: 'Home', isLink: true, link: '/' },
    //       { name: 'Dashboard', isLink: false }
    //     ]
    //   }
    // };

    // this.roleName = this.getLoginRole();
    // this.loadCompanies();
  }

private loadCompanies(): void {
  const approvalLevelName = this.getLoginRole();
  const orgGuid = this.getOrgGuid();

  this.companySvc.getOrganizationCompanyList(approvalLevelName, orgGuid).subscribe({
    next: (rows: any[]) => {
      const flatCompanies = (rows || [])
        .reduce((acc: any[], x: any) => acc.concat(x.companies || []), [])
        .filter((c: any) => c.isActive);

      this.companies = flatCompanies.map((c: any) => ({
        // Company table Id pass aganum, MasterCompanyId illa
        id: Number(c.id),
        name: c.companyName || c.name
      }));

      this.companyOptions = [
        this.allCompaniesOpt,
        ...this.companies
      ];

      this.filters.companyIds = [];

      console.log('Dashboard companyOptions:', this.companyOptions);

      this.refresh();
    },
    error: () => {
      this.companies = [];
      this.companyOptions = [this.allCompaniesOpt];
      this.filters.companyIds = [];
      this.refresh();
    }
  });
}
onCompanyChange(selected: number[]): void {
  if (!selected || selected.length === 0) {
    this.filters.companyIds = [];
    this.refresh();
    return;
  }

  const lastSelected = selected[selected.length - 1];

  if (lastSelected === 0) {
    this.filters.companyIds = [];
  } else {
    this.filters.companyIds = selected.filter(x => x !== 0);
  }

  this.refresh();
}

refresh(): void {
  this.loading = true;
  this.error = '';

  const companyId = this.resolvedCompanyId || 0;

  console.log('Dashboard API companyId:', companyId);

  this.dashSvc
    .getDashboardData(companyId, this.filters.from, this.filters.to)
    .subscribe({
      next: d => {
        this.data = d;
        this.bind(d);
        this.loading = false;
      },
      error: err => {
        this.error = err?.error?.message || err?.error || 'Failed to load dashboard.';
        this.loading = false;
      }
    });
}
  clearFilters(): void {
    this.filters.companyIds = [];
    this.filters.from = this.toDateStr(this.addMonths(new Date(), -1));
    this.filters.to = this.toDateStr(new Date());
    this.filters.q = '';
    this.refresh();
  }

  open(route: string, filter: any): void {
    this.router.navigate([route], {
      queryParams: {
        companyId: this.resolvedCompanyId || null,
        from: this.filters.from,
        to: this.filters.to,
        q: this.filters.q || null,
        ...filter
      }
    });
  }

  money(v: number): string {
    try {
      return new Intl.NumberFormat('en-SG', {
        style: 'currency',
        currency: 'SGD'
      }).format(v ?? 0);
    } catch {
      return (v ?? 0).toFixed(2);
    }
  }

  private bind(d: DashboardData): void {
    const kpi = d.salesKpi;
    const prev = { sq: 204, si: 78, grn: 45, ar: 150 };

    this.kpisTop = [
      {
        key: 'sq',
        label: 'Sales Quotations',
        value: kpi?.salesQuotationsCount ?? 0,
        delta: this.delta(kpi?.salesQuotationsCount ?? 0, prev.sq),
        deltaAbs: Math.abs(this.delta(kpi?.salesQuotationsCount ?? 0, prev.sq)),
        iconClass: 'kpi__icon i2',
        fa: 'fa-file-lines',
        route: '/Sales/Quotation-list',
        filter: {}
      },
      {
        key: 'si',
        label: 'Sales Invoices',
        value: kpi?.salesInvoicesCount ?? 0,
         delta: this.delta(kpi?.salesInvoicesCount ?? 0, prev.si),
        deltaAbs: Math.abs(this.delta(kpi?.salesInvoicesCount ?? 0, prev.si)),
        iconClass: 'kpi__icon i3',
        fa: 'fa-file-invoice-dollar',
        route: '/Sales/Sales-Invoice-list',
        filter: { status: 'Posted' }
      },
      {
        key: 'grn',
        label: 'Goods Receipt Notes',
        value: kpi?.grnCount ?? 0,
        delta: this.delta(kpi?.grnCount ?? 0, prev.grn),
        deltaAbs: Math.abs(this.delta(kpi?.grnCount ?? 0, prev.grn)),
        iconClass: 'kpi__icon i4',
        fa: 'fa-box',
        route: '/purchase/list-Purchasegoodreceipt',
        filter: {}
      },
      {
        key: 'ar',
        label: 'Account Receivable',
        value: kpi?.aR_OutstandingCount ?? 0,
        delta: this.delta(kpi?.aR_OutstandingCount ?? 0, prev.ar),
        deltaAbs: Math.abs(this.delta(kpi?.aR_OutstandingCount ?? 0, prev.ar)),
        iconClass: 'kpi__icon',
        fa: 'fa-hand-holding-dollar',
        route: '/financial/AR',
        filter: {}
      }
    ];

    this.salesTrendRaw = d.salesTrend ?? [];

    const ov = d.salesOverview;

    this.salesSummary = {
      total: ov?.totalSalesAmount ?? 0,
      ordersTotal: ov?.totalOrdersAmount ?? 0,
      count: ov?.salesInvoicesPosted ?? 0
    };

    const maxBar = Math.max(
      ov?.salesOrdersOpen ?? 0,
      ov?.deliveryOrdersCreated ?? 0,
      ov?.salesInvoicesPosted ?? 0,
      ov?.activeCustomers ?? 1
    ) || 1;

    this.salesBars = [
      {
        label: 'Sales Orders',
        value: ov?.salesOrdersOpen ?? 0,
        pct: this.pct(ov?.salesOrdersOpen ?? 0, maxBar),
        hint: 'Open in range'
      },
      {
        label: 'Delivery Orders',
        value: ov?.deliveryOrdersCreated ?? 0,
        pct: this.pct(ov?.deliveryOrdersCreated ?? 0, maxBar),
        hint: 'Created'
      },
      {
        label: 'Sales Invoices',
        value: ov?.salesInvoicesPosted ?? 0,
        pct: this.pct(ov?.salesInvoicesPosted ?? 0, maxBar),
        hint: 'Posted'
      },
      {
        label: 'Customers',
        value: ov?.activeCustomers ?? 0,
        pct: this.pct(ov?.activeCustomers ?? 0, maxBar),
        hint: 'Active customers'
      }
    ];

    this.quick = {
      so: ov?.salesOrdersOpen ?? 0,
      do: ov?.deliveryOrdersCreated ?? 0
    };

    const prCount = d.planningOrders?.planningOrderCount ?? 0;
    const poCount = kpi?.purchaseOrderCount ?? 0;
    const grnCount = kpi?.grnCount ?? 0;
    const pinCount = kpi?.supplierInvoiceCount ?? 0;
    const maxPurch = Math.max(prCount, poCount, grnCount, pinCount) || 1;

    this.purchaseBars = [
      {
        label: 'PR',
        value: prCount,
        pct: this.pct(prCount, maxPurch),
        hint: 'Requests raised'
      },
      {
        label: 'PO',
        value: poCount,
        pct: this.pct(poCount, maxPurch),
        hint: 'Orders issued'
      },
      {
        label: 'GRN',
        value: grnCount,
        pct: this.pct(grnCount, maxPurch),
        hint: 'Received goods'
      },
      {
        label: 'PIN',
        value: pinCount,
        pct: this.pct(pinCount, maxPurch),
        hint: '3-way match ready'
      }
    ];

    this.arGaugePct = d.arApGauge?.aR_CollectedPct ?? 0;
    this.apGaugePct = d.arApGauge?.aP_PaidPct ?? 0;

    const ar = d.arAging;

    this.arAging = [
      { bucket: '0-30', amount: ar?.aR_0_30 ?? 0 },
      { bucket: '31-60', amount: ar?.aR_31_60 ?? 0 },
      { bucket: '61-90', amount: ar?.aR_61_90 ?? 0 },
      { bucket: '90+', amount: ar?.aR_90Plus ?? 0 }
    ];

    const ap = d.apAging;

    this.apAging = [
      { bucket: '0-30', amount: ap?.aP_0_30 ?? 0 },
      { bucket: '31-60', amount: ap?.aP_31_60 ?? 0 },
      { bucket: '61-90', amount: ap?.aP_61_90 ?? 0 },
      { bucket: '90+', amount: ap?.aP_90Plus ?? 0 }
    ];

    const inv = d.inventorySummary;

    this.inv = {
      newItems: inv?.newItemsInRange ?? 0,
      skuCount: inv?.availableSKU ?? 0,
      belowMin: inv?.belowMinCount ?? 0,
      topItems: (d.topItems ?? []).map(t => ({
        sku: t.sku ?? '-',
        name: t.itemName ?? '-',
        qty: t.availableQty ?? 0
      }))
    };

    const pr = d.planningOrders;

    this.prod = {
      openOrders: pr?.planningOrderCount ?? 0,
      nextDate: pr?.nextPlanningDate ? new Date(pr.nextPlanningDate) : null,
      costAlerts: d.costAlerts?.recipeCostAlertCount ?? 0
    };

    this.timeline = (d.timeline ?? []).map(t => ({
      type: this.timelineType(t.activityType),
      title: t.activityType,
      sub: t.docNo + ' - ' + t.partyName,
      when: this.timeAgo(new Date(t.activityDate))
    }));

    const sevMap: Record<string, Severity> = {
      'GST Missing': 'WARN',
      '3-Way Pending': 'HIGH',
      'Negative Stock': 'WARN'
    };

    const routeMap: Record<string, string> = {
      'GST Missing': '/finance/gst',
      '3-Way Pending': '/purchase/3way-match',
      'Negative Stock': '/inventory/stock'
    };

    this.exceptions = (d.exceptions ?? []).map(e => ({
      sev: sevMap[e.exceptionType] ?? 'WARN',
      type: e.exceptionType,
      doc: e.docNo,
      party: e.party,
      impact: e.impact,
      route: routeMap[e.exceptionType] ?? '/',
      filter: {}
    }));
  }

  private getLoginRole(): string {
    try {
      const roles = JSON.parse(localStorage.getItem('approvalRoles') || '[]');

      if (Array.isArray(roles) && roles.length > 0) {
        return roles[0];
      }
    } catch {}

    return localStorage.getItem('approvalLevelName') || 'Admin';
  }

  private getOrgGuid(): string {
    return (
      localStorage.getItem('orgGuid') ||
      localStorage.getItem('OrgGuid') ||
      localStorage.getItem('orgGUID') ||
      ''
    );
  }

  private toPolyline(values: number[], w: number, h: number, pad: number): string {
    if (!values.length) {
      return '';
    }

    const min = Math.min(...values);
    const max = Math.max(...values);
    const span = (max - min) || 1;

    return values.map((v, i) => {
      const x = i * (w / Math.max(values.length - 1, 1));
      const y = (h - pad) - ((v - min) / span) * (h - pad * 2);

      return x.toFixed(1) + ',' + y.toFixed(1);
    }).join(' ');
  }

  private gaugeDash(pct: number): string {
    const C = 2 * Math.PI * 48;
    const safePct = Math.max(0, Math.min(100, pct));
    const on = (safePct / 100) * C;

    return on.toFixed(1) + ' ' + (C - on).toFixed(1);
  }

  private delta(current: number, previous: number): number {
    if (!previous) {
      return 0;
    }

    return parseFloat((((current - previous) / previous) * 100).toFixed(2));
  }

  private pct(val: number, max: number): number {
    return max ? Math.round((val / max) * 100) : 0;
  }

  private timelineType(activityType: string): TimelineType {
    const warns = ['GST Code Missing', '3-Way Match Pending', 'Negative Stock'];
    return warns.includes(activityType) ? 'warn' : 'ok';
  }

  private timeAgo(date: Date): string {
    const diff = Math.floor((Date.now() - date.getTime()) / 1000);

    if (diff < 60) {
      return diff + 's ago';
    }

    if (diff < 3600) {
      return Math.floor(diff / 60) + 'm ago';
    }

    if (diff < 86400) {
      return Math.floor(diff / 3600) + 'h ago';
    }

    return Math.floor(diff / 86400) + 'd ago';
  }

  private toDateStr(d: Date): string {
    return d.toISOString().split('T')[0];
  }

  private addMonths(d: Date, n: number): Date {
    const r = new Date(d);
    r.setMonth(r.getMonth() + n);
    return r;
  } 
}