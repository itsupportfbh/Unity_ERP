import { Component, OnInit } from '@angular/core';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import {
  GstDetailRow,
  GstReturnsService
} from '../../tax-gst/finance-gstreturns/gst-returns.service';

@Component({
  selector: 'app-gst-report',
  templateUrl: './gst-report.component.html',
  styleUrls: ['./gst-report.component.scss']
})
export class GstReportComponent implements OnInit {
  isLoading = false;

  // Filters
  startDate!: string;
  endDate!: string;
  docType: 'SI' | 'PIN' | 'ALL' = 'ALL';
  searchText = '';

  // Data
  rows: GstDetailRow[] = [];

  // Pagination
  page = 1;
  pageSize = 10;
  pageSizeOptions = [10, 25, 50];

  // Export modal
  showExportModal = false;
  exportFileName = '';

  constructor(private gstService: GstReturnsService) {}

  ngOnInit(): void {
    // default: last 3 months
    const today = new Date();
    const from = new Date();
    from.setMonth(from.getMonth() - 3);

    this.startDate = from.toISOString().substring(0, 10);
    this.endDate = today.toISOString().substring(0, 10);

    this.loadDetails();
  }

  /* ------------ EXPORT MODAL HANDLERS ----------- */

  openExportModal(): void {
    if (!this.rows?.length) {
      return;
    }
    this.exportFileName = this.generateDefaultFilename();
    this.showExportModal = true;
  }

  closeExportModal(): void {
    this.showExportModal = false;
  }

  private generateDefaultFilename(): string {
    const now = new Date();
    const pad = (n: number) => n.toString().padStart(2, '0');

    const stamp =
      now.getFullYear().toString() +
      pad(now.getMonth() + 1) +
      pad(now.getDate()) +
      pad(now.getHours()) +
      pad(now.getMinutes()) +
      pad(now.getSeconds());

    return `gst-details-${stamp}`;
  }

  confirmExport(format: 'excel' | 'pdf'): void {
    if (!this.rows?.length) {
      return;
    }

    const baseName =
      (this.exportFileName || this.generateDefaultFilename()).trim();

    if (format === 'excel') {
      this.exportToExcel(`${baseName}.xlsx`);
    } else {
      this.exportToPdf(`${baseName}.pdf`);
    }

    this.closeExportModal();
  }

  /* ----------------- Load data ----------------- */

  loadDetails(): void {
    if (!this.startDate || !this.endDate) {
      return;
    }

    this.isLoading = true;

    this.gstService
      .getGstDetails(
        this.startDate,
        this.endDate,
        this.docType,
        this.searchText?.trim() || ''
      )
      .subscribe({
        next: (data) => {
          this.rows = data || [];
          this.page = 1; // reset to first page whenever we reload
          this.isLoading = false;
        },
        error: (err) => {
          console.error('Error loading GST details', err);
          this.rows = [];
          this.page = 1;
          this.isLoading = false;
        }
      });
  }

  resetFilters(): void {
    const today = new Date();
    const from = new Date();
    from.setMonth(from.getMonth() - 3);

    this.startDate = from.toISOString().substring(0, 10);
    this.endDate = today.toISOString().substring(0, 10);
    this.docType = 'ALL';
    this.searchText = '';

    this.loadDetails();
  }

  /* ----------------- Pagination helpers ----------------- */

  get totalRows(): number {
    return this.rows?.length || 0;
  }

  get totalPages(): number {
    return this.totalRows === 0
      ? 1
      : Math.ceil(this.totalRows / this.pageSize);
  }

  get pagedRows(): GstDetailRow[] {
    const start = (this.page - 1) * this.pageSize;
    return this.rows.slice(start, start + this.pageSize);
  }

  get displayFrom(): number {
    if (this.totalRows === 0) {
      return 0;
    }
    return (this.page - 1) * this.pageSize + 1;
  }

  get displayTo(): number {
    if (this.totalRows === 0) {
      return 0;
    }
    const end = this.page * this.pageSize;
    return end > this.totalRows ? this.totalRows : end;
  }

  get pages(): number[] {
    return Array.from({ length: this.totalPages }, (_, i) => i + 1);
  }

  onPageSizeChange(size: number): void {
    this.pageSize = size;
    this.page = 1;
  }

  goToPage(p: number): void {
    if (p < 1 || p > this.totalPages) {
      return;
    }
    this.page = p;
  }

  nextPage(): void {
    if (this.page < this.totalPages) {
      this.page++;
    }
  }

  prevPage(): void {
    if (this.page > 1) {
      this.page--;
    }
  }

  /* ----------------- Export: Excel ----------------- */

  exportToExcel(fileName?: string): void {
    if (!this.rows?.length) {
      return;
    }

    const exportData = this.rows.map((r) => ({
      Type: r.docType === 'SI' ? 'Sales Invoice' : 'Supplier Invoice',
      Source: r.source,
      Date: r.docDate.substring(0, 10),
      'Doc No': r.docNo,
      'Customer / Supplier': r.partyName,
      'Taxable Amount': r.taxableAmount,
      'Tax Amount': r.taxAmount,
      'Net Amount': r.netAmount
    }));

    const worksheet = XLSX.utils.json_to_sheet(exportData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'GST Details');

    const name = fileName || 'GstDetails.xlsx';
    XLSX.writeFile(workbook, name);
  }

  /* ----------------- Export: PDF ----------------- */

  exportToPdf(fileName?: string): void {
    if (!this.rows?.length) {
      return;
    }

    const doc = new jsPDF('l', 'pt', 'a4');

    const body = this.rows.map((r) => [
      r.docType === 'SI' ? 'Sales' : 'Supplier',
      r.source,
      r.docDate.substring(0, 10),
      r.docNo,
      r.partyName,
      r.taxableAmount.toFixed(2),
      r.taxAmount.toFixed(2),
      r.netAmount.toFixed(2)
    ]);

    autoTable(doc, {
      head: [
        [
          'Type',
          'Source',
          'Date',
          'Doc No',
          'Customer / Supplier',
          'Taxable',
          'Tax',
          'Net'
        ]
      ],
      body,
      startY: 40,
      styles: { fontSize: 8 }
    });

    doc.text('GST Detail Listing', 40, 25);

    const name = fileName || 'GstDetails.pdf';
    doc.save(name);
  }

  /* ----------------- Totals ----------------- */

  get totalTaxable(): number {
    return this.rows.reduce(
      (sum, r) => sum + (r.taxableAmount || 0),
      0
    );
  }

  get totalTax(): number {
    return this.rows.reduce((sum, r) => sum + (r.taxAmount || 0), 0);
  }

  get totalNet(): number {
    return this.rows.reduce((sum, r) => sum + (r.netAmount || 0), 0);
  }
}
