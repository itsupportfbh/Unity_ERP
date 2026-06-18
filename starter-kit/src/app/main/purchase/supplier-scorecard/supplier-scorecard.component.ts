import { Component, OnInit, ViewChild } from '@angular/core';
import { ColumnMode, DatatableComponent } from '@swimlane/ngx-datatable';
import Swal from 'sweetalert2';
import { SupplierScorecardRow, SupplierScorecardService } from './supplier-scorecard.service';
import { SupplierService } from 'app/main/businessPartners/supplier/supplier.service';

@Component({
  selector: 'app-supplier-scorecard',
  templateUrl: './supplier-scorecard.component.html',
  styleUrls: ['./supplier-scorecard.component.scss']
})
export class SupplierScorecardComponent implements OnInit {
  @ViewChild(DatatableComponent) table!: DatatableComponent;

  ColumnMode = ColumnMode;
  selectedOption = 10;
  searchValue = '';
  isLoading = false;

  currentPage = 1;

  get totalPages(): number {
    return Math.ceil(this.rows.length / this.selectedOption) || 1;
  }

  get pageNumbers(): number[] {
    const total = this.totalPages;
    const cur = this.currentPage;
    const pages: number[] = [];
    for (let i = Math.max(1, cur - 2); i <= Math.min(total, cur + 2); i++) { pages.push(i); }
    return pages;
  }

  onPageChange(page: number): void {
    if (page >= 1 && page <= this.totalPages) { this.currentPage = page; }
  }

  fromDate = '';
  toDate = '';
  supplierId: number | null = null;
  suppliers: any[] = [];

  rows: SupplierScorecardRow[] = [];
  allRows: SupplierScorecardRow[] = [];

  constructor(
    private scorecardService: SupplierScorecardService,
    private supplierService: SupplierService
  ) {}

  ngOnInit(): void {
    this.setDefaultDates();
    this.loadSuppliers();
    this.loadReport();
  }

  private setDefaultDates(): void {
    const today = new Date();
    const start = new Date(today.getFullYear(), today.getMonth(), 1);
    this.fromDate = this.toInputDate(start);
    this.toDate = this.toInputDate(today);
  }

  private toInputDate(date: Date): string {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }

  loadSuppliers(): void {
    this.supplierService.GetAllSupplier().subscribe({
      next: (res: any) => {
        this.suppliers = Array.isArray(res) ? res : (res?.data || []);
      },
      error: () => {
        this.suppliers = [];
      }
    });
  }

  loadReport(): void {
    this.isLoading = true;
    this.scorecardService.getReport({
      fromDate: this.fromDate,
      toDate: this.toDate,
      supplierId: this.supplierId
    }).subscribe({
      next: (res: any) => {
        const data = Array.isArray(res) ? res : (res?.data || []);
        this.allRows = data.map((x: any) => this.normalize(x));
        this.applySearch();
        this.isLoading = false;
      },
      error: err => {
        this.rows = [];
        this.allRows = [];
        this.isLoading = false;
        Swal.fire('Error', err?.error?.message || 'Unable to load supplier scorecard.', 'error');
      }
    });
  }

  filterUpdate(event: Event): void {
    this.searchValue = ((event.target as HTMLInputElement).value || '').toLowerCase().trim();
    this.applySearch();
  }

  private applySearch(): void {
    const q = (this.searchValue || '').toLowerCase().trim();
    this.rows = !q
      ? [...this.allRows]
      : this.allRows.filter(x =>
          (x.supplierName || '').toLowerCase().includes(q) ||
          (x.supplierCode || '').toLowerCase().includes(q) ||
          (x.purchaseType || '').toLowerCase().includes(q) ||
          (x.incotermsName || '').toLowerCase().includes(q) ||
          (x.rating || '').toLowerCase().includes(q)
        );
    this.currentPage = 1;
  }

  resetFilters(): void {
    this.supplierId = null;
    this.setDefaultDates();
    this.searchValue = '';
    this.loadReport();
  }

  exportCsv(): void {
    const headers = [
      'Supplier', 'Code', 'Purchase Type', 'Incoterms', 'Rating', 'Score',
      'PO Count', 'Local PO', 'Overseas PO', 'PO Value Base', 'Local PO Value Base', 'Overseas PO Value Base',
      'GRN Count', 'Full GRN', 'Partial GRN', 'Closed GRN',
      'Ordered Qty', 'Received Qty', 'Pending Qty', 'Fulfillment %',
      'Invoice Count', 'Invoice Base', 'Paid Base', 'Outstanding Base', 'Payment %'
    ];
    const lines = (this.rows || []).map(x => [
      x.supplierName, x.supplierCode, x.purchaseType, x.incotermsName, x.rating, x.overallScore,
      x.poCount, x.localPoCount, x.overseasPoCount, x.poValueBase, x.localPoValueBase, x.overseasPoValueBase,
      x.grnCount, x.fullGrnCount, x.partialGrnCount, x.closedGrnCount,
      x.orderedQty, x.receivedQty, x.pendingQty, x.fulfillmentPct,
      x.invoiceCount, x.invoiceValueBase, x.paidValueBase, x.outstandingValueBase, x.paymentPct
    ].map(v => `"${String(v ?? '').replace(/"/g, '""')}"`).join(','));

    const csv = [headers.join(','), ...lines].join('\r\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `supplier-scorecard-${this.fromDate || 'all'}-${this.toDate || 'all'}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  get totalSuppliers(): number {
    return this.rows.length;
  }

  get avgScore(): number {
    if (!this.rows.length) return 0;
    return +(this.rows.reduce((sum, x) => sum + Number(x.overallScore || 0), 0) / this.rows.length).toFixed(2);
  }

  get totalPoValue(): number {
    return +(this.rows.reduce((sum, x) => sum + Number(x.poValueBase || 0), 0)).toFixed(2);
  }

  get totalOutstanding(): number {
    return +(this.rows.reduce((sum, x) => sum + Number(x.outstandingValueBase || 0), 0)).toFixed(2);
  }

  scoreClass(row: SupplierScorecardRow): string {
    if ((row.overallScore || 0) >= 85) return 'score-a';
    if ((row.overallScore || 0) >= 70) return 'score-b';
    if ((row.overallScore || 0) >= 50) return 'score-c';
    return 'score-d';
  }

  private normalize(x: any): SupplierScorecardRow {
    return {
      supplierId: Number(x.supplierId ?? x.SupplierId ?? 0),
      supplierName: x.supplierName ?? x.SupplierName ?? '',
      supplierCode: x.supplierCode ?? x.SupplierCode ?? '',
      leadTime: x.leadTime ?? x.LeadTime ?? null,
      poCount: Number(x.poCount ?? x.PoCount ?? 0),
      approvedPoCount: Number(x.approvedPoCount ?? x.ApprovedPoCount ?? 0),
      pendingPoCount: Number(x.pendingPoCount ?? x.PendingPoCount ?? 0),
      rejectedPoCount: Number(x.rejectedPoCount ?? x.RejectedPoCount ?? 0),
      poValueBase: Number(x.poValueBase ?? x.PoValueBase ?? 0),
      localPoCount: Number(x.localPoCount ?? x.LocalPoCount ?? 0),
      overseasPoCount: Number(x.overseasPoCount ?? x.OverseasPoCount ?? 0),
      localPoValueBase: Number(x.localPoValueBase ?? x.LocalPoValueBase ?? 0),
      overseasPoValueBase: Number(x.overseasPoValueBase ?? x.OverseasPoValueBase ?? 0),
      purchaseType: x.purchaseType ?? x.PurchaseType ?? 'Local',
      incotermsName: x.incotermsName ?? x.IncotermsName ?? '',
      grnCount: Number(x.grnCount ?? x.GrnCount ?? 0),
      fullGrnCount: Number(x.fullGrnCount ?? x.FullGrnCount ?? 0),
      partialGrnCount: Number(x.partialGrnCount ?? x.PartialGrnCount ?? 0),
      closedGrnCount: Number(x.closedGrnCount ?? x.ClosedGrnCount ?? 0),
      orderedQty: Number(x.orderedQty ?? x.OrderedQty ?? 0),
      receivedQty: Number(x.receivedQty ?? x.ReceivedQty ?? 0),
      pendingQty: Number(x.pendingQty ?? x.PendingQty ?? 0),
      fulfillmentPct: Number(x.fulfillmentPct ?? x.FulfillmentPct ?? 0),
      invoiceCount: Number(x.invoiceCount ?? x.InvoiceCount ?? 0),
      invoiceValueBase: Number(x.invoiceValueBase ?? x.InvoiceValueBase ?? 0),
      paidValueBase: Number(x.paidValueBase ?? x.PaidValueBase ?? 0),
      outstandingValueBase: Number(x.outstandingValueBase ?? x.OutstandingValueBase ?? 0),
      paymentPct: Number(x.paymentPct ?? x.PaymentPct ?? 0),
      approvalScore: Number(x.approvalScore ?? x.ApprovalScore ?? 0),
      fulfillmentScore: Number(x.fulfillmentScore ?? x.FulfillmentScore ?? 0),
      paymentScore: Number(x.paymentScore ?? x.PaymentScore ?? 0),
      overallScore: Number(x.overallScore ?? x.OverallScore ?? 0),
      rating: x.rating ?? x.Rating ?? 'C'
    };
  }
}
