// src/app/main/financial/reports/ap-aging/ap-aging.component.ts

import {
  Component,
  OnInit,
  AfterViewInit,
  ViewEncapsulation
} from '@angular/core';
import { ApAgingInvoice, ApAgingSummary } from './ap-aging-model';
import { ApAgingService } from './ap-aging-service';
import { SupplierService } from 'app/main/businessPartners/supplier/supplier.service';
import * as feather from 'feather-icons';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';


@Component({
  selector: 'app-ap-aging',
  templateUrl: './ap-aging.component.html',
  styleUrls: ['./ap-aging.component.scss'],
  encapsulation: ViewEncapsulation.None
})
export class APAgingComponent implements OnInit, AfterViewInit {

  fromDate: string;
  toDate: string;

  rows: ApAgingSummary[] = [];
  filteredRows: ApAgingSummary[] = [];
  detailRows: ApAgingInvoice[] = [];

  supplierOptions: Array<{ supplierId: number; name: string }> = [];
  selectedSupplierId: number | null = null;

  isLoading = false;
  isDetailOpen = false;
  selectedSupplierName = '';

  // Summary card totals
  totalOutstandingAll = 0;
  total0_30 = 0;
  total31_60 = 0;
  total61_90_90Plus = 0;

  // Email modal
  showEmailModal = false;
  selectedInvoiceForEmail: any = null; // payload passed to <app-invoice-email>

  constructor(
    private agingService: ApAgingService,
    private _supplierMasterService: SupplierService
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
    this.loadSuppliers();
  }

  ngAfterViewInit(): void {
    feather.replace();
  }

  // =====================================================
  //  LOAD DATA
  // =====================================================

  // Load AP aging summary
  loadSummary(): void {
    this.isLoading = true;

    this.agingService.getSummary(this.fromDate, this.toDate).subscribe({
      next: res => {
        this.rows = res?.data || res || [];
        this.isLoading = false;

        this.applySupplierFilter();
      },
      error: _ => {
        this.isLoading = false;
        this.rows = [];
        this.filteredRows = [];
        this.recalculateTotals();
      }
    });
  }

  // Load suppliers for dropdown
  loadSuppliers(): void {
    this._supplierMasterService.GetAllSupplier().subscribe({
      next: (res: any) => {
        const data = res?.data || res || [];
        this.supplierOptions = data.map((x: any) => ({
          supplierId: x.supplierId ?? x.SupplierId ?? x.id ?? x.Id,
          name: x.name ?? x.supplierName ?? x.SupplierName ?? x.Name
        }));
      },
      error: _ => {
        this.supplierOptions = [];
      }
    });
  }

  // When From / To date change or Refresh clicked
  onFilterChange(): void {
    this.loadSummary();
    if (this.isDetailOpen) {
      this.isDetailOpen = false;
      this.detailRows = [];
    }
  }

  // When supplier dropdown changes
  onSupplierChange(): void {
    this.applySupplierFilter();
    this.isDetailOpen = false;
    this.detailRows = [];
  }

  // Apply supplier filter + recompute totals
  private applySupplierFilter(): void {
    if (this.selectedSupplierId == null) {
      this.filteredRows = this.rows;
    } else {
      this.filteredRows = this.rows.filter(
        r => r.supplierId === this.selectedSupplierId
      );
    }

    this.recalculateTotals();
  }

  // =====================================================
  //  SUMMARY CARD TOTALS
  // =====================================================
  private recalculateTotals(): void {
    const src = this.filteredRows || [];

    this.totalOutstandingAll = src.reduce(
      (sum, r) => sum + (r.totalOutstanding || 0),
      0
    );

    this.total0_30 = src.reduce(
      (sum, r) => sum + (r.bucket0_30 || 0),
      0
    );

    this.total31_60 = src.reduce(
      (sum, r) => sum + (r.bucket31_60 || 0),
      0
    );

    const total61_90 = src.reduce(
      (sum, r) => sum + (r.bucket61_90 || 0),
      0
    );

    const total90Plus = src.reduce(
      (sum, r) => sum + (r.bucket90Plus || 0),
      0
    );

    this.total61_90_90Plus = total61_90 + total90Plus;
  }

  // =====================================================
  //  DETAIL POPUP SECTION
  // =====================================================

  openDetail(row: ApAgingSummary): void {
    this.selectedSupplierName = row.supplierName;
    this.isDetailOpen = true;

    this.agingService
      .getSupplierInvoices(row.supplierId, this.fromDate, this.toDate)
      .subscribe({
        next: res => {
          this.detailRows = res?.data || res || [];
        },
        error: _ => {
          this.detailRows = [];
        }
      });
  }

  closeDetail(): void {
    this.isDetailOpen = false;
    this.detailRows = [];
  }

  // =====================================================
  //  EMAIL MODAL
  // =====================================================
  openEmailModal(row: ApAgingInvoice): void {
    // Payload for <app-invoice-email>
    this.selectedInvoiceForEmail = {
      id: row.invoiceId,
      invoiceId: row.invoiceId,
      docType: 'PIN',                    // Supplier Invoice
      invoiceNo: row.invoiceNo,
      partyName: row.supplierName,
      supplierName: row.supplierName,
      email: row.supplierEmail || ''
    };

    this.showEmailModal = true;
  }

  closeEmailModal(): void {
    this.showEmailModal = false;
    this.selectedInvoiceForEmail = null;
  }

  onEmailModalBackdropClick(event: MouseEvent): void {
    this.closeEmailModal();
  }
    // -------- EXPORT HELPERS --------

  private buildExportRows() {
    return (this.filteredRows || []).map((r, index) => ({
      'Sl. No': index + 1,
      Supplier: r.supplierName,
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
    XLSX.utils.book_append_sheet(wb, ws, 'AP Aging');

    const fileName = `AP-Aging-${this.fromDate}-to-${this.toDate}.xlsx`;
    XLSX.writeFile(wb, fileName);
  }

  exportToPdf(): void {
    const rows = this.filteredRows || [];
    if (!rows.length) {
      return;
    }

    const doc = new jsPDF('l', 'pt', 'a4'); // landscape

    // Title centered
    const pageWidth = doc.internal.pageSize.getWidth();
    const title = `AP Aging (${this.fromDate} to ${this.toDate})`;
    doc.setFontSize(12);
    doc.text(title, pageWidth / 2, 30, { align: 'center' });

    // Header (same pattern as AR)
    const head = [[
      'Sl. No',
      'Supplier',
      '0-30',
      '31-60',
      '61-90',
      '90+',
      'Total Outstanding'
    ]];

    // Body
    const body = rows.map((r, index) => [
      (index + 1).toString(),                        // Sl. No
      r.supplierName,                                // Supplier
      (r.bucket0_30   || 0).toFixed(2),              // 0-30
      (r.bucket31_60  || 0).toFixed(2),              // 31-60
      (r.bucket61_90  || 0).toFixed(2),              // 61-90
      (r.bucket90Plus || 0).toFixed(2),              // 90+
      (r.totalOutstanding || 0).toFixed(2)           // Total
    ]);

    autoTable(doc, {
      head,
      body,
      startY: 45,
      margin: { left: 40, right: 40 },
      styles: {
        fontSize: 9,
        halign: 'right',          // numbers right aligned
        valign: 'middle'
      },
      columnStyles: {
        0: { halign: 'center' },  // Sl. No center
        1: { halign: 'left' },   // Supplier left
        2: { halign: 'left' },
        3: { halign: 'left' },
        4: { halign: 'left' },
        5: { halign: 'left' },
        6: { halign: 'left' },
        7: { halign: 'left' }  
        // others keep default halign: 'right'
      },
      headStyles: {
        halign: 'left'
      }
    });

    const fileName = `AP-Aging-${this.fromDate}-to-${this.toDate}.pdf`;
    doc.save(fileName);
  }

}
