import { Component, OnInit, AfterViewInit } from '@angular/core';
import { ArAgingInvoice, ArAgingSummary } from './aging-model';
import { ArAgingService } from '../aging-service';
import { CustomerMasterService } from 'app/main/businessPartners/customer-master/customer-master.service';
import * as feather from 'feather-icons';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

interface ResponseResult<T> {
  data: T;
  isSuccess?: boolean;
  message?: string;
}

@Component({
  selector: 'app-aging',
  templateUrl: './aging.component.html',
  styleUrls: ['./aging.component.scss']
})
export class AgingComponent implements OnInit, AfterViewInit {

  // Filters
  fromDate: string;
  toDate:   string;

  // Data
  rows:         ArAgingSummary[] = [];
  filteredRows: ArAgingSummary[] = [];
  detailRows:   ArAgingInvoice[] = [];

  customerOptions: Array<{ customerId: number; customerName: string }> = [];
  selectedCustomerId: number | null = null;

  isLoading    = false;
  isDetailOpen = false;
  selectedCustomerName = '';

  // ✅ Summary totals — SGD
  totalOutstandingAllBase  = 0;
  total0_30Base            = 0;
  total31_60Base           = 0;
  total61_90Base           = 0;
  total90PlusBase          = 0;
  total61_90_90PlusBase    = 0;

  // ✅ Detail totals
  detailOriginalTotal    = 0;
  detailPaidTotal        = 0;
  detailAdvanceTotal     = 0;
  detailCreditTotal      = 0;
  detailBalanceTotal     = 0;
  detailBalanceBaseTotal = 0;

  // Email modal
  showEmailModal           = false;
  selectedInvoiceForEmail: any = null;

  constructor(
    private agingService: ArAgingService,
    private customerService: CustomerMasterService
  ) {
    const today = new Date();
    this.toDate   = today.toISOString().substring(0, 10);
    const first   = new Date(today.getFullYear(), today.getMonth(), 1);
    this.fromDate = first.toISOString().substring(0, 10);
  }

  ngOnInit(): void {
    this.loadSummary();
    this.loadCustomers();
  }

  ngAfterViewInit(): void { feather.replace(); }

  // =====================================================
  // LOAD SUMMARY
  // =====================================================
  loadSummary(): void {
    this.isLoading = true;

    this.agingService.getSummary(this.fromDate, this.toDate).subscribe({
      next: (res: ArAgingSummary[] | ResponseResult<ArAgingSummary[]>) => {
        this.rows      = Array.isArray(res) ? res : (res.data || []);
        this.isLoading = false;
        this.applyCustomerFilter();
        setTimeout(() => feather.replace(), 0);
      },
      error: () => {
        this.isLoading   = false;
        this.rows        = [];
        this.filteredRows = [];
        this.recalculateTotals();
        setTimeout(() => feather.replace(), 0);
      }
    });
  }

  // =====================================================
  // LOAD CUSTOMERS
  // =====================================================
  loadCustomers(): void {
    this.customerService.GetAllCustomerDetails().subscribe((res: any) => {
      const data = res?.data || res || [];
      this.customerOptions = data.map((x: any) => ({
        customerId:   x.customerId   ?? x.CustomerId   ?? x.id ?? x.Id,
        customerName: x.customerName ?? x.CustomerName ?? x.name ?? x.Name
      }));
    });
  }

  // =====================================================
  // FILTER EVENTS
  // =====================================================
  onFilterChange(): void {
    this.loadSummary();
    if (this.isDetailOpen) {
      this.isDetailOpen = false;
      this.detailRows   = [];
    }
  }

  onCustomerChange(): void {
    this.applyCustomerFilter();
    this.isDetailOpen = false;
    this.detailRows   = [];
    setTimeout(() => feather.replace(), 0);
  }

  private applyCustomerFilter(): void {
    this.filteredRows = this.selectedCustomerId == null
      ? this.rows
      : this.rows.filter(r => r.customerId === this.selectedCustomerId);
    this.recalculateTotals();
  }

  // =====================================================
  // TOTALS
  // =====================================================
  private recalculateTotals(): void {
    const src = this.filteredRows || [];

    // ✅ SGD totals
    this.totalOutstandingAllBase = src.reduce((s,r) => s + (r.totalOutstandingBase ?? 0), 0);
    this.total0_30Base           = src.reduce((s,r) => s + (r.bucket0_30Base       ?? 0), 0);
    this.total31_60Base          = src.reduce((s,r) => s + (r.bucket31_60Base      ?? 0), 0);
    this.total61_90Base          = src.reduce((s,r) => s + (r.bucket61_90Base      ?? 0), 0);
    this.total90PlusBase         = src.reduce((s,r) => s + (r.bucket90PlusBase     ?? 0), 0);
    this.total61_90_90PlusBase   = this.total61_90Base + this.total90PlusBase;
  }

  private recalcDetailTotals(): void {
    const src = this.detailRows || [];
    this.detailOriginalTotal    = src.reduce((s,d) => s + (d.originalAmount ?? 0), 0);
    this.detailPaidTotal        = src.reduce((s,d) => s + (d.paidAmount     ?? 0), 0);
    this.detailAdvanceTotal     = src.reduce((s,d) => s + (d.advanceAmount  ?? 0), 0);
    this.detailCreditTotal      = src.reduce((s,d) => s + (d.creditAmount   ?? 0), 0);
    this.detailBalanceTotal     = src.reduce((s,d) => s + (d.balance        ?? 0), 0);
    this.detailBalanceBaseTotal = src.reduce((s,d) => s + (d.balanceBase    ?? 0), 0);
  }

  // =====================================================
  // DETAIL PANEL
  // =====================================================
  openDetail(row: ArAgingSummary): void {
    this.selectedCustomerName = row.customerName;
    this.isDetailOpen         = true;

    this.agingService.getCustomerInvoices(
      row.customerId,
      this.fromDate,
      this.toDate
    ).subscribe((res: ArAgingInvoice[] | ResponseResult<ArAgingInvoice[]>) => {
      this.detailRows = Array.isArray(res) ? res : (res.data || []);
      this.recalcDetailTotals();
      setTimeout(() => feather.replace(), 0);
    });
  }

  closeDetail(): void {
    this.isDetailOpen = false;
    this.detailRows   = [];
    this.detailOriginalTotal    = 0;
    this.detailPaidTotal        = 0;
    this.detailAdvanceTotal     = 0;
    this.detailCreditTotal      = 0;
    this.detailBalanceTotal     = 0;
    this.detailBalanceBaseTotal = 0;
  }

  // =====================================================
  // EMAIL MODAL
  // =====================================================
  openEmailModal(row: ArAgingInvoice): void {
    this.selectedInvoiceForEmail = {
      id:        row.invoiceId,
      docType:   'SI',
      invoiceNo: row.invoiceNo,
      partyName: row.customerName
    };
    this.showEmailModal = true;
  }

  closeEmailModal(): void {
    this.showEmailModal          = false;
    this.selectedInvoiceForEmail = null;
  }

  onEmailModalBackdropClick(event: MouseEvent): void {
    this.closeEmailModal();
  }

  // =====================================================
  // EXPORT
  // =====================================================
  private buildExportRows() {
    return (this.filteredRows || []).map((r, i) => ({
      'Sl.No':             i + 1,
      'Customer':          r.customerName,
      '0-30 (SGD)':        +(r.bucket0_30Base   ?? 0).toFixed(2),
      '31-60 (SGD)':       +(r.bucket31_60Base  ?? 0).toFixed(2),
      '61-90 (SGD)':       +(r.bucket61_90Base  ?? 0).toFixed(2),
      '90+ (SGD)':         +(r.bucket90PlusBase ?? 0).toFixed(2),
      'Total (SGD)':       +(r.totalOutstandingBase ?? 0).toFixed(2)
    }));
  }

  exportToExcel(): void {
    const data = this.buildExportRows();
    if (!data.length) return;

    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'AR Aging');
    XLSX.writeFile(wb, `AR-Aging-${this.fromDate}-to-${this.toDate}.xlsx`);
  }

  exportToPdf(): void {
    const rows = this.filteredRows || [];
    if (!rows.length) return;

    const doc       = new jsPDF('l', 'pt', 'a4');
    const pageWidth = doc.internal.pageSize.getWidth();
    doc.setFontSize(12);
    doc.text(
      `AR Aging (${this.fromDate} to ${this.toDate}) — Amounts in SGD`,
      pageWidth / 2, 30, { align: 'center' }
    );

    const head = [['Sl.No','Customer','0-30','31-60','61-90','90+','Total (SGD)']];
    const body = rows.map((r, i) => [
      (i + 1).toString(),
      r.customerName,
      (r.bucket0_30Base   ?? 0).toFixed(2),
      (r.bucket31_60Base  ?? 0).toFixed(2),
      (r.bucket61_90Base  ?? 0).toFixed(2),
      (r.bucket90PlusBase ?? 0).toFixed(2),
      (r.totalOutstandingBase ?? 0).toFixed(2)
    ]);

    autoTable(doc, {
      head, body,
      startY: 45,
      margin: { left: 40, right: 40 },
      styles: { fontSize: 9, halign: 'right', valign: 'middle' },
      columnStyles: {
        0: { halign: 'center' },
        1: { halign: 'left' }
      },
      headStyles: { halign: 'left' }
    });

    doc.save(`AR-Aging-${this.fromDate}-to-${this.toDate}.pdf`);
  }
}