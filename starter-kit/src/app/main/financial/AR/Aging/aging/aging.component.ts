// src/app/main/financial/AR/Aging/aging/aging.component.ts

import { Component, OnInit, AfterViewInit } from '@angular/core';
import { ArAgingInvoice, ArAgingSummary } from './aging-model';
import { ArAgingService } from '../aging-service';
import { CustomerMasterService } from 'app/main/businessPartners/customer-master/customer-master.service';
import * as feather from 'feather-icons';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';


// If you already have a shared ResponseResult<T>, remove this and import instead
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

  // ================== FILTERS ==================
  fromDate: string;
  toDate: string;

  // ================== DATA ==================
  rows: ArAgingSummary[] = [];
  filteredRows: ArAgingSummary[] = [];
  detailRows: ArAgingInvoice[] = [];

  customerOptions: Array<{ customerId: number; customerName: string }> = [];
  selectedCustomerId: number | null = null;

  isLoading = false;
  isDetailOpen = false;
  selectedCustomerName = '';

  // ================== SUMMARY TOTALS ==================
  totalOutstandingAll = 0;
  total0_30 = 0;
  total31_60 = 0;
  total61_90_90Plus = 0;

  // ================== EMAIL MODAL ==================
  showEmailModal = false;
  selectedInvoiceForEmail: any = null; // passed into <app-invoice-email>

  constructor(
    private agingService: ArAgingService,
    private _customerMasterService: CustomerMasterService
  ) {
    const today = new Date();
    this.toDate = today.toISOString().substring(0, 10);
    const firstOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
    this.fromDate = firstOfMonth.toISOString().substring(0, 10);
  }

  // =====================================================
  //  LIFECYCLE
  // =====================================================
  ngOnInit(): void {
    this.loadSummary();
    this.loadCustomers();
  }

  ngAfterViewInit(): void {
    feather.replace();
  }

  // =====================================================
  //  LOAD SUMMARY
  // =====================================================
  loadSummary(): void {
    this.isLoading = true;

    this.agingService.getSummary(this.fromDate, this.toDate).subscribe({
      next: (res: ArAgingSummary[] | ResponseResult<ArAgingSummary[]>) => {
        // 🔹 Normalize to a plain array to fix TS union error
        const rows: ArAgingSummary[] = Array.isArray(res)
          ? res
          : (res.data || []);

        this.rows = rows;
        this.isLoading = false;

        this.applyCustomerFilter();

        setTimeout(() => feather.replace(), 0);
      },
      error: _ => {
        this.isLoading = false;
        this.rows = [];
        this.filteredRows = [];
        this.recalculateTotals();

        setTimeout(() => feather.replace(), 0);
      }
    });
  }

  // =====================================================
  //  LOAD CUSTOMERS
  // =====================================================
  loadCustomers(): void {
    this._customerMasterService.GetAllCustomerDetails()
      .subscribe((res: any) => {
        const data = res?.data || res || [];
        this.customerOptions = data.map((x: any) => ({
          customerId: x.customerId ?? x.CustomerId ?? x.id ?? x.Id,
          customerName: x.customerName ?? x.CustomerName ?? x.name ?? x.Name
        }));
      });
  }

  // =====================================================
  //  FILTER EVENTS
  // =====================================================
  onFilterChange(): void {
    this.loadSummary();
    if (this.isDetailOpen) {
      this.isDetailOpen = false;
      this.detailRows = [];
    }
  }

  onCustomerChange(): void {
    this.applyCustomerFilter();
    this.isDetailOpen = false;
    this.detailRows = [];
    setTimeout(() => feather.replace(), 0);
  }

  private applyCustomerFilter(): void {
    if (this.selectedCustomerId == null) {
      this.filteredRows = this.rows;
    } else {
      this.filteredRows = this.rows.filter(
        r => r.customerId === this.selectedCustomerId
      );
    }
    this.recalculateTotals();
  }

  // =====================================================
  //  SUMMARY CARD TOTALS
  // =====================================================
  private recalculateTotals(): void {
    const src = this.filteredRows || [];

    this.totalOutstandingAll = src
      .reduce((sum, r) => sum + (r.totalOutstanding || 0), 0);

    this.total0_30 = src
      .reduce((sum, r) => sum + (r.bucket0_30 || 0), 0);

    this.total31_60 = src
      .reduce((sum, r) => sum + (r.bucket31_60 || 0), 0);

    const total61_90 = src
      .reduce((sum, r) => sum + (r.bucket61_90 || 0), 0);

    const total90Plus = src
      .reduce((sum, r) => sum + (r.bucket90Plus || 0), 0);

    this.total61_90_90Plus = total61_90 + total90Plus;
  }

  // =====================================================
  //  DETAIL PANEL
  // =====================================================
  openDetail(row: ArAgingSummary): void {
    this.selectedCustomerName = row.customerName;
    this.isDetailOpen = true;

    this.agingService.getCustomerInvoices(
      row.customerId,
      this.fromDate,
      this.toDate
    )
      .subscribe((res: ArAgingInvoice[] | ResponseResult<ArAgingInvoice[]>) => {
        const rows: ArAgingInvoice[] = Array.isArray(res)
          ? res
          : (res.data || []);
        this.detailRows = rows;

        setTimeout(() => feather.replace(), 0);
      });
  }

  closeDetail(): void {
    this.isDetailOpen = false;
    this.detailRows = [];
  }

  // =====================================================
  //  EMAIL FROM AGING DETAIL
  // =====================================================
  openEmailModal(row: ArAgingInvoice): void {
    // This object goes into <app-invoice-email [invoice]="...">
    // InvoiceEmailComponent will call getInvoiceInfo() and pick up email.
    this.selectedInvoiceForEmail = {
      id: row.invoiceId,          // AR invoice Id
      docType: 'SI',              // 'SI' = Sales Invoice
      invoiceNo: row.invoiceNo,
      partyName: row.customerName
      // email is fetched in InvoiceEmailComponent via getInvoiceInfo()
    };

    this.showEmailModal = true;
  }

  closeEmailModal(): void {
    this.showEmailModal = false;
    this.selectedInvoiceForEmail = null;
  }

  onEmailModalBackdropClick(event: MouseEvent): void {
    // click on grey area outside dialog
    this.closeEmailModal();
  }
  // build plain objects for export from current filteredRows
  private buildExportRows() {
    return (this.filteredRows || []).map((r, index) => ({
      'Sl.No': index + 1,
      Customer: r.customerName,
      '0-30': r.bucket0_30 || 0,
      '31-60': r.bucket31_60 || 0,
      '61-90': r.bucket61_90 || 0,
      '90+': r.bucket90Plus || 0,
      'Total Outstanding': r.totalOutstanding || 0
    }));
  }

  exportToExcel(): void {
    const data = this.buildExportRows();
    if (!data.length) {
      return;
    }

    const ws: XLSX.WorkSheet = XLSX.utils.json_to_sheet(data);
    const wb: XLSX.WorkBook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'AR Aging');

    const fileName = `AR-Aging-${this.fromDate}-to-${this.toDate}.xlsx`;
    XLSX.writeFile(wb, fileName);
  }

  exportToPdf(): void {
    const rows = this.filteredRows || [];
    if (!rows.length) {
      return;
    }

    const doc = new jsPDF('l', 'pt', 'a4'); // landscape

    // ===== Centered title =====
    const pageWidth = doc.internal.pageSize.getWidth();
    const title = `AR Aging (${this.fromDate} to ${this.toDate})`;
    doc.setFontSize(12);
    doc.text(title, pageWidth / 2, 30, { align: 'center' });

    // ===== Table header (add Sl. No) =====
    const head = [[
      'Sl. No',
      'Customer',
      '0-30',
      '31-60',
      '61-90',
      '90+',
      'Total Outstanding'
    ]];

    // ===== Table body =====
    const body = rows.map((r, index) => [
      (index + 1).toString(),                                // Sl. No
      r.customerName,                                        // Customer
      (r.bucket0_30 || 0).toFixed(2),                      // 0-30
      (r.bucket31_60 || 0).toFixed(2),                      // 31-60
      (r.bucket61_90 || 0).toFixed(2),                      // 61-90
      (r.bucket90Plus || 0).toFixed(2),                      // 90+
      (r.totalOutstanding || 0).toFixed(2)                   // Total
    ]);

    autoTable(doc, {
      head,
      body,
      startY: 45,
      margin: { left: 40, right: 40 }, // keep table nicely centered
      styles: {
        fontSize: 9,
        halign: 'right',               // default: numbers right aligned
        valign: 'middle'
      },
      columnStyles: {
        0: { halign: 'center' },       // Sl. No center
        1: { halign: 'left' },
        2: { halign: 'left' },
        3: { halign: 'left' },
        4: { halign: 'left' },
        5: { halign: 'left' },
        6: { halign: 'left' },
        7: { halign: 'left' }         
        // others use default halign: 'right'
      },
      headStyles: {
        halign: 'left'
      }
    });

    const fileName = `AR-Aging-${this.fromDate}-to-${this.toDate}.pdf`;
    doc.save(fileName);
  }


}
