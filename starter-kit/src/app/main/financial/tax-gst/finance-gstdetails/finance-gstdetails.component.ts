import { Component, OnInit } from '@angular/core';
import { GstReturnsService, GstDetailRow } from '../finance-gstreturns/gst-returns.service';
import { FunctionPermission, PermissionService } from 'app/shared/permission.service';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

@Component({
  selector: 'app-finance-gstdetails',
  templateUrl: './finance-gstdetails.component.html',
  styleUrls: ['./finance-gstdetails.component.scss']
})
export class FinanceGstdetailsComponent implements OnInit {
  isLoading = false;

  startDate!: string;
  endDate!: string;
  docType: 'SI' | 'PIN' | 'ALL' = 'ALL';
  searchText = '';

  rows: GstDetailRow[] = [];

  page = 1;
  pageSize = 10;
  pageSizeOptions = [10, 25, 50];

  userId: number = 0;
  functionId = 'tax';

  permission: FunctionPermission;
  isPermissionLoaded = false;
  isPageLoading = false;

  constructor(
    private gstService: GstReturnsService,
    private permissionService: PermissionService
  ) {
    this.userId = Number(localStorage.getItem('id') || 0);
    this.permission = this.permissionService.getEmptyPermission(this.functionId);
  }

  ngOnInit(): void {
    this.setDefaultDates();
    this.loadPermission();
  }

  loadPermission(): void {
    if (!this.userId || this.userId <= 0) {
      this.permission = this.permissionService.getEmptyPermission(this.functionId);
      this.isPermissionLoaded = true;
      return;
    }

    this.isPageLoading = true;

    this.permissionService.getFunctionPermission(this.userId, this.functionId).subscribe({
      next: (res: FunctionPermission) => {
        this.permission = res || this.permissionService.getEmptyPermission(this.functionId);
        this.isPermissionLoaded = true;
        this.isPageLoading = false;

        if (this.canView()) {
          this.loadDetails();
        } else {
          this.rows = [];
        }
      },
      error: () => {
        this.permission = this.permissionService.getEmptyPermission(this.functionId);
        this.isPermissionLoaded = true;
        this.isPageLoading = false;
      }
    });
  }

  canView(): boolean {
    return this.permissionService.hasView(this.permission);
  }

  canExport(): boolean {
    return this.permissionService.hasExport(this.permission);
  }

  setDefaultDates(): void {
    const today = new Date();
    const from = new Date();
    from.setMonth(from.getMonth() - 3);

    this.startDate = from.toISOString().substring(0, 10);
    this.endDate = today.toISOString().substring(0, 10);
  }

  loadDetails(): void {
    if (!this.startDate || !this.endDate || !this.canView()) {
      return;
    }

    this.isLoading = true;

    this.gstService.getGstDetails(
      this.startDate,
      this.endDate,
      this.docType,
      this.searchText?.trim() || ''
    ).subscribe({
      next: (data) => {
        this.rows = data || [];
        this.page = 1;
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
    this.setDefaultDates();
    this.docType = 'ALL';
    this.searchText = '';
    this.loadDetails();
  }

  get totalRows(): number {
    return this.rows?.length || 0;
  }

  get totalPages(): number {
    return this.totalRows === 0 ? 1 : Math.ceil(this.totalRows / this.pageSize);
  }

  get pagedRows(): GstDetailRow[] {
    const start = (this.page - 1) * this.pageSize;
    return this.rows.slice(start, start + this.pageSize);
  }

  get displayFrom(): number {
    if (this.totalRows === 0) return 0;
    return (this.page - 1) * this.pageSize + 1;
  }

  get displayTo(): number {
    if (this.totalRows === 0) return 0;
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

  goToPage(p: number, event?: Event): void {
    if (event) event.preventDefault();
    if (p < 1 || p > this.totalPages) return;
    this.page = p;
  }

  nextPage(event?: Event): void {
    if (event) event.preventDefault();
    if (this.page < this.totalPages) this.page++;
  }

  prevPage(event?: Event): void {
    if (event) event.preventDefault();
    if (this.page > 1) this.page--;
  }

  exportToExcel(): void {
    if (!this.canExport() || !this.rows?.length) return;

    const exportData = this.rows.map(r => ({
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
    XLSX.writeFile(workbook, 'GstDetails.xlsx');
  }

  exportToPdf(): void {
    if (!this.canExport() || !this.rows?.length) return;

    const doc = new jsPDF('l', 'pt', 'a4');

    const body = this.rows.map(r => [
      r.docType === 'SI' ? 'Sales' : 'Supplier',
      r.source,
      r.docDate.substring(0, 10),
      r.docNo,
      r.partyName,
      r.taxableAmount.toFixed(2),
      r.taxAmount.toFixed(2),
      r.netAmount.toFixed(2)
    ]);

    doc.text('GST Detail Listing', 40, 25);

    autoTable(doc, {
      head: [[
        'Type',
        'Source',
        'Date',
        'Doc No',
        'Customer / Supplier',
        'Taxable',
        'Tax',
        'Net'
      ]],
      body,
      startY: 40,
      styles: { fontSize: 8 }
    });

    doc.save('GstDetails.pdf');
  }

  get totalTaxable(): number {
    return this.rows.reduce((sum, r) => sum + (r.taxableAmount || 0), 0);
  }

  get totalTax(): number {
    return this.rows.reduce((sum, r) => sum + (r.taxAmount || 0), 0);
  }

  get totalNet(): number {
    return this.rows.reduce((sum, r) => sum + (r.netAmount || 0), 0);
  }
}